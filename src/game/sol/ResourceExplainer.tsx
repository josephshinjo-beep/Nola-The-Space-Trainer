import { HelpCircle, MessageCircleQuestion } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { buttonClasses } from '../../components/Button';
import { Modal } from '../../components/ConfirmDialog';
import { ReadAloudButton } from '../../features/accessibility/ReadAloudButton';
import type { Resource } from '../../sol/config';
import type { BodyPart } from '../../sol/types';
import { LINE_LABELS } from './cards';
import { EXPLAINERS, explainerSpeech } from './explainers';

/** A small "?" button that opens the explainer for one resource. */
export function ExplainButton({ resource, className = '' }: { resource: Resource | BodyPart; className?: string }) {
  const [open, setOpen] = useState(false);
  const explainer = EXPLAINERS[resource];
  const Icon = LINE_LABELS[resource].icon;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`What is ${explainer.name}?`}
        className={`pointer-events-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-line text-mist hover:border-glow hover:text-glow ${className}`}
      >
        <HelpCircle aria-hidden="true" size={16} />
      </button>
      <Modal open={open} title={explainer.name} onClose={() => setOpen(false)}>
        <div className="space-y-3 text-lg">
          <p className="flex items-start gap-3">
            <Icon aria-hidden="true" size={28} className="shrink-0 text-glow" />
            <span>{explainer.whatItIs}</span>
          </p>
          <p>{explainer.whyItMatters}</p>
          <p className="rounded-2xl border-2 border-line bg-void/50 p-3 text-base">
            <span className="mr-2 inline-block rounded-full bg-nola-soft px-3 py-0.5 text-sm font-bold text-void">In the game</span>
            {explainer.inTheGame}
          </p>
          <p className="rounded-2xl border-2 border-line bg-void/50 p-3 text-base">
            <span className="mr-2 inline-block rounded-full bg-glow px-3 py-0.5 text-sm font-bold text-void">Real science</span>
            {explainer.realScience}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ReadAloudButton text={explainerSpeech(explainer)} tone="dark" />
            <Link to={`/companion?ask=${encodeURIComponent(explainer.askNola)}`} className={buttonClasses('secondary')}>
              <MessageCircleQuestion aria-hidden="true" size={18} /> Ask NOLA: “{explainer.askNola}”
            </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
