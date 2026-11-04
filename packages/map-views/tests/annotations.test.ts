import { describe, expect, test } from 'bun:test';
import { buildSpaceGraph } from 'structured-context/api';
import { makeSpaceNode } from 'structured-context/testing';
import { annotationsFrom, filterAnnotations, type NodeAnnotation, worstSeverity } from '../src/core/annotations';

const graph = buildSpaceGraph([makeSpaceNode('A', 'Thing'), makeSpaceNode('B', 'Thing')], undefined);
const idOf = (title: string) => [...graph.nodes.values()].find((n) => n.title === title)!.id;
const missing = 'not-in-graph' as ReturnType<typeof idOf>;

const rule = (
  nodeId: ReturnType<typeof idOf> | undefined,
  severity: 'error' | 'warning' | 'info',
  description: string,
) => ({ nodeId, ruleId: 'r', category: 'expression', severity, description }) as never;
const schemaError = (message: string) => ({
  instancePath: '/status',
  message,
  keyword: 'type',
  schemaPath: '',
  params: {},
});

describe('annotationsFrom', () => {
  test('attaches each kind of result to its node, with its source and severity', () => {
    const { annotations, unattached } = annotationsFrom(
      {
        ruleViolations: [rule(idOf('A'), 'warning', 'needs an owner')],
        hierarchyViolations: [
          {
            nodeId: idOf('A'),
            nodeType: 'Thing',
            nodeTitle: 'A',
            parentType: 'X',
            parentTitle: 'P',
            description: 'bad parent',
          },
        ],
        nodeErrors: [{ nodeId: idOf('B'), errors: [schemaError('one'), schemaError('two')] }],
      },
      graph,
    );
    expect(unattached).toEqual([]);
    expect(annotations.get(idOf('A'))?.map((a) => [a.source, a.severity])).toEqual([
      ['hierarchy', 'error'],
      ['rule', 'warning'],
    ]);
    // one annotation per schema error
    expect(annotations.get(idOf('B'))).toHaveLength(2);
  });

  test('returns results with no node on the graph as unattached, keeping where they came from', () => {
    const source = { file: 'broken.md', line: 3 };
    const { annotations, unattached } = annotationsFrom(
      {
        ruleViolations: [rule(undefined, 'error', 'global rule'), rule(missing, 'info', 'unknown node')],
        nodeErrors: [{ nodeId: missing, source, errors: [schemaError('bad')] }],
      },
      graph,
    );
    expect(annotations.size).toBe(0);
    expect(unattached.map((u) => [u.nodeId, u.source])).toEqual([
      [missing, 'schema'],
      [undefined, 'rule'],
      [missing, 'rule'],
    ]);
    expect(unattached.find((u) => u.source === 'schema')?.location).toEqual(source);
  });

  test('accepts partial input', () => {
    expect(annotationsFrom({}, graph)).toEqual({ annotations: new Map(), unattached: [] });
  });
});

describe('filterAnnotations', () => {
  const a: NodeAnnotation[] = [
    { severity: 'info', source: 'rule', message: 'i' },
    { severity: 'warning', source: 'rule', message: 'w' },
    { severity: 'error', source: 'schema', message: 'e' },
  ];
  const index = new Map([[idOf('A'), a]]);
  const all = ['schema', 'hierarchy', 'rule'] as const;

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
