import type { RuleSeverity, SourceLocation, SpaceGraph, SpaceNode, ValidationResult } from 'structured-context/api';

// core doesn't export NodeId from `structured-context/api` yet; this derives it.
type NodeId = SpaceNode['id'];

/** How serious a result is: structured-context's rule severity. Schema and hierarchy failures are errors. */
export type Severity = RuleSeverity;

/** The kind of check a result came from. */
export type AnnotationSource = 'schema' | 'hierarchy' | 'rule';

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
  /** Where that node is defined, if known. */
  location?: SourceLocation;
};

/** Annotations by the id of the node they apply to. */
export type AnnotationIndex = ReadonlyMap<NodeId, readonly NodeAnnotation[]>;

/**
 * The parts of structured-context's `ValidationResult` that attach to a node. Every part is optional:
 * a host that only runs some checks (the Obsidian plugin runs no AI-judged rules, say) passes what it has.
 */
export type ValidationInput = Partial<
  Pick<ValidationResult, 'ruleViolations' | 'hierarchyViolations'> & {
    nodeErrors: ReadonlyArray<Pick<ValidationResult['nodeErrors'][number], 'nodeId' | 'source' | 'issues'>>;
  }
>;

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
  const add = (nodeId: NodeId | undefined, annotation: NodeAnnotation, location?: SourceLocation) => {
    if (nodeId !== undefined && graph.nodes.has(nodeId)) {
      annotations.set(nodeId, [...(annotations.get(nodeId) ?? []), annotation]);
    } else {
      unattached.push({ ...annotation, nodeId, ...(location && { location }) });
    }
  };

  for (const { nodeId, source, issues } of input.nodeErrors ?? []) {
    for (const issue of issues) {
      add(nodeId, { severity: 'error', source: 'schema', message: issue.message }, source);
    }
  }
  for (const { nodeId, description } of input.hierarchyViolations ?? []) {
    add(nodeId, { severity: 'error', source: 'hierarchy', message: description });
  }
  for (const { nodeId, description, severity, ruleId } of input.ruleViolations ?? []) {
    add(nodeId, { severity, source: 'rule', message: description, ruleId });
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
