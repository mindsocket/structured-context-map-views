import { describe, expect, test } from 'bun:test';
import { buildSpaceGraph } from 'structured-context/api';
import { makeSpaceNode } from 'structured-context/testing';
import {
  ANNOTATION_SOURCES,
  annotationsFrom,
  filterAnnotations,
  type NodeAnnotation,
  worstSeverity,
} from '../src/core/annotations';

const graph = buildSpaceGraph([makeSpaceNode('A', 'Thing'), makeSpaceNode('B', 'Thing')], undefined);
const idOf = (title: string) => [...graph.nodes.values()].find((n) => n.title === title)!.id;
const missing = 'not-in-graph' as ReturnType<typeof idOf>;

const rule = (
  nodeId: ReturnType<typeof idOf> | undefined,
  severity: 'error' | 'warning' | 'info',
  description: string,
) => ({ nodeId, ruleId: 'r', severity, description });

describe('annotationsFrom', () => {
  test('attaches each node issue to its node, with its source and severity', () => {
    const { annotations, unattached } = annotationsFrom(
      {
        issues: {
          [idOf('A')]: {
            'hierarchy:bad parent': { kind: 'hierarchy', message: 'bad parent', severity: 'error' },
            'rule:owner': { kind: 'rule', message: 'needs an owner', severity: 'warning' },
            'content-link:Gone': { kind: 'content-link', message: 'Unresolved content link: Gone', severity: 'info' },
          },
          [idOf('B')]: {
            'schema:one': { kind: 'schema', message: 'one', severity: 'error' },
            'schema:two': { kind: 'schema', message: 'two', severity: 'error' },
          },
        },
        // node rule violations are already in `issues`
        ruleViolations: [rule(idOf('A'), 'warning', 'needs an owner')],
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
        issues: { [missing]: { 'schema:bad': { kind: 'schema', message: 'bad', severity: 'error', line: 3 } } },
        ruleViolations: [rule(undefined, 'error', 'global rule')],
      },
      graph,
    );
    expect(annotations.size).toBe(0);
    expect(unattached.map((u) => [u.nodeId, u.source, u.line])).toEqual([
      [missing, 'schema', 3],
      [undefined, 'rule', undefined],
    ]);
  });

  test('accepts no issues', () => {
    expect(annotationsFrom({ issues: {} }, graph)).toEqual({ annotations: new Map(), unattached: [] });
  });
});

describe('filterAnnotations', () => {
  const a: NodeAnnotation[] = [
    { severity: 'info', source: 'rule', message: 'i' },
    { severity: 'warning', source: 'rule', message: 'w' },
    { severity: 'error', source: 'schema', message: 'e' },
  ];
  const index = new Map([[idOf('A'), a]]);
  const all = ANNOTATION_SOURCES;

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
