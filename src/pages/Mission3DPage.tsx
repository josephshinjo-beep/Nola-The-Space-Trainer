import { MissionGame } from './MissionPage';

/**
 * /mission3d: the full station game in 3D, from a fixed high-angle diagonal
 * camera. Missions, tasks, sol plans, storms and saves are shared with the
 * 2D game, so players can switch between the two at any time.
 */
export default function Mission3DPage() {
  return <MissionGame mode="3d" />;
}
