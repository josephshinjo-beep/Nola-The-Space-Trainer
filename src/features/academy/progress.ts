import { CURRICULUM, type AcademyModule } from './curriculum';

/**
 * Rules for Academy progress. Pure functions with no database or screen
 * code, so they are easy to test.
 */

/** A student's saved progress on one module (users/{uid}/academy/{moduleId}). */
export interface ModuleProgress {
  /** The furthest lesson stage reached (0 = NOLA Introduces ... 5 = Unlock). */
  stage: number;
  quizPassed: boolean;
  challengeDone: boolean;
  /** True once the quiz is passed and the mission challenge is solved. */
  completed: boolean;
  /** Scores are the number of correct answers. */
  bestScore: number | null;
  lastScore: number | null;
  quizTotal: number | null;
  attempts: number;
  completedAt: Date | null;
}

export type ProgressMap = Record<string, ModuleProgress>;

export const EMPTY_PROGRESS: ModuleProgress = {
  stage: 0,
  quizPassed: false,
  challengeDone: false,
  completed: false,
  bestScore: null,
  lastScore: null,
  quizTotal: null,
  attempts: 0,
  completedAt: null,
};

/** Fraction of quiz answers that must be right to pass. */
export const PASS_MARK = 0.8;

export function isQuizPass(correct: number, total: number): boolean {
  return total > 0 && correct / total >= PASS_MARK;
}

export type ModuleStatus = 'locked' | 'available' | 'in-progress' | 'completed';

/**
 * Modules open in order: the first is always available, and each later
 * one opens when the module before it is completed.
 */
export function moduleStatus(module: AcademyModule, progress: ProgressMap): ModuleStatus {
  const own = progress[module.id];
  if (own?.completed) return 'completed';
  const previous = CURRICULUM.find((candidate) => candidate.number === module.number - 1);
  if (previous && !progress[previous.id]?.completed) return 'locked';
  return own && (own.stage > 0 || own.attempts > 0) ? 'in-progress' : 'available';
}

export function completedModuleIds(progress: ProgressMap): string[] {
  return CURRICULUM.filter((module) => progress[module.id]?.completed).map((module) => module.id);
}

/** The module the student should work on next, or undefined when all are done. */
export function nextModule(progress: ProgressMap): AcademyModule | undefined {
  return CURRICULUM.find((module) => !progress[module.id]?.completed);
}
