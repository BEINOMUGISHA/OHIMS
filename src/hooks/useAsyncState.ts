/**
 * src/hooks/useAsyncState.ts
 * ─────────────────────────────────────────────────────────────
 * OHIMS Uganda — Standardized async data-fetching hook.
 * Every list/table/dashboard section uses this to guarantee
 * loading → data/empty → error tri-state rendering.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: AsyncStatus;
  error: string | null;
  /** Whether any data has ever been successfully loaded (for optimistic updates) */
  hasData: boolean;
  refetch: () => void;
}

/**
 * useAsyncState<T>(fetcher, deps)
 *
 * @param fetcher - An async function returning T. May return { data, error }
 *                  shape or throw. Both patterns are handled.
 * @param deps    - React dependency array — refetches when deps change.
 *
 * @example
 * const { data: claims, status, error, refetch } = useAsyncState(
 *   () => claimsApi.list({ policy_id: policy.id }),
 *   [policy.id]
 * );
 */
export function useAsyncState<T>(
  fetcher: () => Promise<T | { data: T | null; error: string | null }>,
  deps: DependencyList = []
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<AsyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const mountedRef = useRef(true);
  const fetchCountRef = useRef(0);

  const execute = useCallback(async () => {
    const fetchId = ++fetchCountRef.current;
    setStatus('loading');
    setError(null);

    try {
      const result = await fetcher();

      if (!mountedRef.current || fetchId !== fetchCountRef.current) return;

      // Handle normalized { data, error } shape
      if (
        result !== null &&
        typeof result === 'object' &&
        'data' in result &&
        'error' in result
      ) {
        const r = result as { data: T | null; error: string | null };
        if (r.error) {
          setStatus('error');
          setError(r.error);
        } else {
          setData(r.data);
          setStatus('success');
          if (r.data !== null) setHasData(true);
        }
      } else {
        // Raw return value
        setData(result as T);
        setStatus('success');
        if (result !== null) setHasData(true);
      }
    } catch (err) {
      if (!mountedRef.current || fetchId !== fetchCountRef.current) return;
      setStatus('error');
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute]);

  return { data, status, error, hasData, refetch: execute };
}

/**
 * Convenience: returns true if status is loading AND no data has been shown yet.
 * Use this for skeleton loaders (don't show skeleton during background refetches).
 */
export function isFirstLoad(state: AsyncState<unknown>): boolean {
  return state.status === 'loading' && !state.hasData;
}
