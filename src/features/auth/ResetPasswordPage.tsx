import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from './AuthContext';
import { authErrorMessage } from './authErrors';
import { AuthShell, FormError } from './AuthShell';
import { validateEmail } from './validation';

export function ResetPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invalidEmail = validateEmail(email);
    setEmailError(invalidEmail);
    setFormError(null);
    if (invalidEmail) return;

    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      mood="curious"
      nolaMessage="Forgot your password? It happens to the best astronauts. I'll send you a link to make a new one."
    >
      {sent ? (
        <p role="status" className="rounded-2xl border-2 border-go bg-go/10 px-4 py-4 text-lg">
          <span aria-hidden="true">✓ </span>
          If an account uses <strong>{email.trim()}</strong>, a reset link is on its way. Check your inbox (and the spam
          folder).
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
          />
          <FormError message={formError} />
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}

      <p className="mt-6 text-base">
        <Link to="/login" className="font-semibold text-glow underline underline-offset-4">
          Back to log in
        </Link>
      </p>
    </AuthShell>
  );
}
