/**
 * Which Academy modules the student has passed.
 *
 * Lessons do not exist yet, so nothing can be completed and this always
 * reports an empty list. Batch 2 replaces the body with a live read of
 * users/{uid}/academy; pages that call this hook will not need to change.
 */
export interface AcademyProgress {
  completedModuleIds: string[];
}

const NOTHING_COMPLETED: AcademyProgress = { completedModuleIds: [] };

export function useAcademyProgress(): AcademyProgress {
  return NOTHING_COMPLETED;
}
