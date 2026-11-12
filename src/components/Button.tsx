import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

const BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 font-display text-lg font-semibold ' +
  'transition duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-nola text-void shadow-lg shadow-nola/30 hover:bg-nola-soft',
  secondary: 'border-2 border-line bg-panel text-star hover:border-glow',
};

/** Class names for a button look, so links can share the same style. */
export function buttonClasses(variant: Variant = 'primary', extra = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = 'primary', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, className)} {...rest} />;
}
