import { DEFAULT_AVATAR, type AvatarConfig } from '../features/profile/avatarOptions';
import type { RoomId } from '../simulation/types';
import type { EquipmentId } from './stationMap';

/**
 * The one connection between React and the Phaser game.
 *
 * React writes what the game should SHOW (which doors are locked, which
 * machines need attention, the joystick direction). Phaser reports what
 * the player DID (walked into a room, stood near a machine, pressed
 * "use"). Neither side reaches into the other, and the game never
 * calculates anything about the simulation itself.
 */

interface BridgeEvents {
  /** The machine the astronaut is close enough to use, or null. */
  nearby: EquipmentId | null;
  /** The player pressed the use key next to a machine. */
  interact: EquipmentId;
  /** The astronaut walked into a different room. */
  room: RoomId;
}

type Listener<K extends keyof BridgeEvents> = (value: BridgeEvents[K]) => void;

/** What the scene should draw. React replaces this whenever the simulation changes. */
export interface GameView {
  lockedRooms: RoomId[];
  /** Machines with a fault to fix (shown with a warning marker). */
  alerts: EquipmentId[];
  /** The machine for the next mission task (shown with an arrow). */
  target: EquipmentId | null;
  /** Machines that are switched on and working. */
  running: EquipmentId[];
  cropStage: 'empty' | 'growing' | 'ready';
  storm: boolean;
  avatar: AvatarConfig;
  reducedMotion: boolean;
}

export class GameBridge {
  /** Movement from the on-screen joystick, each axis from -1 to 1. */
  input = { x: 0, y: 0 };
  /** While true the astronaut stands still (a panel or menu is open). */
  paused = false;
  /** Set by React to move the astronaut next to a machine; cleared by the scene. */
  travelTo: EquipmentId | null = null;

  view: GameView = {
    lockedRooms: [],
    alerts: [],
    target: null,
    running: [],
    cropStage: 'empty',
    storm: false,
    avatar: DEFAULT_AVATAR,
    reducedMotion: false,
  };
  /** Goes up every time `view` changes, so the scene knows to redraw. */
  viewVersion = 0;

  private listeners: { [K in keyof BridgeEvents]: Set<Listener<K>> } = {
    nearby: new Set(),
    interact: new Set(),
    room: new Set(),
  };

  setView(view: GameView): void {
    this.view = view;
    this.viewVersion += 1;
  }

  on<K extends keyof BridgeEvents>(event: K, listener: Listener<K>): () => void {
    this.listeners[event].add(listener);
    return () => this.listeners[event].delete(listener);
  }

  emit<K extends keyof BridgeEvents>(event: K, value: BridgeEvents[K]): void {
    for (const listener of this.listeners[event]) listener(value);
  }
}
