import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { SettingsPanel } from '../features/accessibility/SettingsPanel';

/** Accessibility settings for visitors who have not logged in yet. */
export function AccessibilityPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-6">
      <header>
        <Logo />
      </header>
      <main className="animate-rise mt-8 rounded-[2rem] border-2 border-line bg-hull/90 p-6 sm:p-10">
        <Link to="/login" className="inline-flex min-h-11 items-center gap-2 font-semibold text-glow">
          <ArrowLeft aria-hidden="true" size={18} /> Back to log in
        </Link>
        <h1 className="mb-2 mt-3 text-3xl font-semibold">Accessibility</h1>
        <p className="mb-6 text-lg text-mist">Changes apply straight away and are remembered on this device.</p>
        <SettingsPanel />
      </main>
    </div>
  );
}
