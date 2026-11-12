import { ArrowLeft, ArrowRight, Hammer, KeyRound } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { buttonClasses } from '../components/Button';
import { CURRICULUM, LESSON_STAGES, findModule } from '../features/academy/curriculum';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';

/** Preview of one Academy module: what it covers and what it unlocks. */
export function ModulePage() {
  const { moduleId } = useParams();
  const module = findModule(moduleId);

  if (!module) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Module not found</h1>
        <p className="text-lg text-mist">That module isn't on the training path.</p>
        <Link to="/academy" className={buttonClasses('secondary')}>
          Back to the Academy
        </Link>
      </div>
    );
  }

  const Icon = module.icon;
  const next = CURRICULUM.find((candidate) => candidate.number === module.number + 1);

  return (
    <div className="animate-rise space-y-8">
      <Link to="/academy" className="inline-flex min-h-11 items-center gap-2 font-semibold text-glow">
        <ArrowLeft aria-hidden="true" size={18} /> All modules
      </Link>

      <header>
        <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-mist">
          <Icon aria-hidden="true" size={20} className="text-glow" />
          Module {module.number} of {CURRICULUM.length} · {module.level}
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{module.title}</h1>
      </header>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <NolaMascot mood="curious" size={130} className="shrink-0" />
        <SpeechBubble className="flex-1" readAloudText={module.nolaIntro}>
          {module.nolaIntro}
        </SpeechBubble>
      </div>

      <p className="flex items-start gap-3 rounded-2xl border-2 border-nola-soft bg-nola/10 px-4 py-3 text-lg font-semibold text-nola-soft">
        <Hammer aria-hidden="true" size={22} className="mt-1 shrink-0" />
        The lessons for this module are still being written. This page shows what they will cover.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border-2 border-line bg-hull/80 p-6">
          <h2 className="text-xl font-semibold">Questions you'll be able to answer</h2>
          <ul className="mt-4 space-y-3">
            {module.questions.map((question) => (
              <li key={question} className="flex gap-3 text-lg">
                <span aria-hidden="true" className="font-display font-bold text-nola">
                  ?
                </span>
                {question}
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border-2 border-line bg-hull/80 p-6">
            <h2 className="text-xl font-semibold">How each lesson works</h2>
            <ol className="mt-4 space-y-3">
              {LESSON_STAGES.map((stage, index) => (
                <li key={stage.name} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-panel font-display font-bold text-glow"
                  >
                    {index + 1}
                  </span>
                  <span>
                    <strong className="font-display text-lg">{stage.name}</strong>
                    <span className="block text-mist">{stage.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-3xl border-2 border-nola bg-hull/80 p-6">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <KeyRound aria-hidden="true" size={22} className="text-nola" />
              Station unlock: {module.unlock.name}
            </h2>
            <p className="mt-2 text-lg text-mist">
              Pass this module's knowledge check and you'll be able to: {module.unlock.description.toLowerCase()}
            </p>
          </section>
        </div>
      </div>

      {next && (
        <Link to={`/academy/${next.id}`} className={buttonClasses('secondary')}>
          Next: {next.title} <ArrowRight aria-hidden="true" size={18} />
        </Link>
      )}
    </div>
  );
}
