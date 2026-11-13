import { CURRICULUM } from '../academy/curriculum';

/**
 * The Lesson Unlock Manager.
 *
 * It answers one question: "which station systems has this student earned?"
 * The answer comes entirely from the curriculum table (each module names
 * the system it unlocks), so nothing about individual lessons or rooms is
 * hard-coded here or in the game. Add a module to the curriculum with a
 * new systemId and the game can ask about it straight away.
 */

export const SYSTEM_IDS = [
  'station-access',
  'oxygen',
  'water',
  'food',
  'energy',
  'radiation',
  'temperature',
  'communication',
] as const;

export type SystemId = (typeof SYSTEM_IDS)[number];

export function isSystemId(value: string): value is SystemId {
  return (SYSTEM_IDS as readonly string[]).includes(value);
}

/** The systems unlocked by a set of completed modules, in curriculum order. */
export function getUnlockedSystems(completedModuleIds: readonly string[]): SystemId[] {
  return CURRICULUM.filter((module) => completedModuleIds.includes(module.id))
    .map((module) => module.unlock.systemId)
    .filter(isSystemId);
}

export function isSystemUnlocked(system: SystemId, completedModuleIds: readonly string[]): boolean {
  return getUnlockedSystems(completedModuleIds).includes(system);
}

/** The module a student must pass to unlock a system (for "locked" messages). */
export function moduleForSystem(system: SystemId) {
  return CURRICULUM.find((module) => module.unlock.systemId === system);
}
