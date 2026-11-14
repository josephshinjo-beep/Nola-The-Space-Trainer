import { Award, Crown, Flag, Medal, ShieldCheck, Sprout, Star, Sunrise, Wrench, type LucideIcon } from 'lucide-react';
import { CURRICULUM } from './curriculum';
import type { ProgressMap } from './progress';

/**
 * Achievements are worked out from what the student has actually done
 * (saved lesson progress and saved station stats). Nothing is stored
 * separately, so a badge can never disagree with the real record.
 */

/** The few station numbers that achievements care about. */
export interface StationStats {
  missionsCompleted: number;
  daysSurvived: number;
  stormsSheltered: number;
  harvests: number;
  repairs: number;
  /** Problems fixed with Mission Control's reply, and on the crew's own training. */
  askedEarthFixes?: number;
  trainingFixes?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  earned: boolean;
}

export function computeAchievements(progress: ProgressMap, station: StationStats | null): Achievement[] {
  const completed = CURRICULUM.filter((module) => progress[module.id]?.completed);
  const perfect = CURRICULUM.some((module) => {
    const record = progress[module.id];
    return record?.bestScore != null && record.quizTotal != null && record.bestScore === record.quizTotal;
  });
  const firstTry = CURRICULUM.some((module) => progress[module.id]?.completed && progress[module.id]?.attempts === 1);

  return [
    { id: 'first-steps', title: 'First Steps', description: 'Complete your first Academy module.', icon: Flag, earned: completed.length >= 1 },
    { id: 'halfway', title: 'Halfway to Orbit', description: 'Complete four Academy modules.', icon: Medal, earned: completed.length >= 4 },
    { id: 'graduate', title: 'Academy Graduate', description: 'Complete all eight Academy modules.', icon: Crown, earned: completed.length >= CURRICULUM.length },
    { id: 'perfect', title: 'Perfect Score', description: 'Get every question right in a knowledge check.', icon: Star, earned: perfect },
    { id: 'first-try', title: 'Sharp Mind', description: 'Pass a knowledge check on your first attempt.', icon: Award, earned: firstTry },
    { id: 'first-mission', title: 'Mission Accomplished', description: 'Complete your first station mission.', icon: ShieldCheck, earned: (station?.missionsCompleted ?? 0) >= 1 },
    { id: 'farmer', title: 'Space Farmer', description: 'Harvest a crop on your station.', icon: Sprout, earned: (station?.harvests ?? 0) >= 1 },
    { id: 'engineer', title: 'Fix-It Engineer', description: 'Repair three station faults.', icon: Wrench, earned: (station?.repairs ?? 0) >= 3 },
    { id: 'storm', title: 'Storm Rider', description: 'Shelter safely through a solar storm.', icon: ShieldCheck, earned: (station?.stormsSheltered ?? 0) >= 1 },
    { id: 'survivor', title: 'Three Sunrises', description: 'Keep your station running for three station days.', icon: Sunrise, earned: (station?.daysSurvived ?? 0) >= 3 },
  ];
}
