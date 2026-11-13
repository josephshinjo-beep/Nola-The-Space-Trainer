import type { Lesson } from '../lessonTypes';

/**
 * Lessons are loaded only when a student opens them, so the eight lesson
 * files do not slow down the first page load. To add a lesson: create a
 * file in this folder and add one line here, keyed by the module id.
 */
const LOADERS: Record<string, () => Promise<{ lesson: Lesson }>> = {
  'understanding-space': () => import('./understanding-space'),
  'oxygen-and-breathing': () => import('./oxygen-and-breathing'),
  'water-and-recycling': () => import('./water-and-recycling'),
  'food-and-agriculture': () => import('./food-and-agriculture'),
  'energy-and-electricity': () => import('./energy-and-electricity'),
  'radiation-protection': () => import('./radiation-protection'),
  'temperature-and-life-support': () => import('./temperature-and-life-support'),
  'communication-and-emergencies': () => import('./communication-and-emergencies'),
};

export const LESSON_MODULE_IDS = Object.keys(LOADERS);

export async function loadLesson(moduleId: string): Promise<Lesson> {
  const loader = LOADERS[moduleId];
  if (!loader) throw new Error(`No lesson exists for module "${moduleId}".`);
  return (await loader()).lesson;
}
