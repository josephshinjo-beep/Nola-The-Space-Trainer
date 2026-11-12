import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { useAuth } from './AuthContext';
import { authErrorMessage } from './authErrors';
import { AuthShell, FormError } from './AuthShell';
import { validateDisplayName, validateEmail, validatePassword } from './validation';

interface FieldErrors {
  name: string | null;
  email: string | null;
  password: string | null;
}

export function RegisterPage() {
  const { register } = useAuth();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({ name: null, email: null, password: null });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: FieldErrors = {
      name: validateDisplayName(name),
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.name || nextErrors.email || nextErrors.password) return;

    setBusy(true);
    try {
      await register(name, email, password);
    } catch (error) {
      setFormError(authErrorMessage(error));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Join the crew"
      mood="curious"
      nolaMessage="Ready to train for life in space? Choose an astronaut name and I'll get your station ready!"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          label="Astronaut name"
          autoComplete="nickname"
          maxLength={20}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          hint="A nickname is best. Don't use your full real name."
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          hint="Only used to log in and to reset your password."
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="At least 8 characters."
        />
        <FormError message={formError} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Preparing your station…' : 'Start training'}
        </Button>
      </form>

      <p className="mt-6 text-base">
        <Link to="/login" state={location.state} className="font-semibold text-glow underline underline-offset-4">
          Already on the crew? Log in
        </Link>
      </p>
    </AuthShell>
  );
}
