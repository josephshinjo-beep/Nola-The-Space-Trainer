import Phaser from 'phaser';
import { suitHex, visorHex } from '../features/profile/avatarOptions';
import type { RoomId } from '../simulation/types';
import type { GameBridge } from './GameBridge';
import { buildWalkGrid, COLS, EQUIPMENT, PLAYER_START, roomAtTile, ROOMS, ROWS, standingSpot, TILE, type Equipment, type EquipmentId } from './stationMap';

const SPEED = 280;
const PLAYER_RADIUS = 20;
const REACH = TILE * 1.45;
const FONT = '"Fredoka Variable", "Lexend Variable", system-ui, sans-serif';

const hex = (css: string) => Number.parseInt(css.slice(1), 16);

interface EquipmentSprite {
  item: Equipment;
  screen: Phaser.GameObjects.Rectangle;
  alert: Phaser.GameObjects.Container;
  arrow: Phaser.GameObjects.Container;
  plants?: Phaser.GameObjects.Graphics;
}

/**
 * Draws the station and moves the astronaut. Everything is drawn with
 * shapes in code, so there are no image files to load.
 *
 * This scene only shows things and reports what the player does through
 * the GameBridge. It holds no simulation values of its own.
 */
export class StationScene extends Phaser.Scene {
  private grid: boolean[][] = [];
  private player!: Phaser.GameObjects.Container;
  private playerBody!: Phaser.GameObjects.Graphics;
  private doors = new Map<RoomId, { panel: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text }>();
  private sprites: EquipmentSprite[] = [];
  private stormOverlay!: Phaser.GameObjects.Rectangle;
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'E' | 'SPACE' | 'ENTER', Phaser.Input.Keyboard.Key>;
  private seenVersion = -1;
  private nearby: EquipmentId | null = null;
  private currentRoom: RoomId | null = null;
  private facing = { x: 0, y: 1 };
  private walkTime = 0;
  private capturing = false;

  constructor(private readonly bridge: GameBridge) {
    super('station');
  }

  create(): void {
    this.drawStation();
    this.createDoors();
    for (const item of EQUIPMENT) this.sprites.push(this.createEquipment(item));

    this.playerBody = this.add.graphics();
    this.player = this.add.container(PLAYER_START.x, PLAYER_START.y, [this.add.ellipse(0, 16, 40, 16, 0x000000, 0.35), this.playerBody]).setDepth(10);

    this.stormOverlay = this.add
      .rectangle(0, 0, COLS * TILE, ROWS * TILE, 0xff3b3b, 0.14)
      .setOrigin(0)
      .setDepth(20)
      .setVisible(false);

    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ENTER', false) as typeof this.keys;

    const camera = this.cameras.main;
    // Extra room around the station lets the camera scroll far enough that the
    // on-screen panels never cover the machines along the walls.
    camera.setBounds(-TILE * 2, -TILE * 4, (COLS + 4) * TILE, (ROWS + 7.5) * TILE);
    camera.startFollow(this.player, true, 0.15, 0.15);
    const fit = () => camera.setZoom(Phaser.Math.Clamp(Math.min(this.scale.width, this.scale.height) / (8 * TILE), 0.55, 1.2));
    fit();
    this.scale.on('resize', fit);

    this.applyView();
  }

  // ---------- drawing ----------

  private drawStation(): void {
    const g = this.make.graphics({}, false);
    const walkable = buildWalkGrid(new Set());

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * TILE;
        const py = y * TILE;
        const area = roomAtTile(x, y);
        if (area) {
          g.fillStyle(area.color).fillRect(px, py, TILE, TILE);
          g.lineStyle(1, 0xffffff, 0.05).strokeRect(px, py, TILE, TILE);
        } else if (this.touchesFloor(walkable, x, y)) {
          // Only walls next to a floor are drawn, so the hull has a clean outline.
          g.fillStyle(0x2b3a75).fillRect(px, py, TILE, TILE);
          g.fillStyle(0x3d4f99).fillRect(px, py, TILE, 10);
          g.lineStyle(2, 0x0b1230, 0.6).strokeRect(px, py, TILE, TILE);
        }
      }
    }

    // The floor and walls never change, so they are drawn once into a single
    // picture. The game then draws one image per frame, not hundreds of tiles.
    g.generateTexture('station-map', COLS * TILE, ROWS * TILE);
    g.destroy();
    this.add.image(0, 0, 'station-map').setOrigin(0);

    for (const area of ROOMS) {
      const cx = ((area.x1 + area.x2 + 1) / 2) * TILE;
      const cy = area.id === 'corridor' ? (area.y2 + 0.55) * TILE : ((area.y1 + area.y2 + 1) / 2) * TILE;
      this.add
        .text(cx, cy, area.name.toUpperCase(), { fontFamily: FONT, fontSize: area.id === 'corridor' ? '20px' : '28px', color: '#ffffff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setAlpha(0.28);
    }
  }

  private touchesFloor(walkable: boolean[][], x: number, y: number): boolean {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (roomAtTile(x + dx, y + dy) || walkable[y + dy]?.[x + dx]) return true;
    return false;
  }

  private createDoors(): void {
    for (const area of ROOMS) {
      const first = area.door[0];
      if (!first) continue;
      const panel = this.add.graphics().setDepth(5);
      const x = first.x * TILE;
      const y = first.y * TILE;
      panel.fillStyle(0x0b1230).fillRect(x, y, TILE * 2, TILE);
      panel.fillStyle(0xff7a1a).fillRect(x + 4, y + 8, TILE * 2 - 8, TILE - 16);
      panel.lineStyle(6, 0x0b1230);
      for (let i = 0; i < 4; i++) panel.lineBetween(x + 8 + i * 28, y + TILE - 10, x + 36 + i * 28, y + 10);
      const label = this.add
        .text(x + TILE, y + TILE / 2, 'LOCKED', { fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold', backgroundColor: '#0b1230', padding: { x: 8, y: 3 } })
        .setOrigin(0.5)
        .setDepth(6);
      this.doors.set(area.id, { panel, label });
    }
  }

  private createEquipment(item: Equipment): EquipmentSprite {
    const cx = (item.x + 0.5) * TILE;
    const cy = (item.y + 0.5) * TILE;
    const body = this.add.graphics();
    body.fillStyle(0x0b1230).fillRoundedRect(cx - 30, cy - 30, 60, 60, 10);
    body.lineStyle(3, 0xf4f7ff).strokeRoundedRect(cx - 30, cy - 30, 60, 60, 10);
    body.fillStyle(0xff7a1a).fillRect(cx - 30, cy + 18, 60, 6);
    const screen = this.add.rectangle(cx, cy - 6, 46, 28, 0x26315f).setStrokeStyle(2, 0x3de0f5);
    this.add.text(cx, cy - 6, item.glyph, { fontFamily: FONT, fontSize: '15px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const below = item.y < ROWS / 2;
    this.add
      .text(cx, cy + (below ? 44 : -44), item.name, { fontFamily: FONT, fontSize: '15px', color: '#ffffff', backgroundColor: '#070b1fcc', padding: { x: 6, y: 2 } })
      .setOrigin(0.5)
      .setDepth(7);

    const markerY = cy + (below ? 82 : -82);
    const alert = this.add
      .container(cx, markerY, [
        this.add.circle(0, 0, 17, 0xff7a1a).setStrokeStyle(3, 0xffffff),
        this.add.text(0, 0, '!', { fontFamily: FONT, fontSize: '24px', color: '#0b1230', fontStyle: 'bold' }).setOrigin(0.5),
      ])
      .setDepth(12)
      .setVisible(false);
    // An arrow pointing at the machine, for the next mission task.
    const tip = below ? -14 : 14;
    const pointer = this.add.graphics();
    pointer.fillStyle(0x3de0f5).fillTriangle(0, tip, 15, -tip, -15, -tip);
    pointer.lineStyle(3, 0xffffff).strokeTriangle(0, tip, 15, -tip, -15, -tip);
    const arrow = this.add.container(cx, markerY, [pointer]).setDepth(12).setVisible(false);

    const sprite: EquipmentSprite = { item, screen, alert, arrow };
    if (item.id === 'growbed') sprite.plants = this.add.graphics().setDepth(7);
    return sprite;
  }

  private drawPlayer(): void {
    const { avatar } = this.bridge.view;
    const suit = hex(suitHex(avatar.suitColor));
    const g = this.playerBody;
    const fx = this.facing.x;
    const fy = this.facing.y;
    g.clear();
    // Backpack sits behind the direction of travel.
    g.fillStyle(0x26315f).fillRoundedRect(-13 - fx * 12, -13 - fy * 12, 26, 26, 6);
    g.fillStyle(suit).fillCircle(0, 0, PLAYER_RADIUS);
    g.lineStyle(3, 0x0b1230).strokeCircle(0, 0, PLAYER_RADIUS);
    if (avatar.accessory === 'stripes') g.fillStyle(0xf4f7ff).fillRect(-3, -PLAYER_RADIUS + 3, 6, PLAYER_RADIUS * 2 - 6);
    g.fillStyle(0xf4f7ff).fillCircle(fx * 4, fy * 4, 14);
    g.lineStyle(2, 0x0b1230).strokeCircle(fx * 4, fy * 4, 14);
    g.fillStyle(hex(visorHex(avatar.visorColor))).fillRoundedRect(fx * 9 - 8, fy * 9 - 6, 16, 12, 5);
    if (avatar.accessory === 'antenna') g.fillStyle(0x3de0f5).fillCircle(-fx * 14, -fy * 14, 5);
    if (avatar.accessory === 'star-badge') g.fillStyle(0xffd54a).fillCircle(-fy * 14, fx * 14, 5);
    if (avatar.accessory === 'headset') g.fillStyle(0xff7a1a).fillCircle(-fy * 15, fx * 15, 5).fillCircle(fy * 15, -fx * 15, 5);
  }

  /** Redraws everything that depends on the simulation, when React says it changed. */
  private applyView(): void {
    const view = this.bridge.view;
    this.seenVersion = this.bridge.viewVersion;
    const locked = new Set(view.lockedRooms);
    this.grid = buildWalkGrid(locked);
    for (const [roomId, door] of this.doors) {
      door.panel.setVisible(locked.has(roomId));
      door.label.setVisible(locked.has(roomId));
    }
    for (const sprite of this.sprites) {
      const { id } = sprite.item;
      const alert = view.alerts.includes(id);
      sprite.alert.setVisible(alert);
      sprite.arrow.setVisible(!alert && view.target === id);
      sprite.screen.setFillStyle(alert ? 0x7a1f1f : view.running.includes(id) ? 0x0d6b78 : 0x26315f);
      if (sprite.plants) {
        const cx = (sprite.item.x + 0.5) * TILE;
        const cy = (sprite.item.y + 0.5) * TILE;
        sprite.plants.clear();
        if (view.cropStage !== 'empty') {
          const size = view.cropStage === 'ready' ? 9 : 5;
          sprite.plants.fillStyle(view.cropStage === 'ready' ? 0x5be3a0 : 0x2f9e6c);
          for (const dx of [-18, 0, 18]) sprite.plants.fillCircle(cx + dx, cy + 26, size);
        }
      }
    }
    this.stormOverlay.setVisible(view.storm);
    this.drawPlayer();
  }

  // ---------- every frame ----------

  private blocked(x: number, y: number): boolean {
    const r = PLAYER_RADIUS - 2;
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r]] as const) {
      if (!this.grid[Math.floor((y + dy) / TILE)]?.[Math.floor((x + dx) / TILE)]) return true;
    }
    return false;
  }

  update(time: number, delta: number): void {
    const bridge = this.bridge;
    if (bridge.viewVersion !== this.seenVersion) this.applyView();

    // Arrow keys and space only belong to the game while it is being played.
    const keyboard = this.input.keyboard!;
    if (bridge.paused === this.capturing) {
      this.capturing = !bridge.paused;
      if (this.capturing) keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');
      else {
        keyboard.clearCaptures();
        keyboard.resetKeys();
      }
    }

    if (bridge.travelTo) {
      const item = EQUIPMENT.find((candidate) => candidate.id === bridge.travelTo);
      bridge.travelTo = null;
      if (item && !bridge.view.lockedRooms.includes(item.room)) {
        const spot = standingSpot(item);
        this.player.setPosition(spot.x, spot.y);
        this.cameras.main.centerOn(spot.x, spot.y);
      }
    }

    if (!bridge.paused) {
      const k = this.keys;
      let dx = bridge.input.x + (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0);
      let dy = bridge.input.y + (k.DOWN.isDown || k.S.isDown ? 1 : 0) - (k.UP.isDown || k.W.isDown ? 1 : 0);
      const length = Math.hypot(dx, dy);
      if (length > 0.15) {
        if (length > 1) {
          dx /= length;
          dy /= length;
        }
        const distance = (SPEED * Math.min(delta, 50)) / 1000;
        const nx = this.player.x + dx * distance;
        const ny = this.player.y + dy * distance;
        // Moving on each axis separately lets the astronaut slide along walls.
        if (!this.blocked(nx, this.player.y)) this.player.x = nx;
        if (!this.blocked(this.player.x, ny)) this.player.y = ny;

        const facing = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
        if (facing.x !== this.facing.x || facing.y !== this.facing.y) {
          this.facing = facing;
          this.drawPlayer();
        }
        this.walkTime += delta;
        if (!bridge.view.reducedMotion) this.playerBody.y = Math.sin(this.walkTime / 70) * 2;
      } else {
        this.playerBody.y = 0;
      }

      if (Phaser.Input.Keyboard.JustDown(k.E) || Phaser.Input.Keyboard.JustDown(k.SPACE) || Phaser.Input.Keyboard.JustDown(k.ENTER)) {
        if (this.nearby) bridge.emit('interact', this.nearby);
      }
    }

    // Report the room and the nearest usable machine.
    const here = roomAtTile(Math.floor(this.player.x / TILE), Math.floor(this.player.y / TILE));
    if (here && here.id !== this.currentRoom) {
      this.currentRoom = here.id;
      bridge.emit('room', here.id);
    }
    let nearest: EquipmentId | null = null;
    let best = REACH;
    for (const { item } of this.sprites) {
      const distance = Math.hypot((item.x + 0.5) * TILE - this.player.x, (item.y + 0.5) * TILE - this.player.y);
      if (distance < best) {
        best = distance;
        nearest = item.id;
      }
    }
    if (nearest !== this.nearby) {
      this.nearby = nearest;
      bridge.emit('nearby', nearest);
    }

    // Markers bob gently; the storm tint pulses.
    if (!bridge.view.reducedMotion) {
      const bob = Math.sin(time / 250) * 4;
      for (const sprite of this.sprites) {
        sprite.alert.list[0] && sprite.alert.setScale(1 + Math.sin(time / 200) * 0.08);
        sprite.arrow.y = (sprite.item.y + 0.5) * TILE + (sprite.item.y < ROWS / 2 ? 82 : -82) + bob;
      }
      if (bridge.view.storm) this.stormOverlay.setAlpha(0.7 + Math.sin(time / 400) * 0.3);
    }
  }
}
