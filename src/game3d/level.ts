/**
 * Which blocks make up the 3D station's walls, and how tall each one is.
 * Pure functions over the tile grid, so they are unit-tested.
 *
 * Rooms are cut away on the sides that face the camera: a wall block that
 * stands between the camera and some floor is LOW, so the room behind it is
 * always visible. Blocks behind the floor are TALL back walls; they can never
 * hide the floor, because the floor is in front of them.
 */

export const LOW_WALL = 1.2;
export const TALL_WALL = 2.4;
/** Opacity of a block that is hiding the astronaut. */
export const FADED_OPACITY = 0.25;

export type IsFloor = (x: number, y: number) => boolean;

/** Every non-floor tile that touches the floor (including diagonally). These become wall blocks. */
export function wallTiles(cols: number, rows: number, isFloor: IsFloor): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  for (let y = -1; y <= rows; y++) {
    for (let x = -1; x <= cols; x++) {
      if (isFloor(x, y)) continue;
      let touches = false;
      for (let dy = -1; dy <= 1 && !touches; dy++) for (let dx = -1; dx <= 1 && !touches; dx++) if ((dx || dy) && isFloor(x + dx, y + dy)) touches = true;
      if (touches) tiles.push({ x, y });
    }
  }
  return tiles;
}

/**
 * The camera's side of the map, as a sign on each axis (+1 or -1). With
 * the default offset (6, 10, 6) the camera is on the +x, +z side.
 */
export const cameraSide = (offsetX: number, offsetZ: number) => ({ sx: offsetX >= 0 ? 1 : -1, sz: offsetZ >= 0 ? 1 : -1 });

/**
 * A wall block is in front of the floor (between it and the camera) when
 * there is floor directly behind it, seen from the camera's side.
 */
export function isFrontWall(x: number, y: number, isFloor: IsFloor, sx: number, sz: number): boolean {
  return isFloor(x - sx, y) || isFloor(x, y - sz) || isFloor(x - sx, y - sz);
}

/** The height a wall block should have for the camera's side. */
export const wallHeight = (x: number, y: number, isFloor: IsFloor, sx: number, sz: number) => (isFrontWall(x, y, isFloor, sx, sz) ? LOW_WALL : TALL_WALL);

/** Floor tile edges that border a wall: where the raised walkway edges go. */
export function edgeLips(cols: number, rows: number, isFloor: IsFloor): { x: number; y: number; side: 'n' | 's' | 'e' | 'w' }[] {
  const lips: { x: number; y: number; side: 'n' | 's' | 'e' | 'w' }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isFloor(x, y)) continue;
      if (!isFloor(x, y - 1)) lips.push({ x, y, side: 'n' });
      if (!isFloor(x, y + 1)) lips.push({ x, y, side: 's' });
      if (!isFloor(x - 1, y)) lips.push({ x, y, side: 'w' });
      if (!isFloor(x + 1, y)) lips.push({ x, y, side: 'e' });
    }
  }
  return lips;
}
