/**
 * Translates Firebase's technical error codes into messages a
 * 10-year-old can understand and act on.
 */
const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An astronaut already uses that email. Try logging in instead.',
  'auth/invalid-email': "That doesn't look like an email address.",
  'auth/weak-password': 'That password is too easy to guess. Try a longer one.',
  'auth/invalid-credential': "That email and password don't match. Check them and try again.",
  'auth/wrong-password': "That email and password don't match. Check them and try again.",
  'auth/user-not-found': "That email and password don't match. Check them and try again.",
  'auth/user-disabled': 'This account has been switched off. Ask a grown-up for help.',
  'auth/too-many-requests': 'Too many tries. Take a short break and try again in a few minutes.',
  'auth/network-request-failed': "We can't reach mission servers. Check your internet connection.",
  'auth/operation-not-allowed':
    'Email sign-in is not switched on for this project yet (Firebase console → Authentication).',
};

const FALLBACK = 'Something went wrong. Please try again.';

export function authErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === 'string') return MESSAGES[code] ?? FALLBACK;
  }
  return FALLBACK;
}
