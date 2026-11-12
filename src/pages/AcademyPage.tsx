import { ArrowRight, Check, Hammer, KeyRound } from 'lucide-react';
import { Link } from 'react-router';
import { CURRICULUM } from '../features/academy/curriculum';
import { useAcademyProgress } from '../features/academy/useAcademyProgress';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';

const INTRO =
  "Welcome to the Space Survival Academy! Here is your training path: eight modules, from your first look at space to handling emergencies. I'm still writing the lessons, but you can explore what's coming.";

/** The training path: all eight modules in order, as stops along a route. */
export function AcademyPage() {
  const { completedModuleIds } = useAcademyProgress();

  return (
    <div className="space-y-10">
      <header className="animate-rise space-y-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">NOLA Space Survival Academy</h1>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <NolaMascot mood="excited" size={130} className="shrink-0" />
          <SpeechBubble className="flex-1" readAloudText={INTRO}>
            {INTRO}
          </SpeechBubble>
        </div>
      </header>

      <section aria-labelledby="path-heading">
        <h2 id="path-heading" className="mb-6 text-2xl font-semibold">
          Your training path
        </h2>
        <ol className="relative space-y-6 before:absolute before:bottom-8 before:left-7 before:top-8 before:border-l-4 before:border-dashed before:border-line">
          {CURRICULUM.map((module) => {
            const Icon = module.icon;
            const done = completedModuleIds.includes(module.id);
            return (
              <li key={module.id} className="relative flex gap-3 sm:gap-6">
                <span
                  aria-hidden="true"
                  className={`z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 font-display text-xl font-bold ${
                    done ? 'border-go bg-go text-void' : 'border-line bg-panel text-star'
                  }`}
                >
                  {done ? <Check size={26} /> : module.number}
                </span>

                <Link
                  to={`/academy/${module.id}`}
                  className="group min-w-0 flex-1 rounded-3xl border-2 border-line bg-hull/80 p-4 transition hover:-translate-y-1 hover:border-glow sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-mist">
                      <Icon aria-hidden="true" size={20} className="text-glow" />
                      Module {module.number} · {module.level}
                    </span>
                    {done ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-go px-3 py-1 text-sm font-bold text-go">
                        <Check aria-hidden="true" size={14} /> Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-nola-soft px-3 py-1 text-sm font-bold text-nola-soft">
                        <Hammer aria-hidden="true" size={14} /> Lessons opening soon
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{module.title}</h3>
                  <p className="mt-1 text-lg text-mist">{module.tagline}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-star">
                      <KeyRound aria-hidden="true" size={18} className="text-nola" />
                      Unlocks: {module.unlock.name}
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-glow">
                      Preview
                      <ArrowRight aria-hidden="true" size={18} className="transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
