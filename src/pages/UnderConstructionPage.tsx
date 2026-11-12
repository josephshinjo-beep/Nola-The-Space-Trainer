import { Link } from 'react-router';
import { buttonClasses } from '../components/Button';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';

interface UnderConstructionPageProps {
  title: string;
  /** What NOLA says about this module. */
  message: string;
  /** The features planned for this module. */
  planned: string[];
}

/**
 * Honest stand-in for a module that has not been built yet.
 * It says so plainly rather than pretending to work.
 */
export function UnderConstructionPage({ title, message, planned }: UnderConstructionPageProps) {
  return (
    <div className="animate-rise space-y-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <NolaMascot mood="curious" size={130} className="shrink-0" />
        <SpeechBubble className="flex-1">{message}</SpeechBubble>
      </div>

      <section className="rounded-3xl border-2 border-dashed border-line bg-hull/60 p-6">
        <h2 className="text-xl font-semibold">Coming to this module</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-lg text-mist">
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <Link to="/" className={buttonClasses('secondary')}>
        Back to Mission Control
      </Link>
    </div>
  );
}
