import type { LucideIcon } from 'lucide-react';

/**
 * The shape of a lesson. Each Academy module has one lesson file in
 * ./content that fills in this shape; the lesson player turns it into the
 * six stages (Introduce, Learn, Explore, Knowledge Check, Mission
 * Challenge, Unlock). Adding a lesson means adding data, not new screens.
 */

/** How settled the science is. Shown as a label so facts and ideas are never mixed up. */
export type FactKind = 'today' | 'research' | 'future';

export interface LearnCard {
  /** The question this card answers. */
  title: string;
  text: string;
  icon: LucideIcon;
  fact?: { kind: FactKind; text: string };
  /** Extra words students might use when asking NOLA about this card. */
  keywords?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  explanation: string;
}

/** Put each statement in the right group. */
export interface SortActivity {
  kind: 'sort';
  title: string;
  instructions: string;
  bins: { id: string; label: string }[];
  items: { text: string; bin: string; why: string }[];
}

/** Put the steps of a process in the right order. */
export interface SequenceActivity {
  kind: 'sequence';
  title: string;
  instructions: string;
  /** The steps in their correct order. */
  steps: string[];
  success: string;
}

export interface SliderReadout {
  label: string;
  value: string;
  /** Bar fill from 0 to 1. */
  level: number;
  status: 'good' | 'warn' | 'bad';
}

/** Move the controls of a simple model until the goal is met. */
export interface SliderActivity {
  kind: 'slider';
  title: string;
  instructions: string;
  goal: string;
  sliders: { id: string; label: string; min: number; max: number; step: number; initial: number; unit: string }[];
  compute: (values: Record<string, number>) => { readouts: SliderReadout[]; success: boolean; message: string };
  /** Says honestly how the model is simplified. */
  modelNote: string;
}

export type ExploreActivity = SortActivity | SequenceActivity | SliderActivity;

export interface ChallengeStep {
  prompt: string;
  options: { text: string; correct: boolean; feedback: string }[];
}

export interface Lesson {
  moduleId: string;
  /** NOLA's opening lines, shown one at a time. */
  intro: string[];
  cards: LearnCard[];
  explore: ExploreActivity;
  quiz: QuizQuestion[];
  challenge: {
    title: string;
    scenario: string;
    steps: ChallengeStep[];
    success: string;
  };
}
