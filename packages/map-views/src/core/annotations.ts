import type { RuleSeverity, SpaceGraph, SpaceNode, ValidationResult } from 'structured-context/api';
import type { SourceLocation, ValidationIssueKind } from 'structured-context/types';

// core doesn't export NodeId from `structured-context/api` yet; this derives it.
type NodeId = SpaceNode['id'];

/** How serious a result is: structured-context's rule severity, which every result carries. */
export type Severity = RuleSeverity;

/** The kind of check a result came from: structured-context's issue `kind`. */
export type AnnotationSource = ValidationIssueKind;

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
  /** The node it concerns. Absent for a parse issue or a global rule. A node that failed its type isn't in the graph. */
  nodeId?: NodeId;
  /** Where the result points, if known. */
  location?: SourceLocation;
};

/** Annotations by the id of the node they apply to. */
export type AnnotationIndex = ReadonlyMap<NodeId, readonly NodeAnnotation[]>;

type Issue = ValidationResult['issues'][number];

/**
 * Validation results to attach: structured-context's issues, from a `ValidationResult` or the output of
 * `sctx validate --json`, either of which can be passed as it is.
 */
export type ValidationInput = {
  issues: ReadonlyArray<Pick<Issue, 'kind' | 'severity' | 'message' | 'nodeId' | 'source'> & { ruleId?: string }>;
};

/**
 * Attach validation results to the nodes of `graph`, by node id. Results that can't be attached are
 * returned in `unattached` for the host to surface: parse issues and global rules (no node), and nodes
 * that aren't in the graph.
 */
export function annotationsFrom(
  input: ValidationInput,
  graph: SpaceGraph,
): { annotations: AnnotationIndex; unattached: UnattachedAnnotation[] } {
  const annotations = new Map<NodeId, NodeAnnotation[]>();
  const unattached: UnattachedAnnotation[] = [];

  for (const { kind, severity, message, nodeId, source, ruleId } of input.issues) {
    const annotation: NodeAnnotation = {
      severity,
      source: kind,
      message,
      ...(kind === 'rule' && ruleId !== undefined && { ruleId }),
    };
    if (nodeId !== undefined && graph.nodes.has(nodeId)) {
      annotations.set(nodeId, [...(annotations.get(nodeId) ?? []), annotation]);
    } else {
      unattached.push({
        ...annotation,
        ...(nodeId !== undefined && { nodeId }),
        ...(source !== undefined && { location: source }),
      });
    }
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
