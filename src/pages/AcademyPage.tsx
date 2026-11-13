import { ArrowRight, Check, KeyRound, Lock, Play } from 'lucide-react';
import { Link } from 'react-router';
import { useAcademyProgress } from '../features/academy/AcademyProgressContext';
import { CURRICULUM } from '../features/academy/curriculum';
import { moduleStatus, nextModule, type ModuleStatus } from '../features/academy/progress';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';

const STATUS_CHIP: Record<ModuleStatus, { label: string; className: string; icon: typeof Check }> = {
  completed: { label: 'Completed', className: 'border-go text-go', icon: Check },
  'in-progress': { label: 'In progress', className: 'border-nola-soft text-nola-soft', icon: Play },
  available: { label: 'Ready to start', className: 'border-glow text-glow', icon: Play },
  locked: { label: 'Locked', className: 'border-line text-mist', icon: Lock },
};

/** The training path: all eight modules in order, as stops along a route. */
export function AcademyPage() {
  const { progress, completedModuleIds, error } = useAcademyProgress();
  const upNext = nextModule(progress);
  const intro = upNext
    ? completedModuleIds.length === 0
      ? `Welcome to the Space Survival Academy! Eight modules will take you from your first look at space to handling emergencies. Start with Module 1: ${upNext.title}.`
      : `Great progress! You have completed ${completedModuleIds.length} of ${CURRICULUM.length} modules. Next up is ${upNext.title}.`
    : 'You have completed every module. You are an Academy graduate! You can revisit any lesson whenever you like.';

  return (
    <div className="space-y-10">
      <header className="animate-rise space-y-6">
        <h1 className="text-3xl font-semibold sm:text-4xl">NOLA Space Survival Academy</h1>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <NolaMascot mood={upNext ? 'happy' : 'excited'} size={130} className="shrink-0" />
          <SpeechBubble className="flex-1" readAloudText={intro}>
            {intro}
          </SpeechBubble>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-2xl border-2 border-alert bg-alert/10 px-4 py-3 font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      )}

      <section aria-labelledby="path-heading">
        <h2 id="path-heading" className="mb-6 text-2xl font-semibold">
          Your training path
        </h2>
        <ol className="relative space-y-6 before:absolute before:bottom-8 before:left-7 before:top-8 before:border-l-4 before:border-dashed before:border-line">
          {CURRICULUM.map((module) => {
            const Icon = module.icon;
            const status = moduleStatus(module, progress);
            const chip = STATUS_CHIP[status];
            const ChipIcon = chip.icon;
            const record = progress[module.id];
            const locked = status === 'locked';
            return (
              <li key={module.id} className="relative flex gap-3 sm:gap-6">
                <span
                  aria-hidden="true"
                  className={`z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 font-display text-xl font-bold ${
                    status === 'completed' ? 'border-go bg-go text-void' : locked ? 'border-line bg-hull text-mist' : 'border-nola bg-panel text-star'
                  }`}
                >
                  {status === 'completed' ? <Check size={26} /> : locked ? <Lock size={22} /> : module.number}
                </span>

                <Link
                  to={`/academy/${module.id}`}
                  className={`group min-w-0 flex-1 rounded-3xl border-2 bg-hull/80 p-4 transition hover:-translate-y-1 hover:border-glow sm:p-6 ${
                    upNext?.id === module.id ? 'border-nola' : 'border-line'
                  } ${locked ? 'opacity-75' : ''}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-mist">
                      <Icon aria-hidden="true" size={20} className="text-glow" />
                      Module {module.number} · {module.level}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold ${chip.className}`}>
                      <ChipIcon aria-hidden="true" size={14} /> {chip.label}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold">{module.title}</h3>
                  <p className="mt-1 text-lg text-mist">{module.tagline}</p>
                  {record?.bestScore != null && record.quizTotal != null && (
                    <p className="mt-2 font-semibold text-star">
                      Best quiz score: {record.bestScore} out of {record.quizTotal}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 font-semibold text-star">
                      <KeyRound aria-hidden="true" size={18} className="text-nola" />
                      {status === 'completed' ? 'Unlocked' : 'Unlocks'}: {module.unlock.name}
                    </span>
                    <span className="inline-flex items-center gap-2 font-semibold text-glow">
                      {status === 'completed' ? 'Review' : status === 'in-progress' ? 'Continue' : status === 'available' ? 'Start' : 'Preview'}
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
