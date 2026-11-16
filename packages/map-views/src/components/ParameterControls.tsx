import type { MapViewDefinition, ParameterValues } from '../core/definition';
import { ParameterInput } from './ParameterInputs';
import { useParameterControls } from './useParameterControls';

type Props = {
  definition: MapViewDefinition;
  /** Host-owned values; missing or stale ones show as the default, matching what renders. */
  values: ParameterValues;
  onChange: (name: string, value: unknown) => void;
};

/**
 * Default layout for a map view's parameter controls: a wrapping row. Hosts wanting their own layout
 * use `useParameterControls` with `ParameterInput` (or the typed inputs) instead.
 */
export function ParameterControls({ definition, values, onChange }: Props) {
  const controls = useParameterControls(definition, values, onChange);
  if (controls.length === 0) return null;
  return (
    <div className="mv:flex mv:flex-wrap mv:items-center mv:gap-x-4 mv:gap-y-2 mv:text-sm">
      {controls.map(({ parameter, value, setValue }) => (
        <div key={parameter.name} className="mv:flex mv:items-center mv:gap-1.5" title={parameter.description}>
          <ParameterInput parameter={parameter} value={value} onChange={setValue} />
        </div>
      ))}
    </div>
  );
}
