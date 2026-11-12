import { describe, expect, it } from 'vitest';
import { authErrorMessage } from './authErrors';
import { validateDisplayName, validateEmail, validatePassword } from './validation';

describe('validateDisplayName', () => {
  it('accepts ordinary nicknames, including non-English letters', () => {
    expect(validateDisplayName('Star Fox_7')).toBeNull();
    expect(validateDisplayName('  Zoë  ')).toBeNull();
  });

  it('rejects names that are too short, too long or contain symbols', () => {
    expect(validateDisplayName(' a ')).not.toBeNull();
    expect(validateDisplayName('x'.repeat(21))).not.toBeNull();
    expect(validateDisplayName('<script>')).not.toBeNull();
  });
});

describe('validateEmail', () => {
  it('accepts a normal address and rejects malformed ones', () => {
    expect(validateEmail('cadet@example.com')).toBeNull();
    expect(validateEmail('')).not.toBeNull();
    expect(validateEmail('cadet@')).not.toBeNull();
    expect(validateEmail('cadet example.com')).not.toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires at least 8 characters', () => {
    expect(validatePassword('1234567')).not.toBeNull();
    expect(validatePassword('12345678')).toBeNull();
  });
});

describe('authErrorMessage', () => {
  it('maps known Firebase codes to friendly text', () => {
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toMatch(/already uses that email/);
  });

  it('never leaks technical details for unknown errors', () => {
    expect(authErrorMessage({ code: 'auth/internal-error' })).toBe('Something went wrong. Please try again.');
    expect(authErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(authErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });
});
