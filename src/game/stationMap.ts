import type { SystemId } from '../features/unlocks/unlockManager';
import type { FaultId, RoomId } from '../simulation/types';

/**
 * The station layout, as plain data. Both the Phaser scene (to draw and
 * collide) and the React map screen read this file, so they always agree.
 *
 * The station is a grid of square tiles: four rooms along the top, a long
 * corridor through the middle, and four rooms along the bottom.
 */

export const TILE = 64;
export const COLS = 37;
export const ROWS = 19;

export interface Room {
  id: RoomId;
  name: string;
  /** The Academy system that opens this room's door. */
  system: SystemId;
  /** Floor area in tiles (inclusive). */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Floor colour tint. */
  color: number;
  /** The two door tiles joining the room to the corridor. Empty for the corridor. */
  door: { x: number; y: number }[];
}

const ROOM_WIDTH = 8;
const TOP = { y1: 1, y2: 6, doorY: 7 };
const BOTTOM = { y1: 12, y2: 17, doorY: 11 };

function room(id: RoomId, name: string, system: SystemId, slot: number, row: typeof TOP, color: number): Room {
  const x1 = 1 + slot * (ROOM_WIDTH + 1);
  return {
    id,
    name,
    system,
    x1,
    x2: x1 + ROOM_WIDTH - 1,
    y1: row.y1,
    y2: row.y2,
    color,
    door: [
      { x: x1 + 3, y: row.doorY },
      { x: x1 + 4, y: row.doorY },
    ],
  };
}

export const CORRIDOR: Room = { id: 'corridor', name: 'Main Corridor', system: 'station-access', x1: 1, x2: COLS - 2, y1: 8, y2: 10, color: 0x18224a, door: [] };

export const ROOMS: Room[] = [
  room('oxygen', 'Oxygen Control', 'oxygen', 0, TOP, 0x12324a),
  room('hydroponics', 'Hydroponics Lab', 'food', 1, TOP, 0x153a2c),
  room('power', 'Power Bay', 'energy', 2, TOP, 0x3a3215),
  room('comms', 'Comms Room', 'communication', 3, TOP, 0x2a1f4a),
  room('water', 'Water Recycling', 'water', 0, BOTTOM, 0x12284f),
  room('medical', 'Medical Bay', 'station-access', 1, BOTTOM, 0x3a1f2c),
  room('thermal', 'Thermal Control', 'temperature', 2, BOTTOM, 0x3f2616),
  room('shelter', 'Radiation Shelter', 'radiation', 3, BOTTOM, 0x2c2c38),
  CORRIDOR,
];

export type EquipmentId =
  | 'console'
  | 'generator'
  | 'scrubber'
  | 'growbed'
  | 'solar'
  | 'battery'
  | 'antenna'
  | 'recycler'
  | 'pipes'
  | 'medstation'
  | 'thermostat'
  | 'monitor';

export interface Equipment {
  id: EquipmentId;
  name: string;
  /** Short text shown on the machine's screen in the game. */
  glyph: string;
  room: RoomId;
  /** The tile the machine stands on (it blocks movement). */
  x: number;
  y: number;
  /** Faults that are repaired at this machine. */
  faults: FaultId[];
  /** The mission task ids this machine is used for (to show a marker). */
  tasks: string[];
}

export const EQUIPMENT: Equipment[] = [
  { id: 'console', name: 'Command Console', glyph: 'CMD', room: 'corridor', x: 18, y: 8, faults: [], tasks: ['use-console'] },
  { id: 'generator', name: 'Oxygen Generator', glyph: 'O₂', room: 'oxygen', x: 2, y: 1, faults: ['oxygen-generator'], tasks: ['start:oxygenGenerator'] },
  { id: 'scrubber', name: 'CO₂ Scrubber', glyph: 'CO₂', room: 'oxygen', x: 7, y: 1, faults: ['co2-filter'], tasks: ['repair:co2-filter'] },
  { id: 'growbed', name: 'Grow Bed', glyph: 'GROW', room: 'hydroponics', x: 14, y: 1, faults: [], tasks: ['plant', 'harvest'] },
  { id: 'solar', name: 'Solar Control', glyph: 'SUN', room: 'power', x: 20, y: 1, faults: ['panel-drift'], tasks: ['deploy-panels', 'repair:panel-drift'] },
  { id: 'battery', name: 'Battery Bank', glyph: 'BATT', room: 'power', x: 25, y: 1, faults: [], tasks: [] },
  { id: 'antenna', name: 'Antenna Console', glyph: 'COMM', room: 'comms', x: 32, y: 1, faults: ['antenna'], tasks: ['repair:antenna', 'request-supply'] },
  { id: 'recycler', name: 'Water Recycler', glyph: 'H₂O', room: 'water', x: 2, y: 17, faults: [], tasks: ['start:waterRecycler'] },
  { id: 'pipes', name: 'Pipe Junction', glyph: 'PIPE', room: 'water', x: 7, y: 17, faults: ['water-leak'], tasks: ['repair:water-leak'] },
  { id: 'medstation', name: 'Med Station', glyph: 'MED', room: 'medical', x: 14, y: 17, faults: [], tasks: ['heal'] },
  { id: 'thermostat', name: 'Thermal Controller', glyph: 'TEMP', room: 'thermal', x: 23, y: 17, faults: ['thermal-fault'], tasks: ['start:thermalControl', 'repair:thermal-fault'] },
  { id: 'monitor', name: 'Radiation Monitor', glyph: 'RAD', room: 'shelter', x: 32, y: 17, faults: [], tasks: ['check-monitor'] },
];

export const PLAYER_START = { x: 18.5 * TILE, y: 9.8 * TILE };

export function findEquipment(id: EquipmentId): Equipment {
  const found = EQUIPMENT.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown equipment ${id}`);
  return found;
}

export function findRoom(id: RoomId): Room {
  const found = ROOMS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown room ${id}`);
  return found;
}

/** Which room a tile belongs to (door tiles count as their room), or null for walls. */
export function roomAtTile(tx: number, ty: number): Room | null {
  for (const item of ROOMS) {
    if (tx >= item.x1 && tx <= item.x2 && ty >= item.y1 && ty <= item.y2) return item;
    if (item.door.some((door) => door.x === tx && door.y === ty)) return item;
  }
  return null;
}

/**
 * Builds the walkability grid: true where the astronaut can walk.
 * Doors of locked rooms and tiles holding equipment are blocked.
 */
export function buildWalkGrid(lockedRooms: ReadonlySet<RoomId>): boolean[][] {
  const grid: boolean[][] = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
  const open = (x: number, y: number, value: boolean) => {
    const row = grid[y];
    if (row && x >= 0 && x < COLS) row[x] = value;
  };
  for (const item of ROOMS) {
    for (let y = item.y1; y <= item.y2; y++) for (let x = item.x1; x <= item.x2; x++) open(x, y, true);
    for (const door of item.door) open(door.x, door.y, !lockedRooms.has(item.id));
  }
  for (const item of EQUIPMENT) open(item.x, item.y, false);
  return grid;
}

/** A free spot to stand right next to a machine (used by "travel to" and tests). */
export function standingSpot(item: Equipment): { x: number; y: number } {
  const below = item.y < ROWS / 2;
  return { x: (item.x + 0.5) * TILE, y: (item.y + (below ? 1.55 : -0.55)) * TILE };
}
