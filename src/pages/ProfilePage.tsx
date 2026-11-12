import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { SettingsPanel } from '../features/accessibility/SettingsPanel';
import { useAuth } from '../features/auth/AuthContext';
import { validateDisplayName } from '../features/auth/validation';
import { AstronautAvatar } from '../features/profile/AstronautAvatar';
import { AvatarEditor } from '../features/profile/AvatarEditor';
import { DEFAULT_AVATAR } from '../features/profile/avatarOptions';
import { updateDisplayName } from '../services/userRepository';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border-2 border-line bg-hull/80 p-4 sm:p-6">
      <h2 className="mb-5 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ProfilePage() {
  const { user, profile, profileError, logout } = useAuth();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Fill the form once the saved profile arrives.
  const savedName = profile?.displayName;
  useEffect(() => {
    if (savedName) setName(savedName);
  }, [savedName]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const invalid = validateDisplayName(name);
    setNameError(invalid);
    if (invalid) return;

    setSaveState('saving');
    try {
      await updateDisplayName(user.uid, name.trim());
      setSaveState('saved');
    } catch (error) {
      console.error('Could not save name', error);
      setNameError("We couldn't save your name. Check your connection and try again.");
      setSaveState('idle');
    }
  }

  const unchanged = name.trim() === savedName;

  return (
    <div className="animate-rise space-y-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">Astronaut Profile</h1>

      {profileError && (
        <p role="alert" className="rounded-2xl border-2 border-alert bg-alert/10 px-4 py-3 font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          {profileError}
        </p>
      )}

      {/* Astronaut ID card */}
      <section aria-label="Astronaut ID card" className="overflow-hidden rounded-[2rem] border-2 border-line bg-hull/90 shadow-2xl shadow-void">
        <div className="flex items-center justify-between bg-nola px-6 py-3 font-display font-semibold text-void">
          <span className="tracking-[0.25em]">CREW ID</span>
          <span>NOLA STATION</span>
        </div>
        <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
          <AstronautAvatar avatar={profile?.avatar ?? DEFAULT_AVATAR} size={110} className="shrink-0" />
          <dl className="grid flex-1 gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-bold uppercase tracking-widest text-mist">Astronaut</dt>
              <dd className="mt-1 break-words font-display text-2xl font-semibold">{savedName ?? '…'}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase tracking-widest text-mist">Login email</dt>
              <dd className="mt-1 text-lg [overflow-wrap:anywhere]">{user?.email ?? '…'}</dd>
            </div>
            <div>
              <dt className="text-sm font-bold uppercase tracking-widest text-mist">Crew member since</dt>
              <dd className="mt-1 text-lg">{profile?.createdAt ? dateFormat.format(profile.createdAt) : '…'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <Panel title="Design your astronaut">
        <AvatarEditor />
      </Panel>

      <Panel title="Astronaut name">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <TextField
            label="Astronaut name"
            maxLength={20}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaveState('idle');
            }}
            error={nameError}
            className="flex-1"
          />
          <Button type="submit" disabled={!profile || unchanged || saveState === 'saving'} className="sm:mt-8">
            {saveState === 'saving' ? 'Saving…' : 'Save name'}
          </Button>
        </form>
        <p role="status" className="mt-3 min-h-6 font-semibold text-go">
          {saveState === 'saved' && (
            <>
              <span aria-hidden="true">✓ </span>Name saved.
            </>
          )}
        </p>
      </Panel>

      <Panel title="Accessibility">
        <SettingsPanel />
      </Panel>

      <Button variant="secondary" onClick={() => void logout()}>
        Log out
      </Button>
    </div>
  );
}
