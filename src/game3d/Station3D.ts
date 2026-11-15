import * as THREE from 'three';
import type { RoomId } from '../simulation/types';
import type { GameBridge } from '../game/GameBridge';
import { buildWalkGrid, COLS, EQUIPMENT, PLAYER_START, ROOMS, roomAtTile, ROWS, standingSpot, TILE, type EquipmentId } from '../game/stationMap';
import { angleDelta, CAMERA_FOV, cameraOffset, damp, FOLLOW_LAG, LOOK_LEAD, screenToWorld, snapYaw, type YawSnap } from './camera';
import { cameraSide, edgeLips, FADED_OPACITY, wallHeight, wallTiles } from './level';
import { buildMachine, type MachineModel } from './machines';

/**
 * The 3D station view: a fixed high-angle diagonal camera following a blocky
 * astronaut around the same station layout as the 2D game (stationMap.ts).
 * It talks to the rest of the game only through GameBridge, exactly like the
 * Phaser scene: React tells it what to show (locked doors, faults, the next
 * task, the urgent job) and it reports what the player does (room entered,
 * machine nearby, "use" pressed). It never changes the simulation or the
 * sol engine itself, so every mission, task and sol works the same in 2D and 3D.
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
/** How close the astronaut must be to use a machine: the same reach as the 2D game (1.45 tiles). */
export const REACH = 1.45;
const DOORS = ROOMS.flatMap((room) => room.door.map((door) => ({ ...door, room: room.id })));
const FOG = 0x070b1f;
const LAMP_LIGHTS = 4; // at most four real point lights, moved to the lamps nearest the astronaut
const DUST = { high: 140, low: 60 };

/**
 * Wall lamps: two on the back wall of each room and a row along the
 * corridor. Each is a small glowing block; the real lights follow the player.
 */
const LAMPS = [
  ...ROOMS.filter((room) => room.id !== 'corridor').flatMap((room) => [room.x1 + 1, room.x2 - 1].map((x) => ({ x: x + 0.5, y: 1.05, z: room.y1 + 0.08 }))),
  ...[3, 9, 15, 21, 27, 33].map((x) => ({ x: x + 0.5, y: 1.05, z: 8.08 })),
];

/** A vertical fade for light beams: bright at the floor, clear at the top. */
function beamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0.9)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 4, 64);
  return new THREE.CanvasTexture(canvas);
}

/** A soft round dot for dust particles, drawn once. */
function dotTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const context = canvas.getContext('2d')!;
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

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
  /** The same bridge the 2D game uses: the only link to the rest of the game. */
  bridge: GameBridge;
  quality: Quality;
  /** The astronaut's name, shown on a tag over their head. */
  name?: string;
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
  private seenVersion = -1;
  private lockedKey = '';
  private doors!: THREE.InstancedMesh;
  private machines: { id: EquipmentId; model: MachineModel; opacity: number }[] = [];
  private machineFade!: FadeGroup;
  private hemisphere!: THREE.HemisphereLight;
  private markers!: { objective: THREE.Mesh; urgent: THREE.Mesh; alerts: THREE.InstancedMesh; plates: THREE.InstancedMesh; focus: THREE.Mesh; outline: THREE.Group };
  private labels!: { name: HTMLDivElement; prompt: HTMLDivElement; objective: HTMLDivElement; urgent: HTMLDivElement };
  private rig!: { hipL: THREE.Group; hipR: THREE.Group; shoulderL: THREE.Group; shoulderR: THREE.Group; torso: THREE.Group };
  private walkPhase = 0;
  private walkAmount = 0;
  private walkingReported = false;
  private spots!: { beams: THREE.Mesh[]; rings: THREE.InstancedMesh };
  private currentRoom: RoomId | null = null;
  private nearby: EquipmentId | null = null;
  private time = 0;
  private labelPoint = new THREE.Vector3();
  private sun!: THREE.DirectionalLight;
  private ambient!: THREE.AmbientLight;
  private lampLights: THREE.PointLight[] = [];
  private lampTimer = 0;
  private dust!: { points: THREE.Points; velocity: Float32Array };
  private vignette!: HTMLDivElement;

  constructor(
    private container: HTMLElement,
    private options: StationOptions,
  ) {
    this.renderer = this.makeRenderer(options.quality);
    this.grid = buildWalkGrid(new Set(options.bridge.view.lockedRooms));
    this.scene.background = new THREE.Color(FOG);
    // Light fog toward the distance; the camera is about 13 units from the astronaut.
    this.scene.fog = new THREE.Fog(FOG, 15, 32);
    this.buildLights();
    this.buildFloor();
    this.buildEdges();
    this.buildWalls();
    this.buildMachines();
    this.buildDoors();
    this.buildAstronaut();
    this.buildMarkers();
    this.buildLamps();
    this.buildDust();
    this.buildLabels();

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
    return { x, z, yaw: this.yaw, heading: this.heading, camera: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }, calls, triangles, pixels: `${size.x}x${size.y}`, faded, nearby: this.nearby, room: this.currentRoom, wallsMoving: this.walls.moving, lowWalls: this.walls.tiles.filter((t) => t.height < 1.5).length, tallWalls: this.walls.tiles.filter((t) => t.height >= 1.5).length };
  }

  // ------------------------------------------------------------ set-up

  private makeRenderer(quality: Quality): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({ antialias: quality === 'high', powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 1.5 : 1));
    // Filmic colour for a more realistic look. One small shadow map on High, none on Low.
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = quality === 'high';
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.classList.add('station3d-canvas');
    renderer.domElement.setAttribute('role', 'img');
    renderer.domElement.setAttribute('aria-label', '3D view of your space station from above. Your location, nearby equipment and mission tasks are described in the panels around it.');
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
    this.sun.castShadow = quality === 'high';
    // Materials must be recompiled when shadows are switched on or off.
    this.scene.traverse((object) => {
      const material = (object as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      for (const item of Array.isArray(material) ? material : material ? [material] : []) item.needsUpdate = true;
    });
    this.dust.points.geometry.setDrawRange(0, quality === 'high' ? DUST.high : DUST.low);
    this.resize();
    this.renderer.setAnimationLoop(this.frame);
  }

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private buildLights(): void {
    // Dark blue ambient light, a soft sky/floor fill, and one warm directional "sun".
    this.ambient = new THREE.AmbientLight(0x23305e, 1.1);
    this.hemisphere = new THREE.HemisphereLight(0x7c93d6, 0x0b1024, 0.9);
    this.sun = new THREE.DirectionalLight(0xffcf9a, 2.2);
    this.sun.castShadow = this.options.quality === 'high';
    const shadow = this.sun.shadow;
    shadow.mapSize.set(1024, 1024);
    shadow.camera.left = shadow.camera.bottom = -10;
    shadow.camera.right = shadow.camera.top = 10;
    shadow.camera.near = 1;
    shadow.camera.far = 40;
    shadow.bias = -0.0006;
    shadow.normalBias = 0.03;
    this.scene.add(this.ambient, this.hemisphere, this.sun, this.sun.target);
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
    tile.receiveShadow = true;
    this.scene.add(tile);
  }

  /** Raised block edges along the walkways, where the floor meets a wall. */
  private buildEdges(): void {
    const lips = edgeLips(COLS, ROWS, (x, y) => this.isFloor(x, y));
    // The raised walkway edges double as glowing light strips.
    const mesh = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(1, 0.1, 0.12)), this.track(new THREE.MeshLambertMaterial({ color: 0x2f6f86, emissive: 0x1593a8, emissiveIntensity: 0.9 })), lips.length);
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
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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
  /**
   * The machines, each with its own model (machines.ts): the Command
   * Console is an arcade cabinet, the Grow Bed has plants, and so on. An
   * invisible box over each one joins the fade system, so a machine that
   * hides the astronaut fades just like a wall.
   */
  private buildMachines(): void {
    const colliders = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(0.86, 1.3, 0.86).translate(0, 0.65, 0)), this.track(new THREE.MeshBasicMaterial({ visible: false })), EQUIPMENT.length);
    const matrix = new THREE.Matrix4();
    this.machines = EQUIPMENT.map((item, index) => {
      colliders.setMatrixAt(index, matrix.makeTranslation(item.x + 0.5, 0, item.y + 0.5));
      const model = buildMachine(item.id);
      model.group.position.set(item.x + 0.5, 0, item.y + 0.5);
      // Fronts face the camera's usual side: top-row and corridor machines face
      // the corridor (+z); bottom-row machines face east (+x), so their fronts
      // are visible instead of their backs, beside the spot where you use them.
      model.group.rotation.y = item.y < ROWS / 2 ? 0 : Math.PI / 2;
      this.scene.add(model.group);
      return { id: item.id, model, opacity: 1 };
    });
    colliders.computeBoundingSphere();
    this.scene.add(colliders);
    this.machineFade = new FadeGroup([colliders]);
    this.fadeGroups.push(this.machineFade);
  }

  /** A barrier on every door; only the doors of locked rooms are shown (and block walking). */
  private buildDoors(): void {
    this.doors = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(1, 1.1, 0.3).translate(0, 0.55, 0)), this.track(fadeableMaterial(0xc4552a, 0x3a1206)), DOORS.length);
    this.scene.add(this.doors);
    this.fadeGroups.push(new FadeGroup([this.doors]));
    this.applyLocks(this.options.bridge.view.lockedRooms);
  }

  private applyLocks(lockedRooms: readonly RoomId[]): void {
    const key = [...lockedRooms].sort().join(',');
    if (key === this.lockedKey) return;
    this.lockedKey = key;
    this.grid = buildWalkGrid(new Set(lockedRooms));
    const matrix = new THREE.Matrix4();
    DOORS.forEach((door, index) => {
      const size = lockedRooms.includes(door.room) ? 1 : 0;
      this.doors.setMatrixAt(index, matrix.makeScale(size, size, size).setPosition(door.x + 0.5, 0, door.y + 0.5));
    });
    this.doors.instanceMatrix.needsUpdate = true;
    this.doors.computeBoundingSphere();
  }

  /**
   * Gameplay markers: a yellow diamond over the next mission task, an orange
   * one over today's urgent job, red warnings over broken machines, a cyan
   * plate where you stand to use each machine, and a yellow outline under
   * the astronaut's feet.
   */
  private buildMarkers(): void {
    const shape = new THREE.Shape([new THREE.Vector2(0, 0.28), new THREE.Vector2(0.2, 0), new THREE.Vector2(0, -0.28), new THREE.Vector2(-0.2, 0)]);
    const diamond = this.track(new THREE.ShapeGeometry(shape));
    const objective = new THREE.Mesh(diamond, this.track(new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide })));
    const urgent = new THREE.Mesh(diamond, this.track(new THREE.MeshBasicMaterial({ color: 0xff7a1a, side: THREE.DoubleSide })));
    objective.visible = false;
    urgent.visible = false;

    const alerts = new THREE.InstancedMesh(this.track(new THREE.OctahedronGeometry(0.16)), this.track(new THREE.MeshBasicMaterial({ color: 0xff4d5e })), EQUIPMENT.length);
    const plates = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(0.7, 0.03, 0.7)), this.track(new THREE.MeshBasicMaterial({ color: 0x3de0f5, transparent: true, opacity: 0.35 })), EQUIPMENT.length);
    const matrix = new THREE.Matrix4();
    EQUIPMENT.forEach((item, index) => {
      const spot = standingSpot(item);
      plates.setMatrixAt(index, matrix.makeTranslation(spot.x / TILE, 0.02, spot.y / TILE));
      alerts.setMatrixAt(index, matrix.makeScale(0, 0, 0));
    });
    const focus = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.78, 0.04, 0.78)), this.track(new THREE.MeshBasicMaterial({ color: 0x8ff6ff, transparent: true, opacity: 0.7 })));
    focus.visible = false;

    const outline = new THREE.Group();
    const bar = this.track(new THREE.BoxGeometry(0.96, 0.03, 0.06));
    const yellow = this.track(new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    for (const [x, z, turn] of [[0, -0.45, 0], [0, 0.45, 0], [-0.45, 0, 1], [0.45, 0, 1]] as const) {
      const piece = new THREE.Mesh(bar, yellow);
      piece.position.set(x, 0.03, z);
      if (turn) piece.rotation.y = Math.PI / 2;
      outline.add(piece);
    }
    this.scene.add(objective, urgent, alerts, plates, focus, outline);
    this.markers = { objective, urgent, alerts, plates, focus, outline };

    // Task spots, made easy to notice: a tall beam of light over the next
    // task (yellow) and the urgent job (orange), and a pulsing ring on the
    // floor around every machine that needs you (red for repairs).
    const beamGeometry = this.track(new THREE.CylinderGeometry(0.42, 0.5, 5, 24, 1, true).translate(0, 2.5, 0));
    const fade = this.track(beamTexture());
    const beams = [0xffd23f, 0xff7a1a].map((color) => {
      const beam = new THREE.Mesh(beamGeometry, this.track(new THREE.MeshBasicMaterial({ color, map: fade, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false })));
      beam.visible = false;
      beam.renderOrder = 2;
      this.scene.add(beam);
      return beam;
    });
    const rings = new THREE.InstancedMesh(this.track(new THREE.RingGeometry(0.62, 0.8, 40).rotateX(-Math.PI / 2)), this.track(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })), EQUIPMENT.length);
    rings.frustumCulled = false;
    EQUIPMENT.forEach((_, index) => {
      rings.setMatrixAt(index, new THREE.Matrix4().makeScale(0, 0, 0));
      rings.setColorAt(index, new THREE.Color(0xffffff));
    });
    this.scene.add(rings);
    this.spots = { beams, rings };
  }

  /** Glowing lamp blocks on the walls, and the four real lights that follow the astronaut. */
  private buildLamps(): void {
    const fixtures = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(0.34, 0.16, 0.1)), this.track(new THREE.MeshBasicMaterial({ color: 0xffc27a })), LAMPS.length);
    const matrix = new THREE.Matrix4();
    LAMPS.forEach((lamp, index) => fixtures.setMatrixAt(index, matrix.makeTranslation(lamp.x, lamp.y, lamp.z)));
    this.scene.add(fixtures);
    for (let i = 0; i < LAMP_LIGHTS; i++) {
      const light = new THREE.PointLight(0xffa860, 0, 7, 1.6);
      light.position.set(LAMPS[i]!.x, LAMPS[i]!.y, LAMPS[i]!.z + 0.4);
      this.lampLights.push(light);
      this.scene.add(light);
    }
  }

  /** Moves the four lamp lights to the lamps nearest the astronaut, fading them in and out. */
  private updateLamps(dt: number): void {
    const p = this.player.position;
    this.lampTimer -= dt;
    if (this.lampTimer <= 0) {
      this.lampTimer = 0.4;
      const nearest = [...LAMPS].sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z)).slice(0, LAMP_LIGHTS);
      // Keep lights that are already on a chosen lamp; move the others.
      const free = this.lampLights.filter((light) => !nearest.some((lamp) => Math.abs(lamp.x - light.position.x) < 0.01 && Math.abs(lamp.z + 0.4 - light.position.z) < 0.01));
      for (const lamp of nearest) {
        const taken = this.lampLights.some((light) => Math.abs(lamp.x - light.position.x) < 0.01 && Math.abs(lamp.z + 0.4 - light.position.z) < 0.01);
        const light = taken ? undefined : free.shift();
        if (light) {
          light.position.set(lamp.x, lamp.y, lamp.z + 0.4);
          light.intensity = 0;
        }
      }
    }
    const k = damp(dt, 0.25);
    const storm = this.options.bridge.view.storm;
    for (const light of this.lampLights) light.intensity += ((storm ? 3.5 : 5) - light.intensity) * k;
  }

  /** A few dust motes drifting in the light around the astronaut. */
  private buildDust(): void {
    const count = DUST.high;
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (hash(i, 1) - 0.5) * 9;
      positions[i * 3 + 1] = 0.2 + hash(i, 2) * 2.6;
      positions[i * 3 + 2] = (hash(i, 3) - 0.5) * 9;
      velocity[i * 3] = (hash(i, 4) - 0.5) * 0.08;
      velocity[i * 3 + 1] = (hash(i, 5) - 0.3) * 0.05;
      velocity[i * 3 + 2] = (hash(i, 6) - 0.5) * 0.08;
    }
    const geometry = this.track(new THREE.BufferGeometry());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setDrawRange(0, this.options.quality === 'high' ? DUST.high : DUST.low);
    const material = this.track(new THREE.PointsMaterial({ size: 0.07, map: this.track(dotTexture()), color: 0xd9e6ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: true }));
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    this.scene.add(points);
    this.dust = { points, velocity };
  }

  /** Dust drifts slowly and wraps around a box centred on the astronaut. Still when "Reduce motion" is on. */
  private updateDust(dt: number): void {
    const { points, velocity } = this.dust;
    points.position.set(this.player.position.x, 0, this.player.position.z);
    if (this.options.bridge.view.reducedMotion) return;
    const attribute = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const wobble = Math.sin(this.time * 0.7);
    for (let i = 0; i < array.length; i += 3) {
      array[i] = ((array[i]! + (velocity[i]! + wobble * 0.01) * dt + 4.5 + 9) % 9) - 4.5;
      array[i + 1] = ((array[i + 1]! + velocity[i + 1]! * dt - 0.2 + 2.8) % 2.8) + 0.2;
      array[i + 2] = ((array[i + 2]! + velocity[i + 2]! * dt + 4.5 + 9) % 9) - 4.5;
    }
    attribute.needsUpdate = true;
  }

  /** Labels drawn as ordinary page content over the 3D view: the name tag and the "Press E" prompt. */
  private buildLabels(): void {
    const make = (className: string) => {
      const element = document.createElement('div');
      element.className = `pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-full font-bold ${className}`;
      element.setAttribute('aria-hidden', 'true');
      this.container.appendChild(element);
      return element;
    };
    const name = make('border border-line bg-hull/85 px-2 py-0.5 text-xs text-star');
    name.textContent = this.options.name ?? 'Astronaut';
    // A soft vignette, drawn with CSS: no post-processing needed.
    this.vignette = document.createElement('div');
    this.vignette.className = 'pointer-events-none absolute inset-0';
    this.vignette.setAttribute('aria-hidden', 'true');
    this.setVignette(false);
    this.container.appendChild(this.vignette);
    const prompt = make('bg-glow px-3 py-1 text-sm text-void shadow-lg');
    prompt.style.display = 'none';
    // Task labels. When the task is off screen, they stick to the screen edge with an arrow pointing to it.
    // Drawn above the HUD layer (z-30), so a task arrow at the screen edge is never hidden behind a panel.
    const objective = make('z-30 border-2 border-void bg-[#ffd23f] px-3 py-1 text-sm text-void shadow-lg');
    const urgent = make('z-30 border-2 border-void bg-nola px-3 py-1 text-sm text-void shadow-lg');
    objective.style.display = urgent.style.display = 'none';
    this.labels = { name, prompt, objective, urgent };
  }

  private setVignette(storm: boolean): void {
    this.vignette.style.background = storm
      ? 'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(90,8,20,0.55) 100%)'
      : 'radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(2,4,16,0.72) 100%)';
  }

  /** Applies what React wants shown, whenever it changes. */
  private applyView(): void {
    const { view } = this.options.bridge;
    this.seenVersion = this.options.bridge.viewVersion;
    this.applyLocks(view.lockedRooms);
    // The Grow Bed shows the crop as it grows.
    this.machines.find((machine) => machine.id === 'growbed')?.model.setCrop?.(view.cropStage);
    const matrix = new THREE.Matrix4();
    EQUIPMENT.forEach((item, index) => {
      const on = view.alerts.includes(item.id);
      this.markers.alerts.setMatrixAt(index, on ? matrix.makeTranslation(item.x + 0.5, 1.35, item.y + 0.5) : matrix.makeScale(0, 0, 0));
    });
    this.markers.alerts.instanceMatrix.needsUpdate = true;
    // A solar storm tints the station red.
    this.hemisphere.color.setHex(view.storm ? 0xd06a6a : 0x7c93d6);
    this.ambient.color.setHex(view.storm ? 0x4a1d2a : 0x23305e);
    this.setVignette(view.storm);
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
    // Machine models follow their invisible box's fade.
    this.machines.forEach((machine, index) => {
      const opacity = this.machineFade.opacity[index]!;
      if (Math.abs(opacity - machine.opacity) < 0.001) return;
      machine.opacity = opacity;
      machine.model.setOpacity(opacity);
    });
  }

  /** Moving parts: fans, dishes, bubbles, screens. Running machines light up. */
  private animateMachines(): void {
    const { view } = this.options.bridge;
    const state = { storm: view.storm, still: view.reducedMotion };
    for (const machine of this.machines) machine.model.animate(this.time, { ...state, running: view.running.includes(machine.id) });
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
    const boot = this.track(new THREE.MeshLambertMaterial({ color: 0x5b6480 }));
    const part = (parent: THREE.Object3D, material: THREE.Material, size: [number, number, number], position: [number, number, number]) => {
      const mesh = new THREE.Mesh(box, material);
      mesh.scale.set(...size);
      mesh.position.set(...position);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    /** A joint: limbs hang from it, so turning it swings the limb like a hip or a shoulder. */
    const joint = (parent: THREE.Object3D, x: number, y: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      parent.add(pivot);
      return pivot;
    };
    // Legs swing from the hips; each has a darker boot at the bottom.
    const hipL = joint(this.player, -0.1, 0.34);
    const hipR = joint(this.player, 0.1, 0.34);
    for (const hip of [hipL, hipR]) {
      part(hip, dark, [0.16, 0.28, 0.18], [0, -0.14, 0]);
      part(hip, boot, [0.17, 0.08, 0.22], [0, -0.3, 0.02]);
    }
    // The upper body bobs as a whole while walking.
    const torso = new THREE.Group();
    this.player.add(torso);
    part(torso, suit, [0.42, 0.38, 0.26], [0, 0.53, 0]); // body
    part(torso, pack, [0.34, 0.32, 0.12], [0, 0.56, -0.19]); // backpack
    part(torso, suit, [0.36, 0.32, 0.32], [0, 0.88, 0]); // helmet
    part(torso, visor, [0.28, 0.16, 0.04], [0, 0.9, 0.165]); // visor (faces +z, the front)
    // Arms swing from the shoulders, opposite to the legs.
    const shoulderL = joint(torso, -0.28, 0.7);
    const shoulderR = joint(torso, 0.28, 0.7);
    for (const shoulder of [shoulderL, shoulderR]) part(shoulder, suit, [0.12, 0.32, 0.14], [0, -0.16, 0]);
    this.rig = { hipL, hipR, shoulderL, shoulderR, torso };
    this.scene.add(this.player);
  }

  // ------------------------------------------------------------ input

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const key = event.key.toLowerCase();
    if (this.options.bridge.paused) return;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      this.keys.add(key);
      event.preventDefault();
    }
    // Q and R turn the camera; E, Space and Enter use the machine in reach, as in the 2D game.
    if ((key === 'q' || key === 'r') && !event.repeat) this.rotate(key === 'q' ? -1 : 1);
    if ((key === 'e' || key === ' ' || key === 'enter') && !event.repeat && this.nearby) {
      event.preventDefault();
      this.options.bridge.emit('interact', this.nearby);
    }
  };

  private onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.key.toLowerCase());
  private onBlur = () => this.keys.clear();

  /** Q/R: snap the camera 90 degrees around the astronaut, with a short ease. */
  rotate(direction: -1 | 1): void {
    const from = this.yaw;
    const base = this.snap ? this.snap.to : this.yaw;
    this.snap = { from, to: base + (direction * Math.PI) / 2, elapsed: 0 };
  }

  private input(): { x: number; y: number } {
    const k = this.keys;
    // The on-screen joystick (phones and tablets) uses screen directions too: pushing up moves up the screen.
    const stick = this.options.bridge.input;
    return {
      x: (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0) + stick.x,
      y: (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) - stick.y,
    };
  }

  // ------------------------------------------------------------ each frame

  private frame = () => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    // While a panel or menu covers the game, nothing moves and nothing is redrawn.
    if (this.options.bridge.paused) {
      this.keys.clear();
      if (this.walkingReported) {
        this.walkingReported = false;
        this.options.bridge.emit('walking', false);
      }
      return;
    }
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
    const bridge = this.options.bridge;
    this.time += dt;
    if (bridge.viewVersion !== this.seenVersion) this.applyView();

    // "Travel to" from the station map: stand next to the machine.
    if (bridge.travelTo) {
      const item = EQUIPMENT.find((candidate) => candidate.id === bridge.travelTo);
      bridge.travelTo = null;
      if (item && !bridge.view.lockedRooms.includes(item.room)) {
        const spot = standingSpot(item);
        this.player.position.set(spot.x / TILE, 0, spot.y / TILE);
        this.look.set(spot.x / TILE, 0.5, spot.y / TILE);
      }
    }

    while (bridge.pendingTurns.length > 0) this.rotate(bridge.pendingTurns.shift()!);

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
    const before = { x: p.x, z: p.z };
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
    // The legs follow how far the astronaut really moved, so they stop when walking into a wall.
    this.animateWalk(dt, dt > 0 ? Math.hypot(p.x - before.x, p.z - before.z) / (SPEED * dt) : 0);

    // Damped follow: look at the astronaut plus a small lead in the movement direction.
    const lead = { x: p.x + move.x * LOOK_LEAD, z: p.z + move.z * LOOK_LEAD };
    const k = damp(dt, FOLLOW_LAG);
    this.look.x += (lead.x - this.look.x) * k;
    this.look.z += (lead.z - this.look.z) * k;
    this.look.y = 0.5;
    this.placeCamera();
    this.updateWalls(dt);
    this.updateOcclusion(dt);
    this.report();
    this.updateMarkers();
    this.updateLamps(dt);
    this.updateDust(dt);
    this.animateMachines();
    // The sun and its small shadow map follow the astronaut.
    this.sun.target.position.set(p.x, 0, p.z);
    this.sun.position.set(p.x - 5, 12, p.z + 3);
  }

  /**
   * The walk cycle: legs swing from the hips and arms from the shoulders in
   * opposite pairs, and the upper body bobs with each step. When the
   * astronaut stops, the limbs ease back to standing.
   */
  private animateWalk(dt: number, speed: number): void {
    const moving = speed > 0.05;
    this.walkAmount += ((moving ? 1 : 0) - this.walkAmount) * damp(dt, 0.1);
    if (moving !== this.walkingReported) {
      this.walkingReported = moving;
      this.options.bridge.emit('walking', moving);
    }
    // About two steps per second at full speed.
    if (moving) this.walkPhase += dt * 9 * Math.min(1, speed);
    const swing = Math.sin(this.walkPhase) * this.walkAmount;
    const { hipL, hipR, shoulderL, shoulderR, torso } = this.rig;
    hipL.rotation.x = swing * 0.65;
    hipR.rotation.x = -swing * 0.65;
    shoulderL.rotation.x = -swing * 0.55;
    shoulderR.rotation.x = swing * 0.55;
    // A small bob at each footfall, skipped when "Reduce motion" is on.
    torso.position.y = this.options.bridge.view.reducedMotion ? 0 : Math.abs(Math.sin(this.walkPhase)) * 0.035 * this.walkAmount;
  }

  /** Tells React which room the astronaut is in and which machine is in reach, as the 2D game does. */
  private report(): void {
    const bridge = this.options.bridge;
    const p = this.player.position;
    bridge.playerPosition = { x: p.x, y: p.z };
    const here = roomAtTile(Math.floor(p.x), Math.floor(p.z));
    if (here && here.id !== this.currentRoom) {
      this.currentRoom = here.id;
      bridge.emit('room', here.id);
    }
    let nearest: EquipmentId | null = null;
    let best = REACH;
    for (const item of EQUIPMENT) {
      const distance = Math.hypot(item.x + 0.5 - p.x, item.y + 0.5 - p.z);
      if (distance < best) {
        best = distance;
        nearest = item.id;
      }
    }
    if (nearest !== this.nearby) {
      this.nearby = nearest;
      bridge.emit('nearby', nearest);
    }
  }

  private updateMarkers(): void {
    const { view } = this.options.bridge;
    const still = view.reducedMotion;
    const bob = still ? 0 : Math.sin(this.time * 3) * 0.12;
    const place = (marker: THREE.Mesh, id: EquipmentId | null) => {
      const item = id ? EQUIPMENT.find((candidate) => candidate.id === id) : undefined;
      marker.visible = item !== undefined && !view.lockedRooms.includes(item.room);
      if (!item) return;
      marker.position.set(item.x + 0.5, 2.15 + bob, item.y + 0.5);
      // Billboarded: it always faces the camera.
      marker.quaternion.copy(this.camera.quaternion);
    };
    place(this.markers.objective, view.target);
    // Today's urgent sol job gets its own orange diamond, unless it is the same machine.
    const urgentId = view.urgent && view.urgent !== view.target ? view.urgent : null;
    place(this.markers.urgent, urgentId);
    this.updateSpots(view.target, urgentId, still);

    // The outline sits on the tile under the astronaut's feet.
    const p = this.player.position;
    this.markers.outline.position.set(Math.floor(p.x) + 0.5, 0, Math.floor(p.z) + 0.5);

    // The plate of the machine in reach glows and pulses, with a "Press E" label.
    const focus = this.markers.focus;
    const item = this.nearby ? EQUIPMENT.find((candidate) => candidate.id === this.nearby) : undefined;
    focus.visible = item !== undefined;
    if (item) {
      const spot = standingSpot(item);
      focus.position.set(spot.x / TILE, 0.03, spot.y / TILE);
      const wave = still ? 0 : Math.sin(this.time * 6);
      focus.scale.set(1 + wave * 0.06, 1, 1 + wave * 0.06);
      (focus.material as THREE.MeshBasicMaterial).opacity = 0.6 + wave * 0.2;
      this.labels.prompt.textContent = `Press E: ${item.name}`;
      this.placeLabel(this.labels.prompt, item.x + 0.5, 0.35, item.y + 0.5);
    } else this.labels.prompt.style.display = 'none';
    this.placeLabel(this.labels.name, p.x, 1.35, p.z);
  }

  /** Beams, floor rings and labels for the task spots. */
  private updateSpots(target: EquipmentId | null, urgent: EquipmentId | null, still: boolean): void {
    const { view } = this.options.bridge;
    const open = (id: EquipmentId | null) => {
      const item = id ? EQUIPMENT.find((candidate) => candidate.id === id) : undefined;
      return item && !view.lockedRooms.includes(item.room) ? item : undefined;
    };
    const pulse = still ? 1 : 1 + Math.sin(this.time * 4) * 0.12;
    const flicker = still ? 0.75 : 0.62 + Math.sin(this.time * 2.5) * 0.13;
    [open(target), open(urgent)].forEach((item, index) => {
      const beam = this.spots.beams[index]!;
      beam.visible = item !== undefined;
      if (!item) return;
      beam.position.set(item.x + 0.5, 0, item.y + 0.5);
      (beam.material as THREE.MeshBasicMaterial).opacity = flicker;
    });

    // Rings: yellow next task, orange urgent job, red repair. Others have none.
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    EQUIPMENT.forEach((item, index) => {
      const locked = view.lockedRooms.includes(item.room);
      const tone = locked ? null : item.id === target ? 0xffd23f : item.id === urgent ? 0xff7a1a : view.alerts.includes(item.id) ? 0xff4d5e : null;
      this.spots.rings.setMatrixAt(index, tone === null ? matrix.makeScale(0, 0, 0) : matrix.makeScale(pulse, 1, pulse).setPosition(item.x + 0.5, 0.04, item.y + 0.5));
      if (tone !== null) this.spots.rings.setColorAt(index, color.setHex(tone));
    });
    this.spots.rings.instanceMatrix.needsUpdate = true;
    if (this.spots.rings.instanceColor) this.spots.rings.instanceColor.needsUpdate = true;

    this.edgeLabel(this.labels.objective, open(target), 'NEXT TASK');
    this.edgeLabel(this.labels.urgent, open(urgent), 'URGENT');
  }

  /**
   * A label over a task spot. If the spot is off screen, the label sticks to
   * the nearest screen edge with an arrow pointing toward it.
   */
  private edgeLabel(element: HTMLDivElement, item: { x: number; y: number; name: string } | undefined, title: string): void {
    if (!item) {
      element.style.display = 'none';
      return;
    }
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const point = this.labelPoint.set(item.x + 0.5, 2.55, item.y + 0.5).project(this.camera);
    let left = ((point.x + 1) / 2) * width;
    let top = ((1 - point.y) / 2) * height;
    const behind = point.z > 1;
    if (behind) {
      left = width - left;
      top = height - top;
    }
    const margin = 70;
    const inside = !behind && left > margin && left < width - margin && top > margin && top < height - margin;
    element.style.display = 'block';
    if (inside) {
      element.textContent = `${title} · ${item.name}`;
      element.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) translate(-50%, -100%)`;
      return;
    }
    // Off screen: clamp to the edge and point an arrow at the spot.
    const cx = width / 2;
    const cy = height / 2;
    const angle = Math.atan2(top - cy, left - cx);
    const scale = Math.min((cx - margin) / Math.max(1, Math.abs(left - cx)), (cy - margin) / Math.max(1, Math.abs(top - cy)));
    const ex = cx + (left - cx) * Math.min(1, scale);
    const ey = cy + (top - cy) * Math.min(1, scale);
    const arrows = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
    const arrow = arrows[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
    element.textContent = `${arrow} ${title} · ${item.name}`;
    // Keep the whole label on screen, in the middle band: below the top panels and clear of the hotbar and tutorial.
    const half = element.offsetWidth / 2;
    const x = Math.min(Math.max(ex, half + 12), width - half - 12);
    const y = Math.min(Math.max(ey, 190), Math.max(190, Math.min(height - 240, height * 0.55)));
    element.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
  }

  /** Puts a page label over a point in the 3D world. */
  private placeLabel(element: HTMLDivElement, x: number, y: number, z: number): void {
    const point = this.labelPoint.set(x, y, z).project(this.camera);
    const visible = point.z < 1;
    element.style.display = visible ? 'block' : 'none';
    if (!visible) return;
    const left = ((point.x + 1) / 2) * this.container.clientWidth;
    const top = ((1 - point.y) / 2) * this.container.clientHeight;
    element.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) translate(-50%, -100%)`;
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
    this.machines.forEach((machine) => machine.model.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.name.remove();
    this.labels.prompt.remove();
    this.labels.objective.remove();
    this.labels.urgent.remove();
    this.vignette.remove();
  }
}
