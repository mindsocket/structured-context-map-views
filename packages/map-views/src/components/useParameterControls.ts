import { useMemo } from 'react';
import {
  type MapViewDefinition,
  type Parameter,
  type ParameterValues,
  resolveParameterValues,
} from '../core/definition';

/** One parameter with its current value and a setter, ready for a host to lay out. */
export type ParameterControlState = {
  parameter: Parameter;
  /** The value in effect: the host's value, else the default, matching what renders. */
  value: unknown;
  setValue: (value: unknown) => void;
};

/**
 * The state behind a map view's parameter controls, with no markup, for hosts that lay the controls
 * out themselves. Pair each entry with `ParameterInput`, or with one of the typed inputs.
 */
export function useParameterControls(
  definition: MapViewDefinition,
  values: ParameterValues,
  onChange: (name: string, value: unknown) => void,
): ParameterControlState[] {
  const resolved = useMemo(() => resolveParameterValues(definition, values), [definition, values]);
  return definition.parameters.map((parameter) => ({
    parameter,
    value: resolved[parameter.name],
    setValue: (value) => onChange(parameter.name, value),
  }));
}
