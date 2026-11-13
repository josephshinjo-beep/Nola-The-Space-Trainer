import { ArrowRight, Check, Lock, Palette, Rocket } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClasses } from '../components/Button';
import { CURRICULUM } from '../features/academy/curriculum';
import { useAcademyProgress } from '../features/academy/AcademyProgressContext';
import { moduleStatus } from '../features/academy/progress';
import { useAuth } from '../features/auth/AuthContext';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';
import { AstronautAvatar } from '../features/profile/AstronautAvatar';
import { DEFAULT_AVATAR } from '../features/profile/avatarOptions';

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function MissionControlPage() {
  const { profile, profileError } = useAuth();
  const { progress, completedModuleIds } = useAcademyProgress();

  const name = profile?.displayName;
  const greeting = name ? `${timeOfDayGreeting()}, ${name}!` : `${timeOfDayGreeting()}!`;

  const total = CURRICULUM.length;
  const completed = CURRICULUM.filter((module) => completedModuleIds.includes(module.id)).length;
  const nextModule = CURRICULUM.find((module) => !completedModuleIds.includes(module.id));
  const inProgress = nextModule ? moduleStatus(nextModule, progress) === 'in-progress' : false;
  const message =
    completed === 0
      ? 'Welcome to Mission Control. Your station is waiting, but its systems are switched off. Each Academy module you pass will bring one online.'
      : nextModule
        ? `You have brought ${completed} of ${total} station systems online. Next up in the Academy: ${nextModule.title}.`
        : 'Every station system is online and you are an Academy graduate. Your station needs its commander!';

  return (
    <div className="space-y-10">
      <section className="animate-rise flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <NolaMascot waving size={160} className="shrink-0" />
        <SpeechBubble pointer="left" className="flex-1" readAloudText={`${greeting} ${message}`}>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{greeting}</h1>
          <p className="mt-2">{message}</p>
        </SpeechBubble>
      </section>

      {profileError && (
        <p role="alert" className="rounded-2xl border-2 border-alert bg-alert/10 px-4 py-3 font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          {profileError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Crew card */}
        <section aria-label="Your astronaut" className="flex flex-col items-center rounded-3xl border-2 border-line bg-hull/80 p-6 text-center">
          <AstronautAvatar avatar={profile?.avatar ?? DEFAULT_AVATAR} size={120} />
          <p className="mt-3 break-words font-display text-2xl font-semibold">{name ?? '…'}</p>
          <p className="font-bold uppercase tracking-widest text-glow">Space Cadet</p>
          <Link to="/profile" className={buttonClasses('secondary', 'mt-4 text-base')}>
            <Palette aria-hidden="true" size={18} /> Customise
          </Link>
        </section>

        {/* Training progress */}
        <section aria-labelledby="training-heading" className="rounded-3xl border-2 border-line bg-hull/80 p-6">
          <h2 id="training-heading" className="text-2xl font-semibold">
            Your training
          </h2>
          <p className="mt-1 text-lg text-mist">
            {completed} of {total} modules completed
          </p>
          <div
            role="progressbar"
            aria-label="Academy modules completed"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completed}
            className="mt-3 flex gap-1.5"
          >
            {CURRICULUM.map((module) => (
              <span
                key={module.id}
                className={`h-4 flex-1 rounded-full border-2 ${
                  completedModuleIds.includes(module.id) ? 'border-go bg-go' : 'border-line bg-void/60'
                }`}
              />
            ))}
          </div>

          {nextModule && (
            <div className="mt-6 rounded-2xl border-2 border-line bg-void/40 p-4">
              <p className="text-sm font-bold uppercase tracking-widest text-mist">Next up · Module {nextModule.number}</p>
              <p className="mt-1 font-display text-xl font-semibold">{nextModule.title}</p>
              <p className="text-mist">{nextModule.tagline}</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            {nextModule ? (
              <Link to={`/academy/${nextModule.id}/lesson`} className={buttonClasses('primary')}>
                {inProgress ? 'Continue learning' : 'Start learning'} <ArrowRight aria-hidden="true" size={20} />
              </Link>
            ) : (
              <Link to="/academy" className={buttonClasses('primary')}>
                Review your lessons <ArrowRight aria-hidden="true" size={20} />
              </Link>
            )}
            {completed > 0 && (
              <Link to="/mission" className={buttonClasses('secondary')}>
                <Rocket aria-hidden="true" size={20} /> Go to your station
              </Link>
            )}
          </div>
        </section>
      </div>

      {/* Station systems */}
      <section aria-labelledby="systems-heading">
        <h2 id="systems-heading" className="text-2xl font-semibold">
          Station systems
        </h2>
        <p className="mb-4 mt-1 text-lg text-mist">Learn it in the Academy, then run it on your station.</p>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CURRICULUM.map((module) => {
            const Icon = module.icon;
            const online = completedModuleIds.includes(module.id);
            return (
              <li
                key={module.id}
                className={`flex items-center gap-3 rounded-2xl border-2 p-4 ${online ? 'border-go bg-go/10' : 'border-line bg-hull/60'}`}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-panel ${online ? 'text-go' : 'text-mist'}`}>
                  <Icon aria-hidden="true" size={26} />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-lg font-medium leading-tight">{module.unlock.name}</span>
                  <span className={`mt-0.5 inline-flex items-center gap-1.5 text-sm font-bold ${online ? 'text-go' : 'text-mist'}`}>
                    {online ? <Check aria-hidden="true" size={14} /> : <Lock aria-hidden="true" size={14} />}
                    {online ? 'Online' : `Locked · Module ${module.number}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
