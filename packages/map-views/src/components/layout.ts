import { useCallback, useRef, useState } from 'react';
import type { SpaceGraph, SpaceNode } from 'structured-context/api';
import type { LayoutConfig, Region } from '../core/definition';

export type LayoutProps<L extends LayoutConfig = LayoutConfig> = {
  graph: SpaceGraph;
  /** The region with parameter values applied, narrowed to the layout's own settings. */
  region: Region & { layout: L };
  /** Scopes occurrence keys when several map views render in one document. */
  instanceId: string;
  onNodeSelect?: (node: SpaceNode) => void;
  /** The node a layout that centres on one node shows; the layout keeps its own once the reader picks another. */
  focus?: SpaceNode['id'];
  onFocusChange?: (id: SpaceNode['id']) => void;
};

/** Connects a layout's occurrences to its `ConnectorOverlay`: `register` fills `elements` during commit, ahead of the overlay's layout effect. */
export function useOccurrenceElements() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const elements = useRef(new Map<string, HTMLElement>()).current;
  const register = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) elements.set(key, el);
      else elements.delete(key);
    },
    [elements],
  );
  return { container, setContainer, elements, register };
}
