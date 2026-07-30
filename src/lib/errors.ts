/**
 * src/lib/errors.ts
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Centralized error translation layer.
 * Maps raw Supabase/Postgres/network errors → human-readable
 * messages before they ever reach UI components.
 * ─────────────────────────────────────────────────────────────
 */

import { AuthError, PostgrestError } from '@supabase/supabase-js';

// ── Known Postgres error codes ─────────────────────────────────

const PG_CODES: Record<string, string> = {
  '23505': 'A record with this value already exists.',
  '23503': 'Referenced record not found. Please refresh and try again.',
  '23514': 'Value violates a database constraint. Please check your input.',
  '42501': 'You do not have permission to perform this action.',
  '23502': 'A required field is missing.',
  '40001': 'A conflict occurred. Please try again.',
  '40P01': 'A database deadlock occurred. Please retry.',
  'P0001': undefined, // Will use the detail message directly
};

// ── Auth error patterns ────────────────────────────────────────

const AUTH_PATTERNS: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Incorrect email or password. Please try again.'],
  [/email.*already.*registered/i, 'An account with this email already exists. Please sign in.'],
  [/email.*already.*exists/i, 'An account with this email already exists. Please sign in.'],
  [/user.*already.*exists/i, 'An account with this email already exists. Please sign in.'],
  [/password.*too.*short/i, 'Password must be at least 8 characters.'],
  [/weak.*password/i, 'Password is too weak. Add uppercase letters and numbers.'],
  [/email.*not.*confirmed/i, 'Please check your email and confirm your account before signing in.'],
  [/jwt.*expired/i, 'Your session has expired. Please sign in again.'],
  [/token.*expired/i, 'Your session has expired. Please sign in again.'],
  [/too many requests/i, 'Too many attempts. Please wait a minute and try again.'],
  [/signup.*disabled/i, 'New registrations are temporarily disabled. Contact support.'],
  [/email.*rate.*limit/i, 'Too many emails sent. Please wait before requesting again.'],
];

// ── Network / fetch patterns ───────────────────────────────────

const NETWORK_PATTERNS: Array<[RegExp, string]> = [
  [/failed to fetch/i, 'Connection lost. Please check your internet and try again.'],
  [/network.*error/i, 'Network error. Please check your connection.'],
  [/timeout/i, 'The request timed out. Please try again.'],
  [/aborted/i, 'The request was cancelled. Please try again.'],
];

// ── Core translation function ──────────────────────────────────

/**
 * Translates any error value (string, Error, AuthError, PostgrestError, unknown)
 * into a user-friendly message string.
 */
export function translateError(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';

  // Supabase PostgREST error object
  if (isPostgrestError(err)) {
    const code = err.code;
    if (code === 'P0001' && err.details) return err.details;
    if (code === 'P0001' && err.message) return err.message;
    const mapped = PG_CODES[code];
    if (mapped) return mapped;
    // Fall through to message check
    return cleanMessage(err.message) || 'Database error. Please try again.';
  }

  // Supabase Auth error
  if (isAuthError(err)) {
    const msg = err.message || '';
    for (const [pattern, human] of AUTH_PATTERNS) {
      if (pattern.test(msg)) return human;
    }
    return cleanMessage(msg) || 'Authentication error. Please try again.';
  }

  // Standard JS Error
  if (err instanceof Error) {
    const msg = err.message || '';
    // Auth patterns
    for (const [pattern, human] of AUTH_PATTERNS) {
      if (pattern.test(msg)) return human;
    }
    // Network patterns
    for (const [pattern, human] of NETWORK_PATTERNS) {
      if (pattern.test(msg)) return human;
    }
    return cleanMessage(msg) || 'An unexpected error occurred.';
  }

  // Plain string
  if (typeof err === 'string') {
    if (!err.trim()) return 'An unexpected error occurred.';
    for (const [pattern, human] of AUTH_PATTERNS) {
      if (pattern.test(err)) return human;
    }
    for (const [pattern, human] of NETWORK_PATTERNS) {
      if (pattern.test(err)) return human;
    }
    return cleanMessage(err);
  }

  return 'An unexpected error occurred. Please try again.';
}

// ── Normalized API response wrapper ───────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

/**
 * Wraps an async operation in a try/catch and always returns
 * { data, error } — never throws. Components destructure this
 * instead of catching exceptions themselves.
 */
export async function safeCall<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const result = await fn();
    return { data: result, error: null };
  } catch (err) {
    return { data: null, error: translateError(err) };
  }
}

// ── Type guards ────────────────────────────────────────────────

function isPostgrestError(err: unknown): err is PostgrestError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    'details' in err &&
    'hint' in err
  );
}

function isAuthError(err: unknown): err is AuthError {
  return err instanceof Error && 'status' in err && '__isAuthError' in err;
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Strips raw Postgres internals from messages shown to users.
 */
function cleanMessage(msg: string): string {
  return msg
    .replace(/^ERROR:\s*/i, '')
    .replace(/\s+Key\s+\(.*?\)\s*=\s*\(.*?\)\s*(already exists|conflicts with).*$/i, ' already exists.')
    .replace(/new row for relation ".*?" violates/i, 'Invalid data:')
    .trim();
}
