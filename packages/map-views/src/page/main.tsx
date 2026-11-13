import { createRoot } from 'react-dom/client';
import type { SpaceSnapshot } from '../core/snapshot';
import { Viewer } from '../viewer/Viewer';

/**
 * The host for a self-contained HTML page: shows the snapshots carried inline in the page, in the
 * `<script type="application/json" id="sctx-snapshots">` element that `fillPage` writes. It reads nothing
 * else, so the page works offline. See docs/architecture.md.
 */

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
