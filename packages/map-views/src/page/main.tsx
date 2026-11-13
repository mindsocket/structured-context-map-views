import { createRoot } from 'react-dom/client';
import type { SpaceSnapshot } from '../core/snapshot';
import { Viewer } from '../viewer/Viewer';

/** The host for a self-contained page: shows the snapshots the page carries. */

function readSnapshots(): SpaceSnapshot[] {
  const text = document.getElementById('sctx-snapshots')?.textContent?.trim();
  if (!text) throw new Error('This page carries no space snapshot.');
  const snapshots = JSON.parse(text) as SpaceSnapshot[];
  if (!Array.isArray(snapshots) || snapshots.length === 0) throw new Error('This page carries no space snapshot.');
  return snapshots;
}

const root = createRoot(document.getElementById('root')!);
try {
  root.render(<Viewer spaces={readSnapshots()} />);
} catch (err) {
  root.render(<p className="viewer-message">{err instanceof Error ? err.message : String(err)}</p>);
}
