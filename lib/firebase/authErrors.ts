/**
 * Maps Firebase Auth error codes to friendly, user-facing messages.
 * Keep messages non-enumerating (don't reveal whether an email exists) for the
 * sign-in / reset flows.
 */
export function mapAuthError(
  code: string | undefined,
  fallback = 'Something went wrong. Please try again.',
): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact us for help.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Please choose a password with at least 6 characters.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups or use the email option.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled yet. Please contact us.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This link is invalid or has expired. Please request a new one.';
    default:
      return fallback;
  }
}
