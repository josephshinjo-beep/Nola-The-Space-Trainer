import * as THREE from 'three';
import type { RoomId } from '../simulation/types';
import { buildWalkGrid, COLS, EQUIPMENT, PLAYER_START, ROOMS, roomAtTile, ROWS, TILE } from '../game/stationMap';
import { angleDelta, CAMERA_FOV, cameraOffset, damp, FOLLOW_LAG, LOOK_LEAD, screenToWorld, snapYaw, type YawSnap } from './camera';
import { cameraSide, edgeLips, FADED_OPACITY, wallHeight, wallTiles } from './level';

/**
 * The 3D station view: a fixed high-angle diagonal camera following a blocky
 * astronaut around the same station layout as the 2D game (stationMap.ts).
 * It reads the layout only; it never changes the simulation or the sol engine.
 *
 * All art is original: plain coloured boxes, no textures.
 */

export type Quality = 'low' | 'high';

const SPEED = 3.6; // tiles per second
const RADIUS = 0.28; // astronaut's footprint, in tiles
const TURN_LAG = 0.08; // seconds, for turning toward the move direction
const FLOOR_SHADES = [0x3a4766, 0x34405e, 0x404d6e];
const WALL_SHADES = [0x252f4d, 0x2a3556, 0x222b47];
const WALL_LAG = 0.12; // seconds, for walls rising and lowering when the camera turns
const FADE_LAG = 0.1; // seconds, for blocks fading out of the way

/**
 * A Lambert material whose opacity can be set per instance, through an
 * `instanceOpacity` attribute. Used for blocks that fade when they hide the astronaut.
 */
function fadeableMaterial(color: number, emissive = 0x000000): THREE.MeshLambertMaterial {
  const material = new THREE.MeshLambertMaterial({ color, emissive, transparent: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float instanceOpacity;\nvarying float vInstanceOpacity;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvInstanceOpacity = instanceOpacity;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vInstanceOpacity;')
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.a *= vInstanceOpacity;');
  };
  material.customProgramCacheKey = () => 'nola-fadeable';
  return material;
}

/** One or more instanced meshes whose blocks fade together, by index. */
class FadeGroup {
  readonly opacity: Float32Array;
  private target: Float32Array;
  private attributes: THREE.InstancedBufferAttribute[];

  constructor(readonly meshes: THREE.InstancedMesh[]) {
    const count = meshes[0]!.count;
    this.opacity = new Float32Array(count).fill(1);
    this.target = new Float32Array(count).fill(1);
    this.attributes = meshes.map((mesh) => {
      const attribute = new THREE.InstancedBufferAttribute(this.opacity, 1);
      attribute.setUsage(THREE.DynamicDrawUsage);
      mesh.geometry.setAttribute('instanceOpacity', attribute);
      return attribute;
    });
  }

  /** Fade the given blocks out of the way and bring every other block back. */
  setFaded(ids: ReadonlySet<number>): void {
    for (let i = 0; i < this.target.length; i++) this.target[i] = ids.has(i) ? FADED_OPACITY : 1;
  }

  step(dt: number): void {
    const k = damp(dt, FADE_LAG);
    let changed = false;
    for (let i = 0; i < this.opacity.length; i++) {
      const gap = this.target[i]! - this.opacity[i]!;
      if (Math.abs(gap) < 0.002) continue;
      this.opacity[i] = Math.abs(gap) < 0.01 ? this.target[i]! : this.opacity[i]! + gap * k;
      changed = true;
    }
    if (changed) for (const attribute of this.attributes) attribute.needsUpdate = true;
  }
}

export interface StationOptions {
  lockedRooms: RoomId[];
  quality: Quality;
  /** Called about once a second with the measured frame rate. */
  onFps?: (fps: number) => void;
}

/** A small, fast, repeatable hash, so tile shades are random-looking but stable. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export class Station3D {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 200);
  private player = new THREE.Group();
  private grid: boolean[][];
  private keys = new Set<string>();
  private yaw = 0;
  private snap: YawSnap | null = null;
  private look = new THREE.Vector3();
  private velocity = new THREE.Vector2();
  private heading = 0;
  private clock = new THREE.Clock();
  private disposables: { dispose: () => void }[] = [];
  private resizeObserver: ResizeObserver;
  private frames = 0;
  private fpsTime = 0;
  private walls!: { mesh: THREE.InstancedMesh; tiles: { x: number; y: number; height: number; target: number; shade: number }[]; side: string; moving: boolean };
  private fadeGroups: FadeGroup[] = [];
  private raycaster = new THREE.Raycaster();
  private rayTarget = new THREE.Vector3();

  constructor(
    private container: HTMLElement,
    private options: StationOptions,
  ) {
    this.renderer = this.makeRenderer(options.quality);
    this.grid = buildWalkGrid(new Set(options.lockedRooms));
    this.scene.background = new THREE.Color(0x070b1f);
    this.buildLights();
    this.buildFloor();
    this.buildEdges();
    this.buildWalls();
    this.buildMachines();
    this.buildLockedDoors();
    this.buildAstronaut();

    const start = { x: PLAYER_START.x / TILE, z: PLAYER_START.y / TILE };
    this.player.position.set(start.x, 0, start.z);
    this.look.copy(this.player.position);
    this.placeCamera();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    this.renderer.setAnimationLoop(this.frame);
    // Lets browser tests read the astronaut's position in development builds only.
    if (import.meta.env.DEV) (window as unknown as { __station3d?: Station3D }).__station3d = this;
  }

  /** Where the astronaut is and which way the camera faces (for tests and the HUD). */
  debugState() {
    const { x, z } = this.player.position;
    const { calls, triangles } = this.renderer.info.render;
    let faded = 0;
    for (const group of this.fadeGroups) for (const value of group.opacity) if (value < 0.9) faded += 1;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    return { x, z, yaw: this.yaw, heading: this.heading, camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }, calls, triangles, pixels: `${size.x}x${size.y}`, faded, wallsMoving: this.walls.moving, lowWalls: this.walls.tiles.filter((t) => t.height < 1.5).length, tallWalls: this.walls.tiles.filter((t) => t.height >= 1.5).length };
  }

  // ------------------------------------------------------------ set-up

  private makeRenderer(quality: Quality): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: quality === 'high', powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.5 : 1));
    renderer.domElement.classList.add('station3d-canvas');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', '3D view of your space station from above. Move with W, A, S and D or the arrow keys.');
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  /** Switches between Low and High quality by rebuilding the renderer (the scene is kept). */
  setQuality(quality: Quality): void {
    if (quality === this.options.quality) return;
    this.options.quality = quality;
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.renderer = this.makeRenderer(quality);
    this.resize();
    this.renderer.setAnimationLoop(this.frame);
  }

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private buildLights(): void {
    // Step 1 uses simple lights so the shapes read clearly; step 3 replaces them.
    this.scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x1a2040, 1.6));
    const sun = new THREE.DirectionalLight(0xffe2b8, 1.4);
    sun.position.set(5, 10, 2);
    this.scene.add(sun);
  }

  /** One instanced mesh for every floor tile, with thin dark gaps between tiles. */
  private buildFloor(): void {
    const base = new THREE.Mesh(this.track(new THREE.PlaneGeometry(COLS, ROWS)), this.track(new THREE.MeshLambertMaterial({ color: 0x0b1024 })));
    base.rotation.x = -Math.PI / 2;
    base.position.set(COLS / 2, -0.02, ROWS / 2);
    this.scene.add(base);

    const cells: [number, number][] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (this.isFloor(x, y)) cells.push([x, y]);
    const tile = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(0.94, 0.1, 0.94)), this.track(new THREE.MeshLambertMaterial()), cells.length);
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    cells.forEach(([x, y], index) => {
      matrix.makeTranslation(x + 0.5, -0.05, y + 0.5);
      tile.setMatrixAt(index, matrix);
      tile.setColorAt(index, color.setHex(FLOOR_SHADES[Math.floor(hash(x, y) * FLOOR_SHADES.length)]!));
    });
    tile.instanceMatrix.needsUpdate = true;
    this.scene.add(tile);
  }

  /** Raised block edges along the walkways, where the floor meets a wall. */
  private buildEdges(): void {
    const lips = edgeLips(COLS, ROWS, (x, y) => this.isFloor(x, y));
    const mesh = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(1, 0.1, 0.12)), this.track(new THREE.MeshLambertMaterial({ color: 0x5c6c94 })), lips.length);
    const matrix = new THREE.Matrix4();
    const turn = new THREE.Matrix4().makeRotationY(Math.PI / 2);
    lips.forEach((lip, index) => {
      const along = lip.side === 'n' || lip.side === 's';
      const x = lip.x + (lip.side === 'w' ? 0.06 : lip.side === 'e' ? 0.94 : 0.5);
      const z = lip.y + (lip.side === 'n' ? 0.06 : lip.side === 's' ? 0.94 : 0.5);
      matrix.makeTranslation(x, 0.05, z);
      if (!along) matrix.multiply(turn);
      mesh.setMatrixAt(index, matrix);
    });
    this.scene.add(mesh);
  }

  /**
   * Wall blocks on every empty tile next to the floor. Blocks between the
   * camera and the floor are low (rooms are cut away toward the camera);
   * blocks behind the floor are tall. Heights follow the camera when it turns.
   */
  private buildWalls(): void {
    const isFloor = (x: number, y: number) => this.isFloor(x, y);
    const offset = cameraOffset(this.yaw);
    const { sx, sz } = cameraSide(offset.x, offset.z);
    const tiles = wallTiles(COLS, ROWS, isFloor).map((tile) => {
      const height = wallHeight(tile.x, tile.y, isFloor, sx, sz);
      return { ...tile, height, target: height, shade: Math.floor(hash(tile.x + 101, tile.y + 37) * WALL_SHADES.length) };
    });
    const geometry = this.track(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    const mesh = new THREE.InstancedMesh(geometry, this.track(fadeableMaterial(0xffffff)), tiles.length);
    const color = new THREE.Color();
    tiles.forEach((tile, index) => mesh.setColorAt(index, color.setHex(WALL_SHADES[tile.shade]!)));
    this.walls = { mesh, tiles, side: `${sx},${sz}`, moving: false };
    this.placeWalls();
    this.scene.add(mesh);
    this.fadeGroups.push(new FadeGroup([mesh]));
  }

  private placeWalls(): void {
    const matrix = new THREE.Matrix4();
    const { mesh, tiles } = this.walls;
    tiles.forEach((tile, index) => {
      matrix.makeScale(1, tile.height, 1).setPosition(tile.x + 0.5, 0, tile.y + 0.5);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  /** When the camera has turned to another side, walls rise and lower smoothly to keep the rooms open. */
  private updateWalls(dt: number): void {
    const offset = cameraOffset(this.yaw);
    const { sx, sz } = cameraSide(offset.x, offset.z);
    const side = `${sx},${sz}`;
    if (side !== this.walls.side) {
      this.walls.side = side;
      const isFloor = (x: number, y: number) => this.isFloor(x, y);
      for (const tile of this.walls.tiles) tile.target = wallHeight(tile.x, tile.y, isFloor, sx, sz);
      this.walls.moving = true;
    }
    if (!this.walls.moving) return;
    const k = damp(dt, WALL_LAG);
    let moving = false;
    for (const tile of this.walls.tiles) {
      const gap = tile.target - tile.height;
      if (Math.abs(gap) < 0.005) tile.height = tile.target;
      else {
        tile.height += gap * k;
        moving = true;
      }
    }
    this.walls.moving = moving;
    this.placeWalls();
  }

  /** The station's machines as simple blocks with a glowing screen on top. */
  private buildMachines(): void {
    const body = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(0.8, 0.9, 0.8).translate(0, 0.45, 0)), this.track(fadeableMaterial(0x5b6a8f)), EQUIPMENT.length);
    const screen = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(0.62, 0.06, 0.62)), this.track(fadeableMaterial(0x1d6f7a, 0x2bb8c9)), EQUIPMENT.length);
    const matrix = new THREE.Matrix4();
    EQUIPMENT.forEach((item, index) => {
      body.setMatrixAt(index, matrix.makeTranslation(item.x + 0.5, 0, item.y + 0.5));
      screen.setMatrixAt(index, matrix.makeTranslation(item.x + 0.5, 0.93, item.y + 0.5));
    });
    body.computeBoundingSphere();
    this.scene.add(body, screen);
    this.fadeGroups.push(new FadeGroup([body, screen]));
  }

  /** Doors of rooms that are still locked, shown as barriers (they also block walking). */
  private buildLockedDoors(): void {
    const locked = ROOMS.filter((room) => this.options.lockedRooms.includes(room.id)).flatMap((room) => room.door);
    if (locked.length === 0) return;
    const mesh = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(1, 1.1, 0.3).translate(0, 0.55, 0)), this.track(fadeableMaterial(0xc4552a, 0x3a1206)), locked.length);
    const matrix = new THREE.Matrix4();
    locked.forEach((door, index) => mesh.setMatrixAt(index, matrix.makeTranslation(door.x + 0.5, 0, door.y + 0.5)));
    mesh.computeBoundingSphere();
    this.scene.add(mesh);
    this.fadeGroups.push(new FadeGroup([mesh]));
  }

  /**
   * Fade-on-occlusion: rays from the camera to the astronaut's feet, waist
   * and head. Any wall, machine or door block they hit fades to 25%.
   */
  private updateOcclusion(dt: number): void {
    const p = this.player.position;
    const targets = this.fadeGroups.map((group) => group.meshes[0]!);
    const hits = this.fadeGroups.map(() => new Set<number>());
    for (const height of [0.15, 0.55, 0.95]) {
      this.rayTarget.set(p.x, height, p.z);
      const direction = this.rayTarget.clone().sub(this.camera.position);
      const distance = direction.length();
      this.raycaster.set(this.camera.position, direction.normalize());
      this.raycaster.far = distance - 0.35;
      for (const hit of this.raycaster.intersectObjects(targets, false)) {
        const group = targets.indexOf(hit.object as THREE.InstancedMesh);
        if (group >= 0 && hit.instanceId !== undefined) hits[group]!.add(hit.instanceId);
      }
    }
    this.fadeGroups.forEach((group, index) => {
      group.setFaded(hits[index]!);
      group.step(dt);
    });
  }

  /** Floor is every room, corridor and door tile (machines stand on floor too). */
  private isFloor(x: number, y: number): boolean {
    return roomAtTile(x, y) !== null;
  }

  /** An original blocky astronaut: white suit, cyan visor, orange backpack. */
  private buildAstronaut(): void {
    const box = this.track(new THREE.BoxGeometry(1, 1, 1));
    const suit = this.track(new THREE.MeshLambertMaterial({ color: 0xf2f4fb }));
    const dark = this.track(new THREE.MeshLambertMaterial({ color: 0x9aa3bf }));
    const visor = this.track(new THREE.MeshLambertMaterial({ color: 0x3de0f5, emissive: 0x0c4a55 }));
    const pack = this.track(new THREE.MeshLambertMaterial({ color: 0xff7a1a }));
    const part = (material: THREE.Material, size: [number, number, number], position: [number, number, number]) => {
      const mesh = new THREE.Mesh(box, material);
      mesh.scale.set(...size);
      mesh.position.set(...position);
      this.player.add(mesh);
    };
    part(dark, [0.16, 0.34, 0.18], [-0.1, 0.17, 0]); // legs
    part(dark, [0.16, 0.34, 0.18], [0.1, 0.17, 0]);
    part(suit, [0.42, 0.38, 0.26], [0, 0.53, 0]); // body
    part(suit, [0.12, 0.32, 0.14], [-0.28, 0.54, 0]); // arms
    part(suit, [0.12, 0.32, 0.14], [0.28, 0.54, 0]);
    part(pack, [0.34, 0.32, 0.12], [0, 0.56, -0.19]); // backpack
    part(suit, [0.36, 0.32, 0.32], [0, 0.88, 0]); // helmet
    part(visor, [0.28, 0.16, 0.04], [0, 0.9, 0.165]); // visor (faces +z, the front)
    this.scene.add(this.player);
  }

  // ------------------------------------------------------------ input

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const key = event.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      this.keys.add(key);
      event.preventDefault();
    }
    if ((key === 'q' || key === 'e') && !event.repeat) this.rotate(key === 'q' ? -1 : 1);
  };

  private onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.key.toLowerCase());
  private onBlur = () => this.keys.clear();

  /** Q/E: snap the camera 90 degrees around the astronaut, with a short ease. */
  rotate(direction: -1 | 1): void {
    const from = this.yaw;
    const base = this.snap ? this.snap.to : this.yaw;
    this.snap = { from, to: base + (direction * Math.PI) / 2, elapsed: 0 };
  }

  private input(): { x: number; y: number } {
    const k = this.keys;
    return {
      x: (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0),
      y: (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0),
    };
  }

  // ------------------------------------------------------------ each frame

  private frame = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.frames += 1;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.options.onFps?.(Math.round(this.frames / this.fpsTime));
      this.frames = 0;
      this.fpsTime = 0;
    }
  };

  private blocked(x: number, z: number): boolean {
    for (const [dx, dz] of [[-RADIUS, -RADIUS], [RADIUS, -RADIUS], [-RADIUS, RADIUS], [RADIUS, RADIUS]] as const) {
      if (!this.grid[Math.floor(z + dz)]?.[Math.floor(x + dx)]) return true;
    }
    return false;
  }

  private update(dt: number): void {
    if (this.snap) {
      this.snap.elapsed += dt;
      const { yaw, done } = snapYaw(this.snap);
      this.yaw = yaw;
      if (done) this.snap = null;
    }

    // Screen-relative movement, sliding along walls one axis at a time.
    const { x: ix, y: iy } = this.input();
    const move = screenToWorld(ix, iy, this.yaw);
    const p = this.player.position;
    const nx = p.x + move.x * SPEED * dt;
    const nz = p.z + move.z * SPEED * dt;
    if (!this.blocked(nx, p.z)) p.x = nx;
    if (!this.blocked(p.x, nz)) p.z = nz;
    this.velocity.set(move.x, move.z);

    // Turn smoothly toward the direction of movement.
    if (this.velocity.lengthSq() > 0.01) {
      const target = Math.atan2(move.x, move.z);
      this.heading += angleDelta(this.heading, target) * damp(dt, TURN_LAG);
      this.player.rotation.y = this.heading;
    }

    // Damped follow: look at the astronaut plus a small lead in the movement direction.
    const lead = { x: p.x + move.x * LOOK_LEAD, z: p.z + move.z * LOOK_LEAD };
    const k = damp(dt, FOLLOW_LAG);
    this.look.x += (lead.x - this.look.x) * k;
    this.look.z += (lead.z - this.look.z) * k;
    this.look.y = 0.5;
    this.placeCamera();
    this.updateWalls(dt);
    this.updateOcclusion(dt);
  }

  private placeCamera(): void {
    const offset = cameraOffset(this.yaw);
    this.camera.position.set(this.look.x + offset.x, this.look.y + offset.y, this.look.z + offset.z);
    this.camera.lookAt(this.look);
  }

  private resize(): void {
    const { clientWidth: width, clientHeight: height } = this.container;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Frees the GPU memory and listeners. Called when the page closes. */
  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    this.scene.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    this.disposables.forEach((item) => item.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
