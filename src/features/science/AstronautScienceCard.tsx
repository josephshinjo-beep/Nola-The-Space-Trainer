import { ExternalLink, Microscope } from 'lucide-react';
import { SAVED_RECORDED_AT, type ScienceCard, type ScienceTopic } from '../../data/astronautScience';

const TOPIC_NAMES: Record<ScienceTopic, string> = {
  'muscle-bone': 'Muscles and bones',
  exercise: 'Exercise',
  sleep: 'Body clock and rest',
  radiation: 'Space radiation',
};

const savedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(SAVED_RECORDED_AT));

/**
 * A real finding about astronaut health, always with its study cited.
 * `compact` leaves out the quoted sentence, for small spaces like the HUD.
 */
export function AstronautScienceCard({ card, compact = false }: { card: ScienceCard; compact?: boolean }) {
  const { citation } = card;
  return (
    <article aria-label={`Astronaut Science: ${TOPIC_NAMES[card.topic]}`} className="rounded-2xl border-2 border-glow bg-void/70 p-3 text-left">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-glow">
        <Microscope aria-hidden="true" size={16} /> Astronaut Science · {TOPIC_NAMES[card.topic]}
      </p>
      <p className="mt-2 text-base font-semibold">{card.finding}</p>
      <p className="mt-1 text-sm text-mist">
        <strong className="text-star">Who was studied:</strong> {card.subjects}
      </p>
      {card.note && <p className="mt-1 text-sm text-mist">{card.note}</p>}
      {!compact && (
        <blockquote className="mt-2 border-l-4 border-line pl-3 text-sm italic text-mist">
          {card.quotes.map((quote) => `“${quote}”`).join(' … ')}
        </blockquote>
      )}
      <p className="mt-2 text-xs text-mist">
        <span className="font-bold text-star">Study:</span> {citation.authors}, “{citation.publicationTitle.replace(/\.$/, '')}”.{' '}
        <a href={citation.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-nola-soft underline">
          NASA OSDR {citation.accession} <ExternalLink aria-hidden="true" size={12} />
        </a>
      </p>
      <p className="mt-1 text-xs text-mist">{card.checkedLive ? 'Checked live with NASA OSDR today.' : `Saved copy from NASA OSDR, recorded ${savedDate}.`}</p>
    </article>
  );
}
