import { ArrowLeft, Check, Database, ExternalLink, Gamepad2, Satellite } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';
import { ALWAYS_SIMPLIFIED, DATA_SOURCES, numberRows, OTHER_REAL_VALUES, readableName } from '../data/dataSources';

type Filter = 'all' | 'real' | 'game';

/** Read once: the config does not change while the app runs. */
const rows = numberRows();

/** A label that says "Real (NASA)" or "Game value" in words and with an icon, never colour alone. */
function Basis({ real }: { real: boolean }) {
  return real ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-glow px-2 py-0.5 text-xs font-bold text-void">
      <Check aria-hidden="true" size={12} /> Real (NASA)
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-nola-soft px-2 py-0.5 text-xs font-bold text-void">
      <Gamepad2 aria-hidden="true" size={12} /> Game value
    </span>
  );
}

/** Every NASA dataset the app uses, and which numbers are real versus simplified. Open to everyone. */
export function DataSourcesPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const shown = rows.filter((row) => filter === 'all' || (filter === 'real') === row.real);
  const realCount = rows.filter((row) => row.real).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-5">
      <header>
        <Logo />
      </header>
      <main className="mt-6 space-y-8 rounded-[2rem] border-2 border-line bg-hull/90 p-5 sm:p-10">
        <Link to="/" className="inline-flex min-h-11 items-center gap-2 font-semibold text-glow">
          <ArrowLeft aria-hidden="true" size={18} /> Back to NOLA
        </Link>
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Data sources</h1>
          <p className="mt-3 text-lg text-mist">
            NOLA uses real NASA data wherever it can, and says clearly when a number is made up for the game. This page lists every NASA dataset we use, and marks every number as real or a game value.
          </p>
        </div>

        <section aria-labelledby="datasets" className="space-y-4">
          <h2 id="datasets" className="flex items-center gap-2 text-2xl font-semibold">
            <Satellite aria-hidden="true" size={24} className="text-glow" /> NASA datasets and references
          </h2>
          <ul className="space-y-4">
            {DATA_SOURCES.map((source) => (
              <li key={source.id} className="rounded-2xl border-2 border-line bg-void/50 p-4">
                <h3 className="font-display text-xl font-semibold">{source.name}</h3>
                <p className="text-sm text-mist">
                  {source.provider} · {source.access}
                </p>
                <p className="mt-2 text-base">{source.what}</p>
                <p className="mt-1 text-base">
                  <strong>Used for:</strong> {source.usedFor}
                </p>
                {source.endpoints.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-bold">API calls:</p>
                    <ul className="mt-1 space-y-1">
                      {source.endpoints.map((endpoint) => (
                        <li key={endpoint}>
                          <code className="block overflow-x-auto rounded-lg bg-void px-2 py-1 text-xs text-mist">{endpoint}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-2 text-sm text-mist">In the code: {source.files.join(', ')}</p>
                <a href={source.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-bold text-nola-soft underline">
                  Visit the source <ExternalLink aria-hidden="true" size={14} />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="numbers" className="space-y-4">
          <h2 id="numbers" className="flex items-center gap-2 text-2xl font-semibold">
            <Database aria-hidden="true" size={24} className="text-glow" /> Real numbers and game numbers
          </h2>
          <p className="text-lg text-mist">
            The Mars mission uses {rows.length} numbers. {realCount} come from NASA; the other {rows.length - realCount} are game values, chosen so the game is fair and fun. All of them live in one file (src/sol/config.ts), and this list is read from it directly.
          </p>
          <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
            {(
              [
                ['all', `All (${rows.length})`],
                ['real', `Real (${realCount})`],
                ['game', `Game values (${rows.length - realCount})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={`min-h-11 rounded-full border-2 px-4 font-bold ${filter === id ? 'border-glow bg-panel' : 'border-line text-mist'}`}
              >
                {filter === id && <Check aria-hidden="true" size={14} className="mr-1 inline" />}
                {label}
              </button>
            ))}
          </div>
          <ul className="divide-y-2 divide-line rounded-2xl border-2 border-line">
            {shown.map((row) => (
              <li key={row.path} className="grid gap-1 p-3 sm:grid-cols-[1fr_auto] sm:gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">{readableName(row.path)}</p>
                  <p className="text-sm text-mist">{row.note}</p>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <span className="font-display text-lg">
                    {row.value.toLocaleString('en')} {row.unit}
                  </span>
                  <Basis real={row.real} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="other-real" className="space-y-3">
          <h2 id="other-real" className="text-2xl font-semibold">
            Other real values
          </h2>
          <ul className="space-y-2">
            {OTHER_REAL_VALUES.map((item) => (
              <li key={item.name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-line pb-2">
                <span className="font-semibold">{item.name}</span>
                <span className="text-mist">
                  {item.value} · {item.source} <Basis real />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="always-game" className="space-y-3">
          <h2 id="always-game" className="text-2xl font-semibold">
            Always simplified
          </h2>
          <ul className="list-disc space-y-2 pl-6 text-lg">
            {ALWAYS_SIMPLIFIED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="text-base text-mist">
            In the app, real data is always labelled with its source: “Live NASA data”, “Saved NASA data”, “Checked live with NASA OSDR today”, or “Simulated data (not real measurements)”. Storms based on real events always say “Game mechanic, not a radiation forecast”.
          </p>
        </section>
      </main>
    </div>
  );
}
