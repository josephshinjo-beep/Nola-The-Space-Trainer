import { Check } from 'lucide-react';
import { useId, type ReactNode } from 'react';

export interface Option<T extends string> {
  id: T;
  label: string;
  /** Optional little picture shown before the label (a colour dot, an icon). */
  visual?: ReactNode;
}

interface OptionGroupProps<T extends string> {
  legend: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A "pick one" control built on real radio buttons, so arrow keys and
 * screen readers work as expected. The chosen option shows a tick as well
 * as a highlighted border, so it never relies on colour alone.
 */
export function OptionGroup<T extends string>({ legend, options, value, onChange }: OptionGroupProps<T>) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-3 font-display text-lg font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const checked = option.id === value;
          return (
            <label
              key={option.id}
              className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-2 px-4 py-2 font-semibold transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-glow ${
                checked ? 'border-glow bg-panel text-star' : 'border-line bg-void/40 text-mist hover:border-mist'
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.id)}
              />
              {option.visual}
              {option.label}
              {checked && <Check aria-hidden="true" size={18} className="text-glow" />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
