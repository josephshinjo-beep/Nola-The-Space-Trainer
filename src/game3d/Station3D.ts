import * as THREE from 'three';
import type { RoomId } from '../simulation/types';
import type { GameBridge } from '../game/GameBridge';
import { buildWalkGrid, COLS, EQUIPMENT, PLAYER_START, ROOMS, roomAtTile, ROWS, standingSpot, TILE, type EquipmentId } from '../game/stationMap';
import { angleDelta, CAMERA_FOV, cameraOffset, damp, FOLLOW_LAG, LOOK_LEAD, screenToWorld, snapYaw, type YawSnap } from './camera';
import { cameraSide, edgeLips, FADED_OPACITY, wallHeight, wallTiles } from './level';

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
  private screens!: THREE.InstancedMesh;
  private hemisphere!: THREE.HemisphereLight;
  private markers!: { objective: THREE.Mesh; urgent: THREE.Mesh; alerts: THREE.InstancedMesh; plates: THREE.InstancedMesh; focus: THREE.Mesh; outline: THREE.Group };
  private labels!: { name: HTMLDivElement; prompt: HTMLDivElement };
  private currentRoom: RoomId | null = null;
  private nearby: EquipmentId | null = null;
  private time = 0;
  private labelPoint = new THREE.Vector3();

  constructor(
    private container: HTMLElement,
    private options: StationOptions,
  ) {
    this.renderer = this.makeRenderer(options.quality);
    this.grid = buildWalkGrid(new Set(options.bridge.view.lockedRooms));
    this.scene.background = new THREE.Color(0x070b1f);
    this.buildLights();
    this.buildFloor();
    this.buildEdges();
    this.buildWalls();
    this.buildMachines();
    this.buildDoors();
    this.buildAstronaut();
    this.buildMarkers();
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
    this.resize();
    this.renderer.setAnimationLoop(this.frame);
  }

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private buildLights(): void {
    // Step 1 uses simple lights so the shapes read clearly; step 3 replaces them.
    this.hemisphere = new THREE.HemisphereLight(0x9fb4ff, 0x1a2040, 1.6);
    this.scene.add(this.hemisphere);
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
    const screen = new THREE.InstancedMesh(this.track(new THREE.BoxGeometry(0.62, 0.06, 0.62)), this.track(fadeableMaterial(0xffffff, 0x0b3a40)), EQUIPMENT.length);
    this.screens = screen;
    const matrix = new THREE.Matrix4();
    EQUIPMENT.forEach((item, index) => {
      body.setMatrixAt(index, matrix.makeTranslation(item.x + 0.5, 0, item.y + 0.5));
      screen.setMatrixAt(index, matrix.makeTranslation(item.x + 0.5, 0.93, item.y + 0.5));
    });
    body.computeBoundingSphere();
    this.paintScreens([]);
    this.scene.add(body, screen);
    this.fadeGroups.push(new FadeGroup([body, screen]));
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

  /** Machines that are switched on and working have bright screens. */
  private paintScreens(running: readonly EquipmentId[]): void {
    const color = new THREE.Color();
    EQUIPMENT.forEach((item, index) => this.screens.setColorAt(index, color.setHex(running.includes(item.id) ? 0x5ff0ff : 0x2a5a66)));
    if (this.screens.instanceColor) this.screens.instanceColor.needsUpdate = true;
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
    const prompt = make('bg-glow px-3 py-1 text-sm text-void shadow-lg');
    prompt.style.display = 'none';
    this.labels = { name, prompt };
  }

  /** Applies what React wants shown, whenever it changes. */
  private applyView(): void {
    const { view } = this.options.bridge;
    this.seenVersion = this.options.bridge.viewVersion;
    this.applyLocks(view.lockedRooms);
    this.paintScreens(view.running);
    const matrix = new THREE.Matrix4();
    EQUIPMENT.forEach((item, index) => {
      const on = view.alerts.includes(item.id);
      this.markers.alerts.setMatrixAt(index, on ? matrix.makeTranslation(item.x + 0.5, 1.35, item.y + 0.5) : matrix.makeScale(0, 0, 0));
    });
    this.markers.alerts.instanceMatrix.needsUpdate = true;
    // A solar storm tints the station red.
    this.hemisphere.color.setHex(view.storm ? 0xff9a9a : 0x9fb4ff);
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
    this.report();
    this.updateMarkers();
  }

  /** Tells React which room the astronaut is in and which machine is in reach, as the 2D game does. */
  private report(): void {
    const bridge = this.options.bridge;
    const p = this.player.position;
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
    place(this.markers.urgent, view.urgent && view.urgent !== view.target ? view.urgent : null);

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
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.name.remove();
    this.labels.prompt.remove();
  }
}
