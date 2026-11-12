import { ArrowRight, Hammer } from 'lucide-react';
import { Link } from 'react-router';
import { NAV_ITEMS } from '../app/navigation';
import { useAuth } from '../features/auth/AuthContext';
import { NolaMascot } from '../features/companion/NolaMascot';
import { SpeechBubble } from '../features/companion/SpeechBubble';

/** What each module will be, and when it gets built. Honest about status. */
const MODULE_INFO: Record<string, { blurb: string; status: string; ready: boolean }> = {
  '/academy': { blurb: 'Short lessons on food, oxygen, water, energy and radiation.', status: 'Being built', ready: false },
  '/mission': { blurb: 'Explore your own space station and keep it running.', status: 'Being built', ready: false },
  '/companion': { blurb: 'Ask NOLA questions about living in space.', status: 'Being built', ready: false },
  '/profile': { blurb: 'Your astronaut ID card and account.', status: 'Ready', ready: true },
};

export function MissionControlPage() {
  const { profile, profileError } = useAuth();
  const name = profile?.displayName;

  return (
    <div className="space-y-10">
      <section className="animate-rise flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <NolaMascot size={150} className="shrink-0" />
        <SpeechBubble pointer="left" className="flex-1">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {name ? `Welcome aboard, ${name}!` : 'Welcome aboard!'}
          </h1>
          <p className="mt-2">
            This is Mission Control. Your space station is still under construction, so some doors are closed for now.
            I'll open each one as it's finished!
          </p>
        </SpeechBubble>
      </section>

      {profileError && (
        <p role="alert" className="rounded-2xl border-2 border-alert bg-alert/10 px-4 py-3 font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          {profileError}
        </p>
      )}

      <section aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="mb-4 text-2xl font-semibold">
          Station modules
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {NAV_ITEMS.filter((item) => item.to !== '/').map(({ to, label, icon: Icon }) => {
            const info = MODULE_INFO[to];
            if (!info) return null;
            return (
              <li key={to}>
                <Link
                  to={to}
                  className="group flex h-full flex-col rounded-3xl border-2 border-line bg-hull/80 p-6 transition hover:-translate-y-1 hover:border-glow"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-panel text-glow">
                      <Icon aria-hidden="true" size={30} />
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-bold ${
                        info.ready ? 'border-go text-go' : 'border-nola-soft text-nola-soft'
                      }`}
                    >
                      {info.ready ? <span aria-hidden="true">✓</span> : <Hammer aria-hidden="true" size={14} />}
                      {info.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">{label}</h3>
                  <p className="mt-1 flex-1 text-mist">{info.blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-semibold text-glow">
                    Take a look
                    <ArrowRight aria-hidden="true" size={18} className="transition group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
