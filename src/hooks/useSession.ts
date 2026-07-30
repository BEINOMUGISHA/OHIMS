/**
 * src/hooks/useSession.ts
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Session expiry watcher.
 * Detects TOKEN_REFRESHED_FAILED / SIGNED_OUT Supabase events
 * and surfaces "You've been signed out" toast + redirect rather
 * than letting API calls silently fail.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';

interface UseSessionOptions {
  /** Called when a clean SIGNED_OUT event fires (e.g. user clicked logout) */
  onSignOut?: () => void;
  /** Called when session expires unexpectedly (token refresh failed) */
  onExpired?: () => void;
}

export function useSession(options: UseSessionOptions = {}): void {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const isIntentionalSignOut = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'TOKEN_REFRESHED') {
          // Session renewed — no action needed
          return;
        }

        if (event === 'SIGNED_OUT') {
          if (isIntentionalSignOut.current) {
            // Intentional logout — let App.tsx handle cleanup
            isIntentionalSignOut.current = false;
            options.onSignOut?.();
            return;
          }
          // Unexpected sign-out (e.g. session revoked server-side)
          showToast(
            'Your session has ended. Please sign in again.',
            'warning',
            6000
          );
          options.onExpired?.();
          navigate('/login', { replace: true });
          return;
        }

        // Supabase v2 fires USER_UPDATED when token refresh fails — we watch
        // for subsequent API errors instead, but also handle the auth error event.
        if ((event as string) === 'TOKEN_REFRESH_FAILED') {
          showToast(
            'You\'ve been signed out — your session expired. Please log in again.',
            'error',
            8000
          );
          options.onExpired?.();
          navigate('/login', { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose a way for the logout button to flag intentional sign-out
  // so the watcher doesn't show an "expired" toast.
  // Access via the global ref: useSession doesn't need to return anything
  // because App.tsx calls supabase.auth.signOut() directly.
}

/**
 * Mark the next SIGNED_OUT event as intentional (called before manual logout).
 * Import and call this from your logout handler to suppress the expiry toast.
 */
let _intentionalLogoutFlag = false;
export function flagIntentionalLogout() {
  _intentionalLogoutFlag = true;
  // Reset after a brief window
  setTimeout(() => { _intentionalLogoutFlag = false; }, 3000);
}
export function isIntentionalLogout() {
  return _intentionalLogoutFlag;
}
