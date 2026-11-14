import { useEffect, useState } from 'react';
import type { ScienceCheck } from '../../api/astronaut-science';
import saved from './astronautScience.json';

/**
 * Real findings about astronaut health from NASA's Open Science Data
 * Repository (OSDR), shown as "Astronaut Science" cards. Every card cites
 * its study. The findings and their citations are kept in
 * astronautScience.json (recorded from OSDR); the app also checks them live
 * through /api/astronaut-science, and says which one the player is seeing.
 */

export type ScienceTopic = 'muscle-bone' | 'exercise' | 'sleep' | 'radiation';

export interface Citation {
  accession: string;
  studyTitle: string;
  publicationTitle: string;
  authors: string;
  url: string;
}

export interface Finding {
  id: string;
  topic: ScienceTopic;
  /** The finding in simple words, written from the study's own description. */
  finding: string;
  /** Who or what was studied, for example mice in space or volunteers in bed on Earth. */
  subjects: string;
  note: string | null;
  /** Sentences quoted word for word from the study's OSDR description. */
  quotes: string[];
  citation: Citation;
}

export const SAVED_RECORDED_AT: string = saved.recordedAt;
export const FINDINGS: Finding[] = saved.findings as Finding[];

/** What the player sees: a finding, and whether its citation was checked live today. */
export interface ScienceCard extends Finding {
  checkedLive: boolean;
}

/**
 * Combines the saved findings with a live OSDR check. A study's citation is
 * updated from OSDR only if every quoted sentence is still in its
 * description; otherwise the saved copy is shown, marked as saved.
 */
export function withLiveCheck(check: ScienceCheck | null): ScienceCard[] {
  return FINDINGS.map((finding) => {
    const live = check?.source === 'osdr-live' ? check.studies[finding.citation.accession] : undefined;
    if (!live?.quotesFound) return { ...finding, checkedLive: false };
    return {
      ...finding,
      checkedLive: true,
      citation: { ...finding.citation, studyTitle: live.studyTitle, publicationTitle: live.publicationTitle ?? finding.citation.publicationTitle },
    };
  });
}

/** Checks the server's answer before trusting it. */
export function validateCheck(raw: unknown): ScienceCheck | null {
  const check = raw as Partial<ScienceCheck> | null;
  if (!check || (check.source !== 'osdr-live' && check.source !== 'cache') || typeof check.studies !== 'object' || check.studies === null) return null;
  return check as ScienceCheck;
}

export async function fetchScienceCheck(fetcher: typeof fetch = (...args) => fetch(...args)): Promise<ScienceCheck | null> {
  try {
    const response = await fetcher('/api/astronaut-science', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return null;
    return validateCheck(await response.json());
  } catch {
    return null;
  }
}

let shared: Promise<ScienceCheck | null> | null = null;

/** The science cards: saved ones straight away, updated once the live check answers. */
export function useAstronautScience(): ScienceCard[] {
  const [cards, setCards] = useState<ScienceCard[]>(() => withLiveCheck(null));
  useEffect(() => {
    let cancelled = false;
    shared ??= fetchScienceCheck();
    void shared.then((check) => !cancelled && setCards(withLiveCheck(check)));
    return () => {
      cancelled = true;
    };
  }, []);
  return cards;
}

/** Picks a card on a topic, taking turns so the same one is not shown every time. */
export function pickFinding(cards: readonly ScienceCard[], topic: ScienceTopic, turn: number): ScienceCard | null {
  const onTopic = cards.filter((card) => card.topic === topic);
  return onTopic.length > 0 ? onTopic[((turn % onTopic.length) + onTopic.length) % onTopic.length]! : null;
}
