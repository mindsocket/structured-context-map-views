import { describe, expect, test } from 'bun:test';
import { buildSpaceGraph } from 'structured-context/api';
import { makeSpaceNode } from 'structured-context/testing';
import { VALIDATION_ISSUE_KINDS } from 'structured-context/types';
import { annotationsFrom, filterAnnotations, type NodeAnnotation, worstSeverity } from '../src/core/annotations';

const graph = buildSpaceGraph([makeSpaceNode('A', 'Thing'), makeSpaceNode('B', 'Thing')], undefined);
const idOf = (title: string) => [...graph.nodes.values()].find((n) => n.title === title)!.id;
const missing = 'not-in-graph' as ReturnType<typeof idOf>;

describe('annotationsFrom', () => {
  test('attaches each node issue to its node, with its source and severity', () => {
    const { annotations, unattached } = annotationsFrom(
      {
        issues: [
          { kind: 'hierarchy', message: 'bad parent', severity: 'error', nodeId: idOf('A') },
          { kind: 'rule', message: 'needs an owner', severity: 'warning', nodeId: idOf('A'), ruleId: 'owner' },
          { kind: 'content-link', message: 'Unresolved content link: Gone', severity: 'info', nodeId: idOf('A') },
          { kind: 'schema', message: 'one', severity: 'error', nodeId: idOf('B') },
          { kind: 'schema', message: 'two', severity: 'error', nodeId: idOf('B') },
        ],
      },
      graph,
    );
    expect(unattached).toEqual([]);
    expect(annotations.get(idOf('A'))?.map((a) => [a.source, a.severity, a.ruleId])).toEqual([
      ['hierarchy', 'error', undefined],
      ['rule', 'warning', 'owner'],
      ['content-link', 'info', undefined],
    ]);
    expect(annotations.get(idOf('B'))).toHaveLength(2);
  });

  test('returns results with no node on the graph as unattached, keeping where they point', () => {
    const { annotations, unattached } = annotationsFrom(
      {
        issues: [
          { kind: 'schema', message: 'bad', severity: 'error', nodeId: missing, source: { file: 'x.md', line: 3 } },
          { kind: 'rule', message: 'global rule', severity: 'error', ruleId: 'r' },
          { kind: 'parse', message: 'bad yaml', severity: 'error', source: { file: 'y.md' } },
        ],
      },
      graph,
    );
    expect(annotations.size).toBe(0);
    expect(unattached.map((u) => [u.nodeId, u.source, u.location?.file, u.location?.line])).toEqual([
      [missing, 'schema', 'x.md', 3],
      [undefined, 'rule', undefined, undefined],
      [undefined, 'parse', 'y.md', undefined],
    ]);
  });

  test('accepts no issues', () => {
    expect(annotationsFrom({ issues: [] }, graph)).toEqual({ annotations: new Map(), unattached: [] });
  });
});

describe('filterAnnotations', () => {
  const a: NodeAnnotation[] = [
    { severity: 'info', source: 'rule', message: 'i' },
    { severity: 'warning', source: 'rule', message: 'w' },
    { severity: 'error', source: 'schema', message: 'e' },
  ];
  const index = new Map([[idOf('A'), a]]);
  const all = VALIDATION_ISSUE_KINDS;

  test('the level is a minimum severity', () => {
    expect(
      filterAnnotations(index, 'error', all)
        .get(idOf('A'))
        ?.map((x) => x.message),
    ).toEqual(['e']);
    expect(
      filterAnnotations(index, 'warning', all)
        .get(idOf('A'))
        ?.map((x) => x.message),
    ).toEqual(['w', 'e']);
    expect(filterAnnotations(index, 'info', all).get(idOf('A'))).toHaveLength(3);
  });

  test('off shows nothing, and sources narrow what shows', () => {
    expect(filterAnnotations(index, 'off', all).size).toBe(0);
    expect(
      filterAnnotations(index, 'info', ['schema'])
        .get(idOf('A'))
        ?.map((x) => x.message),
    ).toEqual(['e']);
    expect(filterAnnotations(index, 'info', []).size).toBe(0);
  });

  test('worstSeverity picks the most serious', () => {
    expect(worstSeverity(a)).toBe('error');
    expect(worstSeverity([])).toBeUndefined();
  });
});
