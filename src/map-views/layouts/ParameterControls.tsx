import { useId, useMemo } from 'react';
import { type MapViewDefinition, type ParameterValues, resolveParameterValues } from '../core';

type Props = {
  definition: MapViewDefinition;
  /** Host-owned values; missing or stale ones show as the default, matching what renders. */
  values: ParameterValues;
  onChange: (name: string, value: unknown) => void;
};

/**
 * Controls generated from a map view's declared parameters. Hosts own the values (session
 * state) and decide where the controls go.
 */
export function ParameterControls({ definition, values, onChange }: Props) {
  const id = useId();
  const resolved = useMemo(() => resolveParameterValues(definition, values), [definition, values]);
  const { parameters } = definition;
  if (parameters.length === 0) return null;
  return (
    <div className="mv:flex mv:flex-wrap mv:items-center mv:gap-x-4 mv:gap-y-2 mv:text-sm">
      {parameters.map((param) => {
        const value = resolved[param.name];
        const controlId = `${id}-${param.name}`;
        const { control } = param;
        return (
          <div key={param.name} className="mv:flex mv:items-center mv:gap-1.5" title={param.description}>
            {control.kind === 'toggle' ? (
              <>
                <input
                  id={controlId}
                  type="checkbox"
                  checked={value === true}
                  onChange={(e) => onChange(param.name, e.target.checked)}
                />
                <label htmlFor={controlId}>{param.title}</label>
              </>
            ) : control.kind === 'select' ? (
              <>
                <label htmlFor={controlId} className="mv:text-muted">
                  {param.title}
                </label>
                <select
                  id={controlId}
                  value={JSON.stringify(value)}
                  onChange={(e) => onChange(param.name, JSON.parse(e.target.value))}
                >
                  {control.options.map((option) => (
                    <option key={JSON.stringify(option)} value={JSON.stringify(option)}>
                      {String(option)}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <fieldset className="mv:m-0 mv:flex mv:flex-wrap mv:items-center mv:gap-2 mv:border-0 mv:p-0">
                <legend className="mv:float-left mv:mr-1.5 mv:p-0 mv:text-muted">{param.title}</legend>
                {control.options.map((option) => {
                  const selected = Array.isArray(value) ? value : [];
                  const checked = selected.some((v) => JSON.stringify(v) === JSON.stringify(option));
                  return (
                    <label key={JSON.stringify(option)} className="mv:flex mv:items-center mv:gap-1">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          onChange(
                            param.name,
                            // Keep the options' order rather than the order of clicks.
                            control.options.filter((o) =>
                              o === option ? !checked : selected.some((v) => JSON.stringify(v) === JSON.stringify(o)),
                            ),
                          )
                        }
                      />
                      {String(option)}
                    </label>
                  );
                })}
              </fieldset>
            )}
          </div>
        );
      })}
    </div>
  );
}
