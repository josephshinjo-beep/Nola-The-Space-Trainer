import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { EquipmentId } from '../game/stationMap';

/**
 * A model for each station machine, built from simple blocks so it reads at
 * a glance: the Command Console is an arcade cabinet, the Oxygen Generator
 * has twin tanks, the Grow Bed has plants under a purple light, and so on.
 * All art is original.
 *
 * Each model faces +z (its front, where the astronaut stands) and sits on
 * the floor at the origin of its tile. To keep draw calls low, the still
 * parts are merged into two meshes per machine: one lit (vertex colours)
 * and one glowing (vertex colours, unlit). Moving parts stay separate.
 */

export interface MachineModel {
  group: THREE.Group;
  /** Called every frame. */
  animate: (time: number, state: { running: boolean; storm: boolean; still: boolean }) => void;
  /** Sets the fade (1 = solid, 0.25 = see-through) when the model hides the astronaut. */
  setOpacity: (opacity: number) => void;
  /** Only the Grow Bed uses this: the plants follow the crop. */
  setCrop?: (stage: 'empty' | 'growing' | 'ready') => void;
  dispose: () => void;
}

interface Part {
  geometry: THREE.BufferGeometry;
  glow: boolean;
}

/** Collects parts, then merges them into one lit mesh and one glowing mesh. */
class Builder {
  parts: Part[] = [];
  materials: THREE.Material[] = [];
  geometries: THREE.BufferGeometry[] = [];
  textures: THREE.Texture[] = [];
  readonly group = new THREE.Group();

  private add(geometry: THREE.BufferGeometry, color: number, at: [number, number, number], rotate: [number, number, number] = [0, 0, 0], glow = false): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.rotateX(rotate[0]).rotateY(rotate[1]).rotateZ(rotate[2]).translate(...at);
    const c = new THREE.Color(color);
    const colors = new Float32Array(g.attributes.position!.count * 3);
    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = c.r;
      colors[i + 1] = c.g;
      colors[i + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
    this.parts.push({ geometry: g, glow });
  }

  box(size: [number, number, number], at: [number, number, number], color: number, rotate?: [number, number, number], glow = false) {
    this.add(new THREE.BoxGeometry(...size), color, at, rotate, glow);
  }
  cylinder(radiusTop: number, radiusBottom: number, height: number, at: [number, number, number], color: number, rotate?: [number, number, number], glow = false, segments = 18) {
    this.add(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), color, at, rotate, glow);
  }
  sphere(radius: number, at: [number, number, number], color: number, glow = false) {
    this.add(new THREE.SphereGeometry(radius, 14, 10), color, at, undefined, glow);
  }
  torus(radius: number, tube: number, at: [number, number, number], color: number, rotate?: [number, number, number]) {
    this.add(new THREE.TorusGeometry(radius, tube, 8, 20), color, at, rotate);
  }

  /** A separate mesh, for moving parts or textured screens. */
  mesh(geometry: THREE.BufferGeometry, material: THREE.Material, at: [number, number, number], rotate: [number, number, number] = [0, 0, 0]): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.rotation.set(...rotate);
    mesh.castShadow = true;
    this.geometries.push(geometry);
    this.materials.push(material);
    this.group.add(mesh);
    return mesh;
  }

  lit(color: number, emissive = 0x000000): THREE.MeshLambertMaterial {
    const material = new THREE.MeshLambertMaterial({ color, emissive, transparent: true });
    this.materials.push(material);
    return material;
  }

  glowing(color: number): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial({ color, transparent: true });
    this.materials.push(material);
    return material;
  }

  /** A screen or sign drawn on a small canvas. */
  screen(width: number, height: number, draw: (context: CanvasRenderingContext2D, w: number, h: number) => void): THREE.MeshBasicMaterial {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * 256);
    canvas.height = Math.round(height * 256);
    draw(canvas.getContext('2d')!, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    this.materials.push(material);
    return material;
  }

  finish(rest: Omit<MachineModel, 'group' | 'setOpacity' | 'dispose'>): MachineModel {
    for (const glow of [false, true]) {
      const parts = this.parts.filter((part) => part.glow === glow).map((part) => part.geometry);
      if (parts.length === 0) continue;
      const merged = mergeGeometries(parts)!;
      parts.forEach((geometry) => geometry.dispose());
      const material = glow ? new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }) : new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true });
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = !glow;
      mesh.receiveShadow = !glow;
      this.geometries.push(merged);
      this.materials.push(material);
      this.group.add(mesh);
    }
    const materials = this.materials;
    return {
      group: this.group,
      ...rest,
      setOpacity: (opacity) => {
        for (const material of materials) {
          const base = (material.userData.baseOpacity as number | undefined) ?? 1;
          material.opacity = base * opacity;
          material.depthWrite = opacity > 0.9;
        }
      },
      dispose: () => {
        this.geometries.forEach((geometry) => geometry.dispose());
        this.materials.forEach((material) => material.dispose());
        this.textures.forEach((texture) => texture.dispose());
      },
    };
  }
}

const CASE = 0x4b587d;
const CASE_DARK = 0x2c3555;
const TRIM = 0x8fa0cc;
const CYAN = 0x3de0f5;

/** Rounded rectangle for canvas screens. */
function panel(context: CanvasRenderingContext2D, w: number, h: number, background: string) {
  context.fillStyle = background;
  context.fillRect(0, 0, w, h);
}

const builders: Record<EquipmentId, (b: Builder) => MachineModel> = {
  /** The Command Console: an arcade cabinet. */
  console: (b) => {
    b.box([0.78, 1.28, 0.62], [0, 0.64, -0.06], 0x2a3b74); // cabinet
    b.box([0.82, 0.08, 0.66], [0, 1.32, -0.06], 0x1b2550); // top cap
    b.box([0.06, 1.3, 0.64], [-0.42, 0.65, -0.06], 0xff7a1a); // side art stripes
    b.box([0.06, 1.3, 0.64], [0.42, 0.65, -0.06], 0xff7a1a);
    b.box([0.74, 0.12, 0.34], [0, 0.82, 0.3], 0x1b2550, [-0.25, 0, 0]); // control deck
    b.cylinder(0.025, 0.025, 0.12, [-0.18, 0.92, 0.33], 0x111111); // joystick
    b.sphere(0.055, [-0.18, 0.99, 0.33], 0xff4d5e, true);
    for (const [x, color] of [[0.02, 0xffd23f], [0.12, 0x3de0f5], [0.22, 0x5be3a0]] as const) b.cylinder(0.035, 0.035, 0.04, [x, 0.9, 0.33], color, [-0.25, 0, 0], true);
    b.box([0.6, 0.06, 0.04], [0, 0.22, 0.26], CYAN, undefined, true); // kick-plate light
    const screen = b.mesh(new THREE.PlaneGeometry(0.62, 0.42), b.screen(0.62, 0.42, (c, w, h) => {
      panel(c, w, h, '#06152f');
      c.strokeStyle = '#3de0f5';
      c.lineWidth = 6;
      c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#3de0f5';
      c.font = `bold ${Math.round(h / 5)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('SOL PLAN', w / 2, h * 0.36);
      c.fillStyle = '#ffb070';
      for (let i = 0; i < 3; i++) c.fillRect(w * (0.14 + i * 0.26), h * 0.52, w * 0.2, h * 0.3);
    }), [0, 1.06, 0.255], [-0.28, 0, 0]);
    const marquee = b.mesh(new THREE.PlaneGeometry(0.72, 0.16), b.screen(0.72, 0.16, (c, w, h) => {
      const gradient = c.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#ff7a1a');
      gradient.addColorStop(1, '#ffd23f');
      c.fillStyle = gradient;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#070b1f';
      c.font = `bold ${Math.round(h * 0.62)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('COMMAND', w / 2, h * 0.74);
    }), [0, 1.24, 0.26]);
    return b.finish({
      animate: (time, { still }) => {
        const flicker = still ? 1 : 0.88 + Math.sin(time * 9) * 0.06 + Math.sin(time * 23) * 0.04;
        (screen.material as THREE.MeshBasicMaterial).color.setScalar(flicker);
        (marquee.material as THREE.MeshBasicMaterial).color.setScalar(still ? 1 : 0.9 + Math.sin(time * 3) * 0.1);
      },
    });
  },

  /** Oxygen Generator: twin tanks (electrolysis splits water into oxygen and hydrogen). */
  generator: (b) => {
    b.box([0.84, 0.16, 0.6], [0, 0.08, 0], CASE_DARK);
    b.cylinder(0.17, 0.17, 0.95, [-0.2, 0.62, -0.04], 0xe8eefb);
    b.cylinder(0.17, 0.17, 0.95, [0.2, 0.62, -0.04], 0xe8eefb);
    b.sphere(0.17, [-0.2, 1.1, -0.04], 0xe8eefb);
    b.sphere(0.17, [0.2, 1.1, -0.04], 0xe8eefb);
    b.cylinder(0.035, 0.035, 0.4, [0, 0.95, -0.04], TRIM, [0, 0, Math.PI / 2]);
    b.box([0.36, 0.2, 0.08], [0, 0.42, 0.2], CASE);
    const band = b.mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20, 1, true), b.glowing(0x5ab8ff), [-0.2, 0.7, -0.04]);
    const band2 = b.mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 20, 1, true), b.glowing(0x5ab8ff), [0.2, 0.7, -0.04]);
    b.mesh(new THREE.PlaneGeometry(0.3, 0.16), b.screen(0.3, 0.16, (c, w, h) => {
      panel(c, w, h, '#06152f');
      c.fillStyle = '#7fd4ff';
      c.font = `bold ${Math.round(h * 0.7)}px sans-serif`;
      c.textAlign = 'center';
      c.fillText('O₂', w / 2, h * 0.76);
    }), [0, 0.42, 0.241]);
    const bubbles = [0, 1, 2].map((i) => b.mesh(new THREE.SphereGeometry(0.03, 8, 6), b.glowing(0xbfe8ff), [i === 1 ? 0.2 : -0.2, 0.3, 0.13]));
    return b.finish({
      animate: (time, { running, still }) => {
        const glow = running ? 0.75 + (still ? 0 : Math.sin(time * 4) * 0.25) : 0.25;
        for (const ring of [band, band2]) (ring.material as THREE.MeshBasicMaterial).color.setRGB(0.3 * glow, 0.7 * glow, 1 * glow);
        bubbles.forEach((bubble, i) => {
          bubble.visible = running && !still;
          bubble.position.y = 0.3 + (((time * 0.5 + i / 3) % 1) * 0.75);
        });
      },
    });
  },

  /** CO₂ Scrubber: a filter cabinet with slats and a fan. */
  scrubber: (b) => {
    b.box([0.78, 1.0, 0.56], [0, 0.5, -0.04], CASE);
    for (let i = 0; i < 6; i++) b.box([0.62, 0.035, 0.04], [0, 0.18 + i * 0.07, 0.25], CASE_DARK);
    b.torus(0.17, 0.03, [0, 0.74, 0.25], TRIM);
    b.box([0.12, 0.05, 0.03], [0.28, 0.93, 0.25], 0x5be3a0, undefined, true);
    const fan = b.mesh(new THREE.BoxGeometry(0.3, 0.05, 0.02), b.lit(0xcfd8f2), [0, 0.74, 0.26]);
    const fan2 = b.mesh(new THREE.BoxGeometry(0.05, 0.3, 0.02), b.lit(0xcfd8f2), [0, 0.74, 0.26]);
    return b.finish({
      animate: (time, { still }) => {
        const angle = still ? 0 : time * 6;
        fan.rotation.z = angle;
        fan2.rotation.z = angle;
      },
    });
  },

  /** Grow Bed: a planter under a purple grow light; the plants follow the crop. */
  growbed: (b) => {
    b.box([0.86, 0.32, 0.6], [0, 0.16, 0], 0x6b4a2f);
    b.box([0.8, 0.04, 0.54], [0, 0.33, 0], 0x3a2a1c);
    for (const x of [-0.39, 0.39]) b.cylinder(0.025, 0.025, 0.95, [x, 0.8, -0.22], TRIM);
    b.box([0.84, 0.06, 0.12], [0, 1.27, -0.22], CASE_DARK);
    const light = b.mesh(new THREE.BoxGeometry(0.76, 0.03, 0.08), b.glowing(0xd36bff), [0, 1.23, -0.22]);
    const plants: THREE.Mesh[] = [];
    const tomatoes: THREE.Mesh[] = [];
    const leaf = b.lit(0x3fbf5f);
    const red = b.glowing(0xff4d3a);
    for (let i = 0; i < 6; i++) {
      const x = -0.27 + (i % 3) * 0.27;
      const z = i < 3 ? -0.12 : 0.12;
      plants.push(b.mesh(new THREE.BoxGeometry(0.12, 1, 0.12), leaf, [x, 0.35, z]));
      tomatoes.push(b.mesh(new THREE.SphereGeometry(0.045, 8, 6), red, [x + 0.05, 0.6, z + 0.05]));
    }
    const setCrop = (stage: 'empty' | 'growing' | 'ready') => {
      plants.forEach((plant) => {
        plant.visible = stage !== 'empty';
        const height = stage === 'ready' ? 0.42 : 0.16;
        plant.scale.y = height;
        plant.position.y = 0.35 + height / 2;
      });
      tomatoes.forEach((tomato) => (tomato.visible = stage === 'ready'));
    };
    setCrop('empty');
    return b.finish({
      setCrop,
      animate: (time, { running, still }) => {
        (light.material as THREE.MeshBasicMaterial).color.setHex(running ? 0xd36bff : 0x4a2a5a);
        if (!still) plants.forEach((plant, i) => (plant.rotation.z = Math.sin(time * 1.5 + i) * 0.05));
      },
    });
  },

  /** Solar Control: a podium with a small tilted solar panel. */
  solar: (b) => {
    b.box([0.56, 0.8, 0.46], [0, 0.4, -0.04], CASE);
    b.box([0.6, 0.06, 0.5], [0, 0.83, -0.04], CASE_DARK);
    b.cylinder(0.03, 0.03, 0.3, [0, 0.98, -0.04], TRIM);
    b.box([0.12, 0.12, 0.03], [0, 0.6, 0.2], 0xffd23f, undefined, true);
    const panelMesh = b.mesh(new THREE.PlaneGeometry(0.72, 0.46), b.screen(0.72, 0.46, (c, w, h) => {
      panel(c, w, h, '#16306e');
      c.strokeStyle = '#8fb2ff';
      c.lineWidth = 3;
      for (let x = 0; x <= 4; x++) {
        c.beginPath();
        c.moveTo((x * w) / 4, 0);
        c.lineTo((x * w) / 4, h);
        c.stroke();
      }
      for (let y = 0; y <= 3; y++) {
        c.beginPath();
        c.moveTo(0, (y * h) / 3);
        c.lineTo(w, (y * h) / 3);
        c.stroke();
      }
    }), [0, 1.16, -0.04], [-Math.PI / 3, 0, 0]);
    (panelMesh.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
    return b.finish({
      animate: (time, { running, still }) => {
        const shine = running ? 1 : 0.55;
        (panelMesh.material as THREE.MeshBasicMaterial).color.setScalar(still ? shine : shine * (0.92 + Math.sin(time * 1.2) * 0.08));
      },
    });
  },

  /** Battery Bank: three cells with glowing charge bars. */
  battery: (b) => {
    b.box([0.86, 0.1, 0.5], [0, 0.05, 0], CASE_DARK);
    const bars: THREE.Mesh[] = [];
    for (const x of [-0.27, 0, 0.27]) {
      b.box([0.22, 0.86, 0.36], [x, 0.53, 0], 0x394466);
      b.cylinder(0.04, 0.04, 0.06, [x - 0.05, 0.99, 0], 0xff4d5e);
      b.cylinder(0.04, 0.04, 0.06, [x + 0.05, 0.99, 0], 0x222831);
      bars.push(b.mesh(new THREE.BoxGeometry(0.12, 0.6, 0.02), b.glowing(0x5be3a0), [x, 0.5, 0.19]));
    }
    return b.finish({
      animate: (time, { still }) => {
        bars.forEach((bar, i) => {
          const level = still ? 0.85 : 0.7 + Math.sin(time * 0.8 + i * 1.3) * 0.15;
          bar.scale.y = level;
          bar.position.y = 0.2 + (0.6 * level) / 2;
        });
      },
    });
  },

  /** Antenna Console: a desk with a satellite dish and a blinking beacon. */
  antenna: (b) => {
    b.box([0.8, 0.62, 0.5], [0, 0.31, 0.02], CASE);
    b.box([0.84, 0.05, 0.56], [0, 0.64, 0.04], CASE_DARK);
    b.cylinder(0.04, 0.05, 0.8, [0.18, 1.04, -0.12], TRIM);
    b.box([0.3, 0.14, 0.03], [-0.18, 0.47, 0.27], CYAN, undefined, true);
    const dish = new THREE.Group();
    dish.position.set(0.18, 1.42, -0.12);
    b.group.add(dish);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), b.lit(0xe8eefb));
    bowl.rotation.x = Math.PI / 2.2;
    bowl.castShadow = true;
    b.geometries.push(bowl.geometry);
    dish.add(bowl);
    const beacon = b.mesh(new THREE.SphereGeometry(0.045, 8, 6), b.glowing(0xff4d5e), [0.18, 1.48, -0.12]);
    return b.finish({
      animate: (time, { still }) => {
        if (!still) dish.rotation.y = Math.sin(time * 0.4) * 0.7;
        beacon.visible = still || Math.sin(time * 5) > 0;
      },
    });
  },

  /** Water Recycler: a clear tank with moving water and pipes. */
  recycler: (b) => {
    b.box([0.8, 0.14, 0.6], [0, 0.07, 0], CASE_DARK);
    b.cylinder(0.27, 0.27, 0.06, [0, 0.17, -0.04], TRIM);
    b.cylinder(0.27, 0.27, 0.06, [0, 1.11, -0.04], TRIM);
    b.cylinder(0.04, 0.04, 0.5, [0.33, 0.45, 0.1], TRIM);
    b.cylinder(0.04, 0.04, 0.5, [-0.33, 0.45, 0.1], TRIM);
    const glass = b.lit(0xa9d8ff);
    glass.opacity = 0.35;
    glass.userData.baseOpacity = 0.35;
    glass.depthWrite = false;
    b.mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 20, 1, true), glass, [0, 0.65, -0.04]);
    const water = b.mesh(new THREE.CylinderGeometry(0.23, 0.23, 1, 20), b.glowing(0x2f8bff), [0, 0.45, -0.04]);
    return b.finish({
      animate: (time, { running, still }) => {
        const level = 0.55 + (running && !still ? Math.sin(time * 1.6) * 0.06 : 0);
        water.scale.y = level;
        water.position.y = 0.2 + level / 2;
        (water.material as THREE.MeshBasicMaterial).color.setHex(running ? 0x2f8bff : 0x1d4f8f);
      },
    });
  },

  /** Pipe Junction: a wall of pipes with red valve wheels. */
  pipes: (b) => {
    b.box([0.86, 1.0, 0.12], [0, 0.5, -0.24], CASE_DARK);
    for (const y of [0.3, 0.62, 0.9]) b.cylinder(0.055, 0.055, 0.86, [0, y, -0.12], 0x8a9bc8, [0, 0, Math.PI / 2]);
    for (const x of [-0.25, 0.22]) b.cylinder(0.055, 0.055, 0.9, [x, 0.5, -0.06], 0x6f7fae);
    b.torus(0.1, 0.022, [-0.25, 0.62, 0.02], 0xe0433b);
    b.torus(0.1, 0.022, [0.22, 0.3, 0.02], 0xe0433b);
    b.box([0.14, 0.06, 0.03], [0.3, 0.92, 0.0], 0x2f8bff, undefined, true);
    return b.finish({ animate: () => undefined });
  },

  /** Med Station: a white cabinet with a red cross and a heartbeat screen. */
  medstation: (b) => {
    b.box([0.8, 1.1, 0.5], [0, 0.55, -0.06], 0xe9eef8);
    b.box([0.84, 0.06, 0.54], [0, 1.12, -0.06], 0xc5cde0);
    b.box([0.3, 0.09, 0.02], [0, 0.85, 0.2], 0xff4d5e, undefined, true);
    b.box([0.09, 0.3, 0.02], [0, 0.85, 0.2], 0xff4d5e, undefined, true);
    b.box([0.6, 0.06, 0.08], [0, 0.4, 0.2], 0xc5cde0);
    const screen = b.mesh(new THREE.PlaneGeometry(0.5, 0.2), b.screen(0.5, 0.2, (c, w, h) => {
      panel(c, w, h, '#06152f');
      c.strokeStyle = '#5be3a0';
      c.lineWidth = 5;
      c.beginPath();
      const points = [0, 0.6, 0.6, 0.6, 0.62, 0.2, 0.66, 0.95, 0.7, 0.45, 0.74, 0.6, 1, 0.6];
      for (let i = 0; i < points.length; i += 2) {
        const x = points[i]! * w;
        const y = points[i + 1]! * h;
        if (i === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }), [0, 0.6, 0.191]);
    return b.finish({
      animate: (time, { still }) => {
        (screen.material as THREE.MeshBasicMaterial).color.setScalar(still ? 1 : 0.75 + Math.max(0, Math.sin(time * 6)) * 0.25);
      },
    });
  },

  /** Thermal Controller: radiator fins and a cold-to-hot dial. */
  thermostat: (b) => {
    b.box([0.56, 1.0, 0.46], [-0.12, 0.5, -0.04], CASE);
    for (let i = 0; i < 6; i++) b.box([0.03, 0.8, 0.4], [0.2 + i * 0.04, 0.5, -0.04], 0x9aa8cf);
    b.cylinder(0.14, 0.14, 0.04, [-0.12, 0.66, 0.2], 0x1b2550, [Math.PI / 2, 0, 0]);
    b.mesh(new THREE.PlaneGeometry(0.26, 0.26), b.screen(0.26, 0.26, (c, w, h) => {
      const gradient = c.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#3da8ff');
      gradient.addColorStop(1, '#ff5a3a');
      c.fillStyle = gradient;
      c.beginPath();
      c.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#070b1f';
      c.beginPath();
      c.arc(w / 2, h / 2, w / 4, 0, Math.PI * 2);
      c.fill();
    }), [-0.12, 0.66, 0.225]);
    const needle = b.mesh(new THREE.BoxGeometry(0.02, 0.1, 0.01), b.glowing(0xffffff), [-0.12, 0.66, 0.235]);
    b.box([0.2, 0.06, 0.03], [-0.12, 0.32, 0.2], CYAN, undefined, true);
    return b.finish({
      animate: (time, { running, still }) => {
        needle.rotation.z = running ? (still ? 0 : Math.sin(time * 0.6) * 0.3) : 1.1;
      },
    });
  },

  /** Radiation Monitor: a tall post with a radiation symbol and a storm light. */
  monitor: (b) => {
    b.box([0.5, 0.12, 0.5], [0, 0.06, 0], CASE_DARK);
    b.box([0.16, 1.1, 0.16], [0, 0.65, -0.06], CASE);
    b.box([0.56, 0.42, 0.1], [0, 1.0, 0.02], 0x2c3555);
    b.mesh(new THREE.PlaneGeometry(0.46, 0.34), b.screen(0.46, 0.34, (c, w, h) => {
      panel(c, w, h, '#ffd23f');
      c.fillStyle = '#070b1f';
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) * 0.42;
      for (let i = 0; i < 3; i++) {
        const start = -Math.PI / 2 + i * ((Math.PI * 2) / 3) - Math.PI / 6;
        c.beginPath();
        c.moveTo(cx, cy);
        c.arc(cx, cy, r, start, start + Math.PI / 3);
        c.closePath();
        c.fill();
      }
      c.fillStyle = '#ffd23f';
      c.beginPath();
      c.arc(cx, cy, r * 0.28, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#070b1f';
      c.beginPath();
      c.arc(cx, cy, r * 0.18, 0, Math.PI * 2);
      c.fill();
    }), [0, 1.0, 0.071]);
    const light = b.mesh(new THREE.SphereGeometry(0.06, 10, 8), b.glowing(0x5be3a0), [0, 1.3, 0.02]);
    return b.finish({
      animate: (time, { storm, still }) => {
        const flashing = storm && (still || Math.sin(time * 8) > 0);
        (light.material as THREE.MeshBasicMaterial).color.setHex(storm ? (flashing ? 0xff4d5e : 0x5a1a22) : 0x5be3a0);
      },
    });
  },
};

/** Builds the model for one machine. */
export function buildMachine(id: EquipmentId): MachineModel {
  return builders[id](new Builder());
}
