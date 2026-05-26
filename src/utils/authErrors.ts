/**
 * Convert Firebase Auth error codes into human-readable messages.
 */
export function getAuthErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : ''
  const code =
    (err as { code?: string })?.code ??
    msg.match(/\(auth\/([\w-]+)\)/)?.[1] ??
    ''

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Please use a different email.'
    case 'auth/invalid-email':
      return 'The email address is not valid.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.'
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Contact the admin.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    default:
      // Fallback: clean up the raw message but keep useful info
      return (
        msg
          .replace('Firebase: ', '')
          .replace(/\(auth\/[\w-]+\)\.?/g, '')
          .trim() || 'Something went wrong. Please try again.'
      )
  }
}
