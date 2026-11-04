import type { SpaceGraph } from 'structured-context/api';
import { spaceGraphFrom } from 'structured-context/browser';
import type { ValidationInput } from 'structured-context-map-views';
import type { SpaceResponse } from './space-response';

export type Space = { schemaId: string | undefined; graph: SpaceGraph };

/** A readable message for anything thrown: `String(error)` would prefix it with "Error: ". */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body as T;
}

export async function fetchSpace(url: string): Promise<Space> {
  const { schemaId, graph } = await fetchJson<SpaceResponse>(url);
  return { schemaId, graph: spaceGraphFrom(graph) };
}

export const fetchValidation = (url: string) => fetchJson<ValidationInput>(url);

export const validationUrl = (name: string) => `/api/validation?space=${encodeURIComponent(name)}`;

export function spaceUrl(name: string, filter?: string): string {
  const base = `/api/spaces/${encodeURIComponent(name)}`;
  return filter ? `${base}?filter=${encodeURIComponent(filter)}` : base;
}
