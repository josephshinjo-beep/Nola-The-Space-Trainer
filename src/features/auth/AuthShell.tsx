import { Accessibility, Database } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Logo } from '../../components/Logo';
import { VideoBackdrop } from '../../components/VideoBackdrop';
import { NolaMascot, type NolaMood } from '../companion/NolaMascot';
import { SpeechBubble } from '../companion/SpeechBubble';

interface AuthShellProps {
  title: string;
  /** What NOLA says beside the form. */
  nolaMessage: string;
  mood?: NolaMood;
  children: ReactNode;
}

/** Shared frame for the login, sign-up and password-reset pages. */
export function AuthShell({ title, nolaMessage, mood = 'happy', children }: AuthShellProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 lg:px-10">
      <VideoBackdrop />
      <header className="flex items-center justify-between gap-4">
        <Logo />
        <Link
          to="/accessibility"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line px-4 font-semibold text-mist transition hover:border-glow hover:text-star"
        >
          <Accessibility aria-hidden="true" size={20} />
          Accessibility
        </Link>
        <Link to="/data-sources" className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-line px-4 font-semibold text-mist transition hover:border-glow hover:text-star">
          <Database aria-hidden="true" size={20} />
          Data sources
        </Link>
      </header>

      <main className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-2 lg:gap-16">
        <section aria-label="A message from NOLA" className="flex items-start gap-4 lg:flex-col lg:items-center lg:gap-8">
          <NolaMascot mood={mood} waving size={230} className="hidden shrink-0 lg:block" />
          <NolaMascot mood={mood} size={84} className="shrink-0 lg:hidden" />
          <div className="flex-1 lg:w-full lg:max-w-md">
            <SpeechBubble pointer="left" className="lg:hidden" readAloudText={nolaMessage}>
              {nolaMessage}
            </SpeechBubble>
            <SpeechBubble pointer="top" className="hidden lg:block" readAloudText={nolaMessage}>
              {nolaMessage}
            </SpeechBubble>
            <p className="mt-6 hidden text-center font-display text-sm font-semibold tracking-[0.35em] text-mist lg:block">
              LEARN • EXPLORE • ACHIEVE
            </p>
          </div>
        </section>

        <section className="animate-rise rounded-[2rem] border-2 border-line bg-hull/90 p-6 shadow-2xl shadow-void sm:p-10">
          <h1 className="mb-6 text-3xl font-semibold sm:text-4xl">{title}</h1>
          {children}
        </section>
      </main>
    </div>
  );
}

/** Form-level error banner, announced to screen readers when it appears. */
export function FormError({ message }: { message: string | null }) {
  return (
    <div role="alert" aria-live="assertive">
      {message && (
        <p className="rounded-2xl border-2 border-alert bg-alert/10 px-4 py-3 text-base font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          {message}
        </p>
      )}
    </div>
  );
}
