import { type ComponentType, useId, useMemo } from 'react';
import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import { type AnnotationIndex, filterAnnotations } from '../core/annotations';
import { type LayoutConfig, type MapViewDefinition, type ParameterValues, resolveRegions } from '../core/definition';
import { AnnotationsContext } from './annotations-context';
import { GraphLayout } from './GraphLayout';
import { LandscapeLayout } from './LandscapeLayout';
import type { LayoutProps } from './layout';
import { NeighbourhoodLayout } from './NeighbourhoodLayout';
import { TreeLayout } from './TreeLayout';
import { XYLayout } from './XYLayout';

type Props = {
  definition: MapViewDefinition;
  graph: SpaceGraph;
  /** Current parameter values (host-owned session state); missing values use defaults. */
  values?: ParameterValues;
  /**
   * Validation results by node (see `annotationsFrom`). Which of them show, and at what severity, is
   * the region's `nodes.validation` setting; with none supplied, nothing is drawn.
   */
  annotations?: AnnotationIndex;
  onNodeSelect?: (node: SpaceNode) => void;
  focus?: LayoutProps['focus'];
  onFocusChange?: LayoutProps['onFocusChange'];
};

const EMPTY: AnnotationIndex = new Map();

const LAYOUTS: { [T in LayoutConfig['type']]: ComponentType<LayoutProps<Extract<LayoutConfig, { type: T }>>> } = {
  tree: TreeLayout,
  landscape: LandscapeLayout,
  xy: XYLayout,
  neighbourhood: NeighbourhoodLayout,
  graph: GraphLayout,
};

/** Renders a map view definition against a space. Sizes to its container and scrolls within it. */
export function MapView({ definition, graph, values, annotations, onNodeSelect, focus, onFocusChange }: Props) {
  const instanceId = useId();
  const regions = useMemo(() => resolveRegions(definition, values), [definition, values]);
  // PROTOTYPE: only the first region is rendered. Arranging several regions is undesigned (#8).
  const region = regions[0]!;
  // TypeScript can't relate the region's layout type to the component it indexes.
  const Layout = LAYOUTS[region.layout.type] as ComponentType<LayoutProps>;

  const { validation, validationSources } = region.nodes;
  const visibleAnnotations = useMemo(
    () => (annotations ? filterAnnotations(annotations, validation, validationSources) : EMPTY),
    [annotations, validation, validationSources],
  );

  return (
    <AnnotationsContext.Provider value={visibleAnnotations}>
      <div className="mv:h-full mv:w-full mv:overflow-auto mv:bg-surface mv:text-ink">
        <Layout
          graph={graph}
          region={region}
          instanceId={instanceId}
          onNodeSelect={onNodeSelect}
          focus={focus}
          onFocusChange={onFocusChange}
        />
      </div>
    </AnnotationsContext.Provider>
  );
}
