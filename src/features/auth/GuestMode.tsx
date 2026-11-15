import { FlaskConical, LogOut, Save, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '../../components/Button';
import { ConfirmDialog, Modal } from '../../components/ConfirmDialog';
import { TextField } from '../../components/TextField';
import { resetAllProgress } from '../../services/academyRepository';
import { deleteMissionRecord, deleteSimulation, deleteSolMission } from '../../services/simulationRepository';
import { useAcademyProgress } from '../academy/AcademyProgressContext';
import { CURRICULUM } from '../academy/curriculum';
import { useAuth } from './AuthContext';
import { authErrorMessage } from './authErrors';
import { FormError } from './AuthShell';
import { validateDisplayName, validateEmail, validatePassword } from './validation';

/** Deletes everything a guest saved: lessons, the station, the Mars mission and the record. */
async function deleteGuestData(uid: string): Promise<void> {
  await Promise.all([
    resetAllProgress(
      uid,
      CURRICULUM.map((module) => module.id),
    ),
    deleteSimulation(uid),
    deleteSolMission(uid),
    deleteMissionRecord(uid),
  ]);
}

interface GuestModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Guest (test mode) options: unlock every module for testing, save the
 * guest's progress as a full account, or leave guest mode (which deletes
 * the guest's data, so nothing about a child is kept).
 */
export function GuestModal({ open, onClose }: GuestModalProps) {
  const { saveGuestAccount, leaveGuestMode } = useAuth();
  const { progress, save } = useAcademyProgress();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name: string | null; email: string | null; password: string | null }>({ name: null, email: null, password: null });
  const [formError, setFormError] = useState<string | null>(null);
  const allDone = CURRICULUM.every((module) => progress[module.id]?.completed);

  async function unlockAll() {
    setBusy(true);
    setMessage(null);
    try {
      await Promise.all(
        CURRICULUM.map((module) =>
          save(module.id, { stage: 5, quizPassed: true, challengeDone: true, completed: true, bestScore: 5, lastScore: 5, quizTotal: 5, attempts: 1 }),
        ),
      );
      setMessage('Test mode: all eight modules are passed, so every station room is open.');
    } catch {
      setMessage("That didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const next = { name: validateDisplayName(name), email: validateEmail(email), password: validatePassword(password) };
    setErrors(next);
    setFormError(null);
    if (next.name || next.email || next.password) return;
    setBusy(true);
    try {
      await saveGuestAccount(name, email, password);
      setMessage('Your account is ready, and all your progress is saved. Welcome to the crew!');
      onClose();
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal open={open && !confirmLeave} title="Guest mode (test)" onClose={onClose} wide>
        <div className="space-y-5">
          <p className="text-lg">You're exploring NOLA as a guest: no email, no password. Your progress is saved in a temporary account that only this browser can open.</p>

          <section aria-labelledby="guest-test" className="space-y-2 rounded-2xl border-2 border-line bg-void/50 p-4">
            <h3 id="guest-test" className="flex items-center gap-2 font-display text-xl font-semibold">
              <FlaskConical aria-hidden="true" size={20} className="text-glow" /> Test everything
            </h3>
            <p className="text-base text-mist">Marks all eight Academy modules as passed, so every room, mission and feature of the station is open.</p>
            <Button variant="secondary" disabled={busy || allDone} onClick={() => void unlockAll()}>
              {allDone ? 'All modules are unlocked' : 'Unlock all modules (test)'}
            </Button>
          </section>

          <section aria-labelledby="guest-save" className="space-y-3 rounded-2xl border-2 border-line bg-void/50 p-4">
            <h3 id="guest-save" className="flex items-center gap-2 font-display text-xl font-semibold">
              <Save aria-hidden="true" size={20} className="text-go" /> Keep your progress
            </h3>
            <p className="text-base text-mist">Create an account and everything you have done as a guest moves into it.</p>
            <form onSubmit={handleSave} noValidate className="grid gap-3 sm:grid-cols-3">
              <TextField label="Astronaut name" autoComplete="nickname" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} hint="A nickname is best." />
              <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
              <TextField label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters." />
              <div className="sm:col-span-3">
                <FormError message={formError} />
                <Button type="submit" disabled={busy}>
                  <UserRound aria-hidden="true" size={18} /> Create my account
                </Button>
              </div>
            </form>
          </section>

          <section aria-labelledby="guest-leave" className="space-y-2 rounded-2xl border-2 border-line bg-void/50 p-4">
            <h3 id="guest-leave" className="flex items-center gap-2 font-display text-xl font-semibold">
              <LogOut aria-hidden="true" size={20} className="text-alert" /> Leave guest mode
            </h3>
            <p className="text-base text-mist">Signs you out and deletes everything saved in this guest session.</p>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirmLeave(true)}>
              Leave guest mode
            </Button>
          </section>

          {message && (
            <p role="status" className="rounded-xl bg-glow/15 p-3 text-base font-semibold">
              {message}
            </p>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmLeave}
        title="Leave guest mode?"
        message="Everything you did as a guest will be deleted. To keep it, create an account first."
        confirmLabel="Delete and leave"
        onConfirm={() => {
          setConfirmLeave(false);
          void leaveGuestMode(deleteGuestData);
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </>
  );
}
