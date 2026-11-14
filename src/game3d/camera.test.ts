import { describe, expect, it } from 'vitest';
import { angleDelta, cameraOffset, cameraPitchDegrees, damp, FOLLOW_LAG, screenToWorld, snapYaw } from './camera';

describe('the 3D camera', () => {
  it('looks down at about 50 degrees from a 45-degree diagonal', () => {
    expect(cameraPitchDegrees()).toBeCloseTo(49.7, 0);
    const offset = cameraOffset(0);
    expect(offset).toEqual({ x: 6, y: 10, z: 6 });
    expect(Math.atan2(offset.x, offset.z)).toBeCloseTo(Math.PI / 4);
  });

  it('rotates the offset around Y and keeps its height and distance', () => {
    const turned = cameraOffset(Math.PI / 2);
    expect(turned.y).toBe(10);
    expect(Math.hypot(turned.x, turned.z)).toBeCloseTo(Math.hypot(6, 6));
    expect(turned.x).toBeCloseTo(6);
    expect(turned.z).toBeCloseTo(-6);
  });

  it('smooths the same amount per second at any frame rate', () => {
    // Two frames at 60 fps cover the same share as one frame at 30 fps.
    const twoFast = 1 - (1 - damp(1 / 60, FOLLOW_LAG)) ** 2;
    expect(twoFast).toBeCloseTo(damp(1 / 30, FOLLOW_LAG));
    // After one lag period, about 63% of the gap is closed.
    expect(damp(FOLLOW_LAG, FOLLOW_LAG)).toBeCloseTo(0.632, 2);
  });

  it('eases a Q/E snap from start to finish', () => {
    expect(snapYaw({ from: 0, to: Math.PI / 2, elapsed: 0 }).yaw).toBe(0);
    expect(snapYaw({ from: 0, to: Math.PI / 2, elapsed: 10 })).toEqual({ yaw: Math.PI / 2, done: true });
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
  });
});

describe('screen-relative movement', () => {
  it('W moves up the screen, which is diagonal in the world', () => {
    const up = screenToWorld(0, 1, 0);
    expect(up.x).toBeCloseTo(-Math.SQRT1_2);
    expect(up.z).toBeCloseTo(-Math.SQRT1_2);
  });

  it('D moves right on the screen, at right angles to W', () => {
    const right = screenToWorld(1, 0, 0);
    const up = screenToWorld(0, 1, 0);
    expect(right.x * up.x + right.z * up.z).toBeCloseTo(0);
    expect(right.x).toBeCloseTo(Math.SQRT1_2);
    expect(right.z).toBeCloseTo(-Math.SQRT1_2);
  });

  it('normalises diagonals so they are not faster', () => {
    const diagonal = screenToWorld(1, 1, 0);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(1);
  });

  it('follows the camera when it is rotated', () => {
    const up = screenToWorld(0, 1, Math.PI / 2);
    const offset = cameraOffset(Math.PI / 2);
    // Up the screen always points away from the camera.
    expect(up.x * offset.x + up.z * offset.z).toBeLessThan(0);
  });
});
