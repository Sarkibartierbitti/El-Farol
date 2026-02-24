import { forwardRef } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, hint, className = '', id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-xs font-medium text-black uppercase">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`border border-black-200 bg-white text-sm
            placeholder-black 
            focus:border-[#9871f7] focus:outline-none focus:ring-1 focus:ring-[#9871f7]
            disabled:bg-[#f4bb73] disabled:text-black
            ${className}`}
          {...props}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';
