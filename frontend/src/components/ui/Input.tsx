import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  technicalCode?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  technicalCode,
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#555555]">
            {label}
          </label>
          {technicalCode && (
            <span className="font-mono text-[10px] text-[#888888]">{technicalCode}</span>
          )}
        </div>
      )}
      <div className="relative flex items-center">
        {leftIcon && <div className="absolute left-3.5 text-[#555555]">{leftIcon}</div>}
        <input
          className={`w-full h-11 bg-white text-xs font-medium text-[#111111] placeholder-[#999999] rounded-lg border border-[#D4D4D4] ${
            leftIcon ? 'pl-10' : 'px-3.5'
          } ${rightIcon ? 'pr-10' : 'px-3.5'} outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
            error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]' : ''
          } ${className}`}
          {...props}
        />
        {rightIcon && <div className="absolute right-3.5 text-[#555555]">{rightIcon}</div>}
      </div>
      {error && <p className="font-mono text-[11px] font-semibold text-[#DC2626]">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-[#555555]">{helperText}</p>}
    </div>
  );
};

interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#555555]">
          {label}
        </label>
      )}
      <select
        className={`w-full h-11 bg-white text-xs font-medium text-[#111111] rounded-lg border border-[#D4D4D4] px-3.5 outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors ${
          error ? 'border-[#DC2626]' : ''
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label} {opt.sublabel ? `(${opt.sublabel})` : ''}
          </option>
        ))}
      </select>
      {error && <p className="font-mono text-[11px] text-[#DC2626]">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-[#555555]">{helperText}</p>}
    </div>
  );
};

interface SearchableSelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const selectedOpt = options.find((o) => o.value === value);
  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(query.toLowerCase()) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="w-full space-y-1.5 relative">
      {label && (
        <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#555555]">
          {label}
        </label>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 bg-white text-xs font-medium text-[#111111] rounded-lg border border-[#D4D4D4] px-3.5 flex items-center justify-between cursor-pointer hover:border-black transition-colors"
      >
        <span className="truncate">{selectedOpt ? selectedOpt.label : placeholder}</span>
        <span className="font-mono text-[10px] text-[#888888]">▼</span>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-[#D4D4D4] rounded-lg shadow-xl p-2 space-y-1 max-h-60 overflow-y-auto">
          <input
            type="text"
            placeholder="Filter options..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-9 bg-[#F7F7F7] text-xs font-mono text-[#111111] rounded-md px-3 border border-[#E5E5E5] outline-none focus:border-black"
          />
          {filtered.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className="p-2.5 rounded-md hover:bg-[#F7F7F7] cursor-pointer flex items-center justify-between text-xs"
            >
              <div>
                <p className="font-bold text-[#111111]">{opt.label}</p>
                {opt.sublabel && <p className="text-[10px] text-[#555555] font-mono">{opt.sublabel}</p>}
              </div>
              {opt.value === value && <span className="font-mono text-xs font-bold text-[#16A34A]">✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
