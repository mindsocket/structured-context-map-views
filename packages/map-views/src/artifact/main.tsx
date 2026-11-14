import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { SpaceGraph, SpaceNode } from 'structured-context/browser';
import type { MapViewDefinition } from '../core/definition';
import type { SpaceSnapshot } from '../core/snapshot';
import { Viewer } from '../viewer/Viewer';
import { loadSpaces } from './load';

/**
 * The host for a Claude artifact: shows the spaces the publishing agent wrote to the artifact's db in the
 * viewer, and names cards for the artifact's comment mode. It ships as `dist/artifact.js`;
 * `dist/artifact.html` is the page that loads it. See docs/architecture.md.
 */

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; spaces: SpaceSnapshot[] };

function App() {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    loadSpaces().then(
      (spaces) => setState({ status: 'ready', spaces }),
      (err) => setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
    );
  }, []);
  if (state.status === 'loading') return <p className="viewer-message">Loading from the artifact database…</p>;
  if (state.status === 'error') return <p className="viewer-message">{state.message}</p>;
  return <Viewer spaces={state.spaces} cardLabel={commentLabel} />;
}

const positionsByGraph = new WeakMap<SpaceGraph, Map<string, number>>();

/**
 * The comment mode reads a comment's location from the element's accessible name, cut at about 45
 * characters. Node ids are long (a file and heading), so the name leads with the node's position in the
 * stored graph, then its title and the view: `[<index>] <title> · <view>`. An agent reading the comment
 * takes `graph.nodes[<index>]` from the db and checks the title.
 */
function commentLabel(node: SpaceNode, graph: SpaceGraph, definition: MapViewDefinition): string {
  let positions = positionsByGraph.get(graph);
  if (!positions) {
    positions = new Map([...graph.nodes.keys()].map((id, index) => [id as string, index]));
    positionsByGraph.set(graph, positions);
  }
  const view = definition.id.slice(definition.id.lastIndexOf('/') + 1);
  return `[${positions.get(node.id as string)}] ${node.title} · ${view}`;
}

createRoot(document.getElementById('root')!).render(<App />);
