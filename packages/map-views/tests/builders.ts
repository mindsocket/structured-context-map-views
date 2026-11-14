import type {
  BaseNode,
  Hierarchy,
  HierarchyLevel,
  NodeId,
  ResolvedParentRef,
  SpaceNode,
} from 'structured-context/types';

export const makeParentRef = (id: string, overrides: Partial<ResolvedParentRef> = {}): ResolvedParentRef => {
  const kind = overrides.kind ?? 'hierarchy';
  return {
    id: id as NodeId,
    field: 'parent',
    kind,
    ...(kind === 'hierarchy' ? { hierarchy: 'main' } : {}),
    selfRef: false,
    fieldOn: 'child',
    ...overrides,
  };
};

export const makeLevel = (type: string, overrides: Partial<HierarchyLevel> = {}): HierarchyLevel => ({
  type,
  field: 'parent',
  fieldOn: 'child',
  multiple: false,
  selfRef: false,
  ...overrides,
});

export const makeHierarchy = (levels: HierarchyLevel[], overrides: Partial<Hierarchy> = {}): Hierarchy => ({
  name: 'main',
  levels,
  ...overrides,
});

const makeNode = (title: string, type: string, extra: Record<string, unknown>, linkTargets?: string[]): BaseNode => ({
  id: title as NodeId,
  title,
  schemaData: { title, type, ...extra },
  linkTargets: linkTargets ?? [title],
  type,
});

export const makeSpaceNode = (
  title: string,
  type: string,
  extra: Record<string, unknown> = {},
  linkTargets?: string[],
  resolvedParents: ResolvedParentRef[] = [],
  resolvedLinks: SpaceNode['resolvedLinks'] = [],
): SpaceNode => ({
  ...makeNode(title, type, extra, linkTargets),
  resolvedType: type,
  resolvedParents,
  resolvedLinks,
});
