import { describe, expect, it } from 'vitest';
import { COLS, roomAtTile, ROWS } from '../game/stationMap';
import { edgeLips, isFrontWall, LOW_WALL, TALL_WALL, wallHeight, wallTiles, cameraSide } from './level';
import { cameraOffset } from './camera';

const isFloor = (x: number, y: number) => roomAtTile(x, y) !== null;

describe('the 3D station walls', () => {
  const walls = wallTiles(COLS, ROWS, isFloor);

  it('surround every floor tile, and never stand on the floor', () => {
    expect(walls.length).toBeGreaterThan(100);
    for (const wall of walls) expect(isFloor(wall.x, wall.y)).toBe(false);
    // Every floor tile next to a non-floor tile has a wall block there.
    const has = new Set(walls.map((w) => `${w.x},${w.y}`));
    const missing: string[] = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (isFloor(x, y) && !isFloor(x, y - 1) && !has.has(`${x},${y - 1}`)) missing.push(`${x},${y - 1}`);
    expect(missing).toEqual([]);
  });

  it('are low on the camera side, so every room is open toward the camera', () => {
    const { sx, sz } = cameraSide(cameraOffset(0).x, cameraOffset(0).z);
    expect({ sx, sz }).toEqual({ sx: 1, sz: 1 });
    // The camera is on the +x, +z side: the bottom outer wall (row 18) faces it and is low.
    expect(wallHeight(5, 18, isFloor, sx, sz)).toBe(LOW_WALL);
    // The top outer wall (row 0) is behind the rooms: tall, and it hides no floor.
    expect(wallHeight(5, 0, isFloor, sx, sz)).toBe(TALL_WALL);
    // The wall between the top rooms and the corridor has room floor behind it: low.
    expect(wallHeight(2, 7, isFloor, sx, sz)).toBe(LOW_WALL);
  });

  it('never puts a tall wall in front of floor, from any of the four camera angles', () => {
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const offset = cameraOffset(yaw);
      const { sx, sz } = cameraSide(offset.x, offset.z);
      for (const wall of walls) {
        if (wallHeight(wall.x, wall.y, isFloor, sx, sz) !== TALL_WALL) continue;
        // A tall wall has no floor directly behind it as seen from the camera.
        expect(isFrontWall(wall.x, wall.y, isFloor, sx, sz), `yaw ${yaw} wall ${wall.x},${wall.y}`).toBe(false);
      }
    }
  });

  it('swap low and tall when the camera turns to the other side', () => {
    expect(wallHeight(5, 0, isFloor, -1, -1)).toBe(LOW_WALL);
    expect(wallHeight(5, 18, isFloor, -1, -1)).toBe(TALL_WALL);
  });

  it('put raised edges along the walkways', () => {
    const lips = edgeLips(COLS, ROWS, isFloor);
    expect(lips.some((lip) => lip.y === 8 && lip.side === 'n')).toBe(true);
    for (const lip of lips) expect(isFloor(lip.x, lip.y)).toBe(true);
  });
});
