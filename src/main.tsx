import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { missingFirebaseKeys } from './services/firebaseConfig';

const root = createRoot(document.getElementById('root')!);

/** Shown to developers when .env.local is missing or incomplete. */
function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="mx-auto max-w-xl px-5 py-16">
      <h1 className="text-3xl font-semibold">Firebase is not configured</h1>
      <p className="mt-4 text-lg text-mist">
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in these values, then restart the dev server:
      </p>
      <ul className="mt-4 list-inside list-disc font-mono text-nola-soft">
        {missing.map((key) => (
          <li key={key}>{key}</li>
        ))}
      </ul>
    </main>
  );
}

async function start() {
  if (missingFirebaseKeys.length > 0) {
    root.render(
      <>
        <div className="starfield" aria-hidden="true" />
        <SetupNeeded missing={missingFirebaseKeys} />
      </>,
    );
    return;
  }

  // Loaded only once the configuration is known to be complete, so a
  // missing value gives the helpful screen above, not a blank page.
  const { default: App } = await import('./app/App');
  root.render(
    <StrictMode>
      <div className="starfield" aria-hidden="true" />
      <App />
    </StrictMode>,
  );
}

void start();
