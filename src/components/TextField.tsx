import { useId, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Short helper text shown under the field. */
  hint?: string;
  /** Error message; when set, the field is marked invalid for screen readers. */
  error?: string | null;
}

/** A labelled input with built-in hint and error text. */
export function TextField({ label, hint, error, className = '', ...inputProps }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block font-display text-base font-medium text-star">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`block min-h-12 w-full rounded-2xl border-2 bg-void/60 px-4 py-3 text-lg text-star placeholder:text-mist/60 ${
          error ? 'border-alert' : 'border-line hover:border-mist'
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-base font-semibold text-alert">
          <span aria-hidden="true">⚠ </span>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-2 text-sm text-mist">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
