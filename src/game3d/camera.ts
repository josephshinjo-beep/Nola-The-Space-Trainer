/**
 * Camera and movement maths for the 3D station: a fixed high-angle diagonal
 * view that follows the astronaut. Pure functions, so they are unit-tested.
 *
 * World axes: x = map columns, z = map rows, y = up. One tile = 1 unit.
 */

/** Camera offset from the player at yaw 0: about 50 degrees down, 45 degrees around Y. */
export const CAMERA_OFFSET = { x: 6, y: 10, z: 6 } as const;
export const CAMERA_FOV = 35;
/** Follow lag in seconds (exponential smoothing time constant). */
export const FOLLOW_LAG = 0.12;
/** How far ahead of the astronaut the camera looks, in the direction of movement. */
export const LOOK_LEAD = 0.6;
/** Q/E snap rotation: 90 degrees, eased over this many seconds. */
export const SNAP_SECONDS = 0.35;

export interface Vec2 {
  x: number;
  z: number;
}

/** The camera offset rotated around Y by `yaw` (radians). */
export function cameraOffset(yaw: number): { x: number; y: number; z: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: CAMERA_OFFSET.x * c + CAMERA_OFFSET.z * s, y: CAMERA_OFFSET.y, z: -CAMERA_OFFSET.x * s + CAMERA_OFFSET.z * c };
}

/** Pitch of the camera (degrees below horizontal), for checking the look. */
export function cameraPitchDegrees(): number {
  return (Math.atan2(CAMERA_OFFSET.y, Math.hypot(CAMERA_OFFSET.x, CAMERA_OFFSET.z)) * 180) / Math.PI;
}

/** "Up the screen" and "right on the screen" as ground directions, for the camera's yaw. */
export function screenAxes(yaw: number): { forward: Vec2; right: Vec2 } {
  const offset = cameraOffset(yaw);
  const length = Math.hypot(offset.x, offset.z);
  const forward = { x: -offset.x / length, z: -offset.z / length };
  // Screen right is forward × up, projected on the ground.
  return { forward, right: { x: -forward.z, z: forward.x } };
}

/**
 * Turns key or stick input (x: right, y: up the screen, each -1..1) into a
 * ground direction. Diagonals are normalised, so moving diagonally is not faster.
 */
export function screenToWorld(inputX: number, inputY: number, yaw: number): Vec2 {
  const { forward, right } = screenAxes(yaw);
  let x = right.x * inputX + forward.x * inputY;
  let z = right.z * inputX + forward.z * inputY;
  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  return { x, z };
}

/** Share of the remaining distance to cover this frame, for smoothing that does not depend on frame rate. */
export const damp = (dt: number, lag: number) => 1 - Math.exp(-dt / lag);

/** Shortest signed difference between two angles (radians). */
export function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Smooth ease in and out (0..1 → 0..1). */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** A 90-degree yaw snap in progress. */
export interface YawSnap {
  from: number;
  to: number;
  elapsed: number;
}

/** The yaw during a snap, and whether the snap has finished. */
export function snapYaw(snap: YawSnap): { yaw: number; done: boolean } {
  const t = Math.min(1, snap.elapsed / SNAP_SECONDS);
  return { yaw: snap.from + (snap.to - snap.from) * easeInOut(t), done: t >= 1 };
}
