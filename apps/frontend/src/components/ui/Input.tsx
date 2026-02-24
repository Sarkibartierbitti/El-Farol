import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-black uppercase">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`border border-black-200 bg-white text-sm
            placeholder-gray-400 
            focus:border-[#9871f7] focus:outline-none focus:ring-1 focus:ring-[#9871f7]
            disabled:bg-[#f4bb73] disabled:text-black
            ${error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''}
            ${className}`}
          {...props}
        />
        {hint && !error && <p className="text-xs text-black">{hint}</p>}
        {error && <p className="text-xs text-[#ef4444]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
