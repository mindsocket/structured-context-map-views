import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SpaceNode } from 'structured-context/api';
import { MapView } from '../src/components/MapView';
import { type LayoutConfig, parseMapViewDefinition } from '../src/core/definition';
import {
  buildLandscape,
  type LandscapeGroup,
  type LandscapeOccurrence,
} from '../src/core/layouts/landscape/projection';
import { jsonlFixtureGraph } from './fixture-graph';

const graph = jsonlFixtureGraph('sdlc');
const nodesOf = (type: string) => [...graph.nodes.values()].filter((n) => n.resolvedType === type);
const stages = nodesOf('Stage');
const actors = nodesOf('Actor');
const tools = nodesOf('Tool');
const steps = nodesOf('Step');

/** The titles a node's wikilink field names. */
const linked = (node: SpaceNode, field: string): string[] => {
  const raw = node.schemaData[field];
  return (Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]).map((v) => String(v).replace(/^\[\[|\]\]$/g, ''));
};
const stageOf = (step: SpaceNode) => linked(step, 'stage')[0];
const actorsOf = (step: SpaceNode) => linked(step, 'actors');
/** The titles the given steps name in a field, in the space's order of `all`. */
const reached = (of: SpaceNode[], field: string, all: SpaceNode[]) => {
  const names = new Set(of.flatMap((s) => linked(s, field)));
  return all.filter((n) => names.has(n.title)).map((n) => n.title);
};

type Config = LayoutConfig<'landscape'>;
const level = (type: string, extra: object = {}) => ({ type, intermediate: 'hidden' as const, ...extra });
const step = level('Step');
const strip = (group: Config['strips'][number]['group'], dimension?: Config['dimension'], showUngrouped = true) => ({
  group,
  showUngrouped,
  ...(dimension && { dimension }),
});
const layout = (strips: Config['strips'], dimension?: Config['dimension']): Config => ({
  type: 'landscape',
  orientation: 'horizontal',
  strips,
  ...(dimension && { dimension }),
});

const title = (o: Pick<LandscapeOccurrence, 'item'>) =>
  o.item.kind === 'node' ? o.item.node.title : String(o.item.value);
const cellTitles = (cell: { children: LandscapeOccurrence[] }) => cell.children.map(title);
const unplaced = steps.filter((s) => stageOf(s) === undefined || actorsOf(s).length === 0);
const build = (config: Config) => buildLandscape(graph, 'main', config);

describe('one strip with a layout dimension', () => {
  const grid = build(layout([strip([step])], { type: 'Stage' }));
  const [only] = grid.strips;

  test('the strip has a cell for every group, and the steps that belong to it', () => {
    expect(grid.dimension!.map(title)).toEqual(stages.map((n) => n.title));
    expect(only!.dimension).toBeUndefined();
    expect(only!.cells.map((c) => c.at)).toEqual(stages.map((_, i) => [i, 0]));
    for (const cell of only!.cells) {
      const stage = title(grid.dimension![cell.at[0]]!);
      expect(cellTitles(cell)).toEqual(steps.filter((s) => stageOf(s) === stage).map((s) => s.title));
    }
  });

  test('a group with nothing in it still has its cell, and steps with no stage are ungrouped', () => {
    expect(only!.cells.some((c) => c.children.length === 0)).toBe(true);
    expect(only!.ungrouped.map(title)).toEqual(steps.filter((s) => stageOf(s) === undefined).map((s) => s.title));
  });

  test('a strip with only its own dimension holds the same cells, the other way round', () => {
    const transposed = build(layout([strip([step], { type: 'Stage' })]));
    expect(transposed.dimension).toBeUndefined();
    expect(transposed.strips[0]!.dimension!.map(title)).toEqual(grid.dimension!.map(title));
    expect(transposed.strips[0]!.cells.map((c) => c.at)).toEqual(stages.map((_, j) => [0, j]));
    expect(transposed.strips[0]!.cells.map(cellTitles)).toEqual(only!.cells.map(cellTitles));
  });
});

describe('a layout dimension and a strip dimension (swimlane)', () => {
  const grid = build(layout([strip([step], { type: 'Actor', edge: { field: 'actors' } })], { type: 'Stage' }));
  const [only] = grid.strips;
  const own = only!.dimension as LandscapeGroup[];

  test('the cells are the cross product, the layout dimension varying slowest', () => {
    expect(own.map(title)).toEqual(actors.map((n) => n.title));
    expect(only!.cells.map((c) => c.at)).toEqual(stages.flatMap((_, i) => actors.map((_, j) => [i, j])));
    expect(new Set(only!.cells.map((c) => c.key)).size).toBe(only!.cells.length);
  });

  test('a cell holds the steps in its stage with its actor; empty cells and empty stages are present', () => {
    for (const cell of only!.cells) {
      const stage = title(grid.dimension![cell.at[0]]!);
      const actor = title(own[cell.at[1]]!);
      expect(cellTitles(cell)).toEqual(
        steps.filter((s) => stageOf(s) === stage && actorsOf(s).includes(actor)).map((s) => s.title),
      );
    }
    const emptyStage = stages.find((s) => !steps.some((x) => stageOf(x) === s.title))!;
    const index = grid.dimension!.findIndex((g) => title(g) === emptyStage.title);
    expect(only!.cells.filter((c) => c.at[0] === index).every((c) => c.children.length === 0)).toBe(true);
  });

  test('a step with several actors repeats in each of their cells, in full', () => {
    const several = steps.find((s) => stageOf(s) !== undefined && actorsOf(s).length > 1)!;
    const placed = only!.cells.flatMap((c) => c.children).filter((o) => title(o) === several.title);
    expect(placed).toHaveLength(actorsOf(several).length);
    expect(placed.slice(1).every((o) => o.repeatOf === placed[0]!.key)).toBe(true);
  });

  test('steps missing either dimension are ungrouped; field dimensions agree with type dimensions', () => {
    expect(only!.ungrouped.map(title)).toEqual(unplaced.map((s) => s.title));
    const byField = build(layout([strip([step], { field: 'actors' })], { field: 'stage' }));
    expect(byField.strips[0]!.ungrouped.map(title)).toEqual(only!.ungrouped.map(title));
    expect(new Set(byField.strips[0]!.cells.flatMap(cellTitles))).toEqual(new Set(only!.cells.flatMap(cellTitles)));
  });

  test('a value no step has is not a field group, unlike a node of a type dimension', () => {
    const byField = build(layout([strip([step], { field: 'actors' })], { field: 'stage' }));
    const emptyStage = stages.find((s) => !steps.some((x) => stageOf(x) === s.title))!;
    expect(byField.dimension!.map(title)).not.toContain(`[[${emptyStage.title}]]`);
  });

  test('an `edge` that is not the join leaves every cell empty', () => {
    const none = build(layout([strip([step], { type: 'Actor', edge: { field: 'tools' } })], { type: 'Stage' }));
    expect(none.strips[0]!.cells.every((c) => c.children.length === 0)).toBe(true);
  });

  test('a cell holds several grouping levels', () => {
    const nested = build(layout([strip([step, level('Tool')], { type: 'Actor' })], { type: 'Stage' }));
    const occurrences = nested.strips[0]!.cells.flatMap((c) => c.children);
    expect(occurrences.length).toBeGreaterThan(0);
    for (const o of occurrences) {
      const node = (o.item as { node: SpaceNode }).node;
      expect(o.children.map(title).sort()).toEqual(linked(node, 'tools').sort());
    }
  });
});

describe('a strip joined through `via` (blueprint)', () => {
  const config = layout([strip([step]), strip([level('Tool', { via: ['Step'] })])], { type: 'Stage' });
  const grid = build(config);
  const [stepStrip, toolStrip] = grid.strips;

  test('every strip has the layout dimension’s groups, so the strips line up', () => {
    expect(stepStrip!.cells.map((c) => c.at)).toEqual(toolStrip!.cells.map((c) => c.at));
    expect(toolStrip!.cells).toHaveLength(stages.length);
  });

  test('a stage holds each tool its steps reach once, however many steps reach it', () => {
    for (const cell of toolStrip!.cells) {
      const stage = title(grid.dimension![cell.at[0]]!);
      const inStage = steps.filter((s) => stageOf(s) === stage);
      expect(cell.children.map(title)).toEqual(reached(inStage, 'tools', tools));
    }
  });

  test('a tool reached from several stages repeats in full, and keys are unique across strips', () => {
    const byTitle = Map.groupBy(
      toolStrip!.cells.flatMap((c) => c.children),
      title,
    );
    const several = [...byTitle.values()].find((list) => list.length > 1)!;
    expect(several[0]!.repeatOf).toBeUndefined();
    expect(several.slice(1).every((o) => o.repeatOf === several[0]!.key)).toBe(true);
    const keys = grid.strips.flatMap((s) => s.cells.flatMap((c) => [c.key, ...c.children.map((o) => o.key)]));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('a strip joined through `via` lists the nodes no stage reached', () => {
    const reachedTools = new Set(steps.filter((s) => stageOf(s)).flatMap((s) => linked(s, 'tools')));
    expect(toolStrip!.ungrouped.map(title)).toEqual(
      tools.filter((t) => !reachedTools.has(t.title)).map((t) => t.title),
    );
  });
});

describe('a swimlane strip beside a strip joined through `via` (hybrid)', () => {
  const grid = build(
    layout([strip([step], { type: 'Actor', edge: { field: 'actors' } }), strip([level('Tool', { via: ['Step'] })])], {
      type: 'Stage',
    }),
  );

  test('the first strip is the grid of both dimensions; the other has one cell per stage', () => {
    expect(grid.strips[0]!.cells).toHaveLength(stages.length * actors.length);
    expect(grid.strips[1]!.cells.map((c) => c.at)).toEqual(stages.map((_, i) => [i, 0]));
  });

  test('a stage’s tools come from all its steps, not only those placed under an actor', () => {
    for (const cell of grid.strips[1]!.cells) {
      const stage = title(grid.dimension![cell.at[0]]!);
      expect(cell.children.map(title)).toEqual(
        reached(
          steps.filter((s) => stageOf(s) === stage),
          'tools',
          tools,
        ),
      );
    }
  });
});

describe('strips with their own dimensions and no layout dimension', () => {
  const grid = build(layout([strip([step], { type: 'Stage' }), strip([step], { type: 'Actor' })]));

  test('each strip is divided by its own dimension alone', () => {
    expect(grid.strips[0]!.cells).toHaveLength(stages.length);
    expect(grid.strips[1]!.cells).toHaveLength(actors.length);
  });

  test('a step appears in both strips, a repeat in the second, with unique keys', () => {
    const inFirst = grid.strips[0]!.cells.flatMap(cellTitles);
    const second = grid.strips[1]!.cells.flatMap((c) => c.children);
    const both = second.filter((o) => inFirst.includes(title(o)));
    expect(both.length).toBeGreaterThan(0);
    expect(both.every((o) => o.repeatOf !== undefined)).toBe(true);
    const keys = grid.strips.flatMap((s) => s.cells.flatMap((c) => [c.key, ...c.children.map((o) => o.key)]));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('hiding ungrouped nodes', () => {
  const config = layout([strip([step], undefined, false), strip([level('Tool', { via: ['Step'] })])], {
    type: 'Stage',
  });
  const grid = build(config);

  test('a hidden strip has no ungrouped nodes, and the nodes it would list are not drawn', () => {
    const shown = build(layout([strip([step]), strip([level('Tool', { via: ['Step'] })])], { type: 'Stage' }));
    expect(shown.strips[0]!.ungrouped.length).toBeGreaterThan(0);
    expect(grid.strips[0]!.ungrouped).toEqual([]);
    const drawn = new Set(grid.strips[0]!.cells.flatMap(cellTitles));
    for (const orphan of shown.strips[0]!.ungrouped) expect(drawn.has(title(orphan))).toBe(false);
  });

  test('the cells and the other strips are unaffected', () => {
    const shown = build(layout([strip([step]), strip([level('Tool', { via: ['Step'] })])], { type: 'Stage' }));
    expect(grid.strips[0]!.cells.map(cellTitles)).toEqual(shown.strips[0]!.cells.map(cellTitles));
    expect(grid.strips[1]).toEqual(shown.strips[1]);
  });

  test('a hidden strip draws no ungrouped box, and the others still do', () => {
    const html = (body: string) =>
      renderToStaticMarkup(
        createElement(MapView, {
          definition: parseMapViewDefinition(
            't',
            `{ $id: 'sctx-map-view://t', regions: [{ id: 'main', layout: { type: 'landscape', ${body} } }] }`,
          ),
          graph,
          values: {},
        }),
      );
    const both = (show: boolean) =>
      `strips: [{ showUngrouped: ${show}, dimension: { type: 'Stage' }, group: [{ type: 'Step' }] }, { dimension: { type: 'Actor' }, group: [{ type: 'Step' }] }]`;
    expect([...html(both(true)).matchAll(/data-ungrouped/g)]).toHaveLength(2);
    expect([...html(both(false)).matchAll(/data-ungrouped/g)]).toHaveLength(1);
  });
});

describe('without dimensions', () => {
  test('several strips without dimensions are a grid with one cell each', () => {
    const grid = build(layout([strip([step]), strip([level('Tool')])]));
    expect(grid.strips.map((s) => s.cells.length)).toEqual([1, 1]);
    expect(grid.strips[0]!.cells[0]!.children).toHaveLength(steps.length);
  });
});

describe('rendering', () => {
  const html = (orientation: string, body: string) =>
    renderToStaticMarkup(
      createElement(MapView, {
        definition: parseMapViewDefinition(
          't',
          `{ $id: 'sctx-map-view://t', regions: [{ id: 'main', layout: { type: 'landscape', orientation: '${orientation}', ${body} } }] }`,
        ),
        graph,
        values: {},
      }),
    );
  const blueprint =
    "dimension: { type: 'Stage' }, strips: [{ group: [{ type: 'Step' }] }, { group: [{ type: 'Tool', via: ['Step'] }] }]";
  const hybrid =
    "dimension: { type: 'Stage' }, strips: [{ dimension: { type: 'Actor' }, group: [{ type: 'Step' }] }, { group: [{ type: 'Tool', via: ['Step'] }] }]";

  test('every strip has a cell for each of its groups', () => {
    const page = html('horizontal', blueprint);
    expect([...page.matchAll(/data-strip-cell="0"/g)]).toHaveLength(stages.length);
    expect([...page.matchAll(/data-strip-cell="1"/g)]).toHaveLength(stages.length);
    const swimlane = html('horizontal', hybrid);
    expect([...swimlane.matchAll(/data-strip-cell="0"/g)]).toHaveLength(stages.length * actors.length);
    expect([...swimlane.matchAll(/data-dimension="strip"/g)]).toHaveLength(actors.length);
  });

  test('a plain nested landscape draws no grid', () => {
    expect(html('horizontal', "strips: [{ group: [{ type: 'Stage' }, { type: 'Step' }] }]")).not.toContain('data-grid');
  });

  test('orientation moves the layout dimension’s headings to the other axis, in one place', () => {
    const across = html('horizontal', hybrid).match(/data-dimension="layout"[^>]*style="([^"]*)"/)![1]!;
    const down = html('vertical', hybrid).match(/data-dimension="layout"[^>]*style="([^"]*)"/)![1]!;
    expect(across).toContain('grid-row:1');
    expect(down).toContain('grid-column:1');
    const name = (orientation: string) => html(orientation, hybrid).match(/data-strip-name[^>]*style="([^"]*)"/)![1]!;
    expect(name('horizontal')).toMatch(/grid-column:1;/);
    expect(name('vertical')).toMatch(/grid-row:1$/);
  });
});
