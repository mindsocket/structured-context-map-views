import { useId, useMemo } from 'react';
import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import { type AnnotationIndex, filterAnnotations } from '../core/annotations';
import { type MapViewDefinition, type ParameterValues, type Region, resolveRegions } from '../core/definition';
import { AnnotationsContext } from './annotations-context';
import { LandscapeLayout } from './LandscapeLayout';
import { type LayoutProps, TreeLayout } from './TreeLayout';
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
};

const EMPTY: AnnotationIndex = new Map();

/** Renders a map view definition against a space. Sizes to its container and scrolls within it. */
export function MapView({ definition, graph, values, annotations, onNodeSelect }: Props) {
  const instanceId = useId();
  const regions = useMemo(() => resolveRegions(definition, values), [definition, values]);
  // PROTOTYPE: only the first region is rendered. Arranging several regions is undesigned (#8).
  const region = regions[0]!;
  const props = { graph, instanceId, onNodeSelect };
  const { validation, validationSources } = region.nodes;
  const visibleAnnotations = useMemo(
    () => (annotations ? filterAnnotations(annotations, validation, validationSources) : EMPTY),
    [annotations, validation, validationSources],
  );

  return (
    <AnnotationsContext.Provider value={visibleAnnotations}>
      <div className="mv:h-full mv:w-full mv:overflow-auto mv:bg-surface mv:text-ink">{layoutFor(region, props)}</div>
    </AnnotationsContext.Provider>
  );
}

function layoutFor(region: Region, props: Omit<LayoutProps, 'region'>) {
  const { layout } = region;
  switch (layout.type) {
    case 'tree':
      return <TreeLayout {...props} region={{ ...region, layout }} />;
    case 'landscape':
      return <LandscapeLayout {...props} region={{ ...region, layout }} />;
    case 'xy':
      return <XYLayout {...props} region={{ ...region, layout }} />;
  }
}
