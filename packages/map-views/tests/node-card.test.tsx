import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SpaceNode } from 'structured-context/api';
import { MapView } from '../src/layouts/MapView';
import { loadMapViewDefinitions } from '../src/node';
import { fixtureGraph } from './fixture-graph';
import sample from './fixtures/launch-playbook.json';

const graph = fixtureGraph(sample);
const [definition] = loadMapViewDefinitions({ spaces: [] }, { configDir: '/nonexistent' });

describe('node cards', () => {
  test('every card carries the id of a node in the graph, repeats included', () => {
    const html = renderToStaticMarkup(createElement(MapView, { definition: definition!, graph, values: {} }));
    const ids = [...html.matchAll(/data-node-id="([^"]*)"/g)].map((m) => m[1]!.replaceAll('&amp;', '&'));
    expect(ids.length).toBe([...html.matchAll(/role="button"/g)].length);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(graph.nodes.has(id as SpaceNode['id'])).toBe(true);
  });
});
