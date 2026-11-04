import { useEffect, useState } from 'react';
import { messageOf } from './api';

type Settled<T> = { key: string; data?: T; error?: string };

export type Fetched<T> = { data?: T; error?: string; loading: boolean };

/**
 * Loads `load(key)` whenever `key` changes; `undefined` means nothing to load. Results are kept with
 * the key that produced them, so a stale result is never shown for a newer key while it loads.
 */
export function useFetched<T>(key: string | undefined, load: (key: string) => Promise<T>): Fetched<T> {
  const [settled, setSettled] = useState<Settled<T>>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: `load` is a stable module function at every call site
  useEffect(() => {
    if (key === undefined) return;
    let current = true;
    load(key).then(
      (data) => current && setSettled({ key, data }),
      (error) => current && setSettled({ key, error: messageOf(error) }),
    );
    return () => {
      current = false;
    };
  }, [key]);

  if (key === undefined) return { loading: false };
  if (settled?.key !== key) return { loading: true };
  return { data: settled.data, error: settled.error, loading: false };
}
