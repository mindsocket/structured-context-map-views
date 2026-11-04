import { useCallback, useEffect, useState } from 'react';
import type { ParameterValues } from 'structured-context-map-views';

/** A query parameter holding a map view parameter's value is `p.<name>=<JSON>`. */
const VALUE_PREFIX = 'p.';

type UrlState = { spaceName: string; mapViewId: string; values: ParameterValues };

function readUrl(): UrlState {
  const params = new URLSearchParams(window.location.search);
  const values: Record<string, unknown> = {};
  for (const [key, raw] of params) {
    if (!key.startsWith(VALUE_PREFIX)) continue;
    try {
      values[key.slice(VALUE_PREFIX.length)] = JSON.parse(raw);
    } catch {
      // A hand-edited value that isn't JSON is ignored; the parameter keeps its default.
    }
  }
  return { spaceName: params.get('space') ?? '', mapViewId: params.get('view') ?? '', values };
}

function writeUrl({ spaceName, mapViewId, values }: UrlState) {
  const params = new URLSearchParams();
  if (spaceName) params.set('space', spaceName);
  if (mapViewId) params.set('view', mapViewId);
  for (const [name, value] of Object.entries(values)) params.set(VALUE_PREFIX + name, JSON.stringify(value));
  const search = params.toString();
  window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname);
}

/**
 * The chosen space, map view and parameter values, mirrored in the query string so a reload (or a
 * shared link) restores them. Values are remembered per map view for the session; only the current
 * view's values are in the URL. `mapViewId` is '' until the host settles on a map view (see `setMapViewId`).
 */
export function useUrlState() {
  const [initial] = useState(readUrl);
  const [spaceName, setSpaceNameState] = useState(initial.spaceName);
  const [mapViewId, setMapViewId] = useState(initial.mapViewId);
  const [valuesByView, setValuesByView] = useState<Record<string, ParameterValues>>(
    initial.mapViewId ? { [initial.mapViewId]: initial.values } : {},
  );
  const values = valuesByView[mapViewId] ?? {};

  useEffect(() => writeUrl({ spaceName, mapViewId, values }), [spaceName, mapViewId, values]);

  const setSpaceName = useCallback((name: string) => {
    setSpaceNameState(name);
    setMapViewId('');
  }, []);
  const setValue = useCallback(
    (name: string, value: unknown) =>
      setValuesByView((all) => ({ ...all, [mapViewId]: { ...all[mapViewId], [name]: value } })),
    [mapViewId],
  );

  return { spaceName, mapViewId, values, setSpaceName, setMapViewId, setValue };
}
