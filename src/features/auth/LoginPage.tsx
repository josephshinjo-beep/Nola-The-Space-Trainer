import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from './AuthContext';
import { authErrorMessage } from './authErrors';
import { AuthShell, FormError } from './AuthShell';
import { validateEmail } from './validation';

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invalidEmail = validateEmail(email);
    setEmailError(invalidEmail);
    setFormError(null);
    if (invalidEmail) return;
    if (!password) {
      setFormError('Enter your password.');
      return;
    }

    setBusy(true);
    try {
      // On success the route guard notices the sign-in and moves us on.
      await login(email, password);
    } catch (error) {
      setFormError(authErrorMessage(error));
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back, astronaut" nolaMessage="Hi! I'm NOLA. Log in and I'll take you straight to Mission Control.">
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={formError} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Opening the airlock…' : 'Log in'}
        </Button>
      </form>

      <div className="mt-6 flex flex-wrap justify-between gap-3 text-base">
        <Link to="/reset-password" className="font-semibold text-glow underline underline-offset-4">
          Forgot your password?
        </Link>
        <Link to="/register" state={location.state} className="font-semibold text-glow underline underline-offset-4">
          New here? Join the crew
        </Link>
      </div>
    </AuthShell>
  );
}
