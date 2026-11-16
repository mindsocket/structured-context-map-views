import { useId } from 'react';
import type { Parameter, ParameterControl } from '../core/definition';

type InputProps<Kind extends ParameterControl['kind']> = {
  parameter: Parameter & { control: Extract<ParameterControl, { kind: Kind }> };
  value: unknown;
  onChange: (value: unknown) => void;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A checkbox for a boolean parameter, labelled with the parameter's title. */
export function ToggleParameterInput({ parameter, value, onChange }: InputProps<'toggle'>) {
  const id = useId();
  return (
    <>
      <input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{parameter.title}</label>
    </>
  );
}

/** A dropdown for a parameter with one of several options. */
export function SelectParameterInput({ parameter, value, onChange }: InputProps<'select'>) {
  const id = useId();
  return (
    <>
      <label htmlFor={id} className="mv:text-muted">
        {parameter.title}
      </label>
      <select id={id} value={JSON.stringify(value)} onChange={(e) => onChange(JSON.parse(e.target.value))}>
        {parameter.control.options.map((option) => (
          <option key={JSON.stringify(option)} value={JSON.stringify(option)}>
            {String(option)}
          </option>
        ))}
      </select>
    </>
  );
}

/** A checkbox group for a parameter taking any subset of its options. */
export function MultiSelectParameterInput({ parameter, value, onChange }: InputProps<'multiselect'>) {
  const { options } = parameter.control;
  const selected = Array.isArray(value) ? value : [];
  return (
    <fieldset className="mv:m-0 mv:flex mv:flex-wrap mv:items-center mv:gap-2 mv:border-0 mv:p-0">
      <legend className="mv:float-left mv:mr-1.5 mv:p-0 mv:text-muted">{parameter.title}</legend>
      {options.map((option) => {
        const checked = selected.some((v) => same(v, option));
        return (
          <label key={JSON.stringify(option)} className="mv:flex mv:items-center mv:gap-1">
            <input
              type="checkbox"
              checked={checked}
              onChange={() =>
                // Keep the options' order rather than the order of clicks.
                onChange(options.filter((o) => (o === option ? !checked : selected.some((v) => same(v, o)))))
              }
            />
            {String(option)}
          </label>
        );
      })}
    </fieldset>
  );
}

/** The input matching a parameter's control kind. */
export function ParameterInput({
  parameter,
  value,
  onChange,
}: Omit<InputProps<ParameterControl['kind']>, 'parameter'> & { parameter: Parameter }) {
  const { control } = parameter;
  switch (control.kind) {
    case 'toggle':
      return <ToggleParameterInput parameter={{ ...parameter, control }} value={value} onChange={onChange} />;
    case 'select':
      return <SelectParameterInput parameter={{ ...parameter, control }} value={value} onChange={onChange} />;
    case 'multiselect':
      return <MultiSelectParameterInput parameter={{ ...parameter, control }} value={value} onChange={onChange} />;
  }
}
