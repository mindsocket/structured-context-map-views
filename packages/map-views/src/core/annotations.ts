import type { nodeIssues, RuleSeverity, SpaceGraph, SpaceNode, ValidationResult } from 'structured-context/api';

// core doesn't export NodeId from `structured-context/api` yet; this derives it.
type NodeId = SpaceNode['id'];

/** How serious a result is: structured-context's rule severity, which every result carries. */
export type Severity = RuleSeverity;

/** The kind of check a result came from: structured-context's issue `kind`. */
export type AnnotationSource = 'schema' | 'duplicate' | 'broken-link' | 'hierarchy' | 'rule' | 'gated' | 'content-link';

/** Every annotation source, in the order a map view lists them. */
export const ANNOTATION_SOURCES: readonly AnnotationSource[] = [
  'schema',
  'duplicate',
  'broken-link',
  'hierarchy',
  'rule',
  'gated',
  'content-link',
];

/** One validation result attached to a node. */
export type NodeAnnotation = {
  severity: Severity;
  source: AnnotationSource;
  message: string;
  /** The violated rule, for `rule` results. */
  ruleId?: string;
};

/** A validation result with no node on the map to attach to. */
export type UnattachedAnnotation = NodeAnnotation & {
  /** The node it concerns. Absent for a global-scope rule. A node that failed its schema isn't in the graph. */
  nodeId?: NodeId;
  /** Where in that node's file the result points, if known (1-indexed). */
  line?: number;
  column?: number;
};

/** Annotations by the id of the node they apply to. */
export type AnnotationIndex = ReadonlyMap<NodeId, readonly NodeAnnotation[]>;

/**
 * Validation results to attach: each node's issues, from structured-context's `nodeIssues(result)` or the
 * `issues` of `sctx validate --json`, and the rule violations, of which only those without a node are read
 * (the others are in `issues`). `sctx validate --json` output can be passed as it is.
 */
export type ValidationInput = {
  issues: Readonly<ReturnType<typeof nodeIssues>>;
  ruleViolations?: ReadonlyArray<
    Pick<ValidationResult['ruleViolations'][number], 'nodeId' | 'ruleId' | 'severity' | 'description'>
  >;
};

const KNOWN_SOURCES = new Set<string>(ANNOTATION_SOURCES);

/**
 * Attach validation results to the nodes of `graph`, by node id. Results that can't be attached are
 * returned in `unattached` for the host to surface: global-scope rules (no node), and nodes that
 * aren't in the graph, which includes every node that failed its schema.
 */
export function annotationsFrom(
  input: ValidationInput,
  graph: SpaceGraph,
): { annotations: AnnotationIndex; unattached: UnattachedAnnotation[] } {
  const annotations = new Map<NodeId, NodeAnnotation[]>();
  const unattached: UnattachedAnnotation[] = [];

  for (const [id, issues] of Object.entries(input.issues)) {
    const nodeId = id as NodeId;
    for (const [key, { kind, message, severity, line, column }] of Object.entries(issues)) {
      // A kind this version doesn't know yet still shows, as a schema result
      const source = (KNOWN_SOURCES.has(kind) ? kind : 'schema') as AnnotationSource;
      const annotation: NodeAnnotation = {
        severity,
        source,
        message,
        ...(source === 'rule' && key.startsWith('rule:') && { ruleId: key.slice('rule:'.length) }),
      };
      if (graph.nodes.has(nodeId)) {
        annotations.set(nodeId, [...(annotations.get(nodeId) ?? []), annotation]);
      } else {
        unattached.push({
          ...annotation,
          nodeId,
          ...(line !== undefined && { line }),
          ...(column !== undefined && { column }),
        });
      }
    }
  }
  for (const { nodeId, description, severity, ruleId } of input.ruleViolations ?? []) {
    if (nodeId === undefined) unattached.push({ severity, source: 'rule', message: description, ruleId });
  }
  return { annotations, unattached };
}

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** The most serious severity among annotations, or undefined if there are none. */
export function worstSeverity(annotations: readonly NodeAnnotation[]): Severity | undefined {
  return annotations.reduce<Severity | undefined>(
    (worst, { severity }) => (worst === undefined || RANK[severity] < RANK[worst] ? severity : worst),
    undefined,
  );
}

/**
 * The annotations a map view shows: those at `level` or more serious, from `sources`. `off` shows none.
 * Nodes left with no annotations are dropped from the index.
 */
export function filterAnnotations(
  index: AnnotationIndex,
  level: Severity | 'off',
  sources: readonly AnnotationSource[],
): AnnotationIndex {
  if (level === 'off') return new Map();
  const filtered = new Map<NodeId, readonly NodeAnnotation[]>();
  for (const [id, annotations] of index) {
    const kept = annotations.filter((a) => RANK[a.severity] <= RANK[level] && sources.includes(a.source));
    if (kept.length > 0) filtered.set(id, kept);
  }
  return filtered;
}
