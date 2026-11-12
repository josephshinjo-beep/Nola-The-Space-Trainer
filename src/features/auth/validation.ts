/**
 * Form checks shared by the sign-up, login and profile forms.
 * Each function returns a friendly error message, or null when the value is fine.
 */

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 20;
export const PASSWORD_MIN = 8;

export function validateDisplayName(value: string): string | null {
  const name = value.trim();
  if (name.length < DISPLAY_NAME_MIN) return 'Pick an astronaut name with at least 2 characters.';
  if (name.length > DISPLAY_NAME_MAX) return 'Astronaut names can be up to 20 characters.';
  if (!/^[\p{L}\p{N} _-]+$/u.test(name)) return 'Use only letters, numbers, spaces, - and _.';
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Enter an email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "That doesn't look like an email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN) return 'Use a password with at least 8 characters.';
  return null;
}
