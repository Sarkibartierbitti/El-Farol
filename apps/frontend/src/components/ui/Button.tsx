import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#9871f7] text-white hover:bg-[#8760e6] disabled:bg-[#8760e6]',
  secondary: 'bg-[#f4bb73] text-black hover:bg-[#f4b063] disabled:bg-[#f4b063]',
  danger: 'bg-[#ef4444] text-white hover:bg-[#ef3939] disabled:bg-[#ef3939]',
  ghost: 'text-[#9871f7] hover:bg-[#f4b063] hover:text-[#9871f7]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-5 py-2.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  ),
);

Button.displayName = 'Button';
