import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer tracking-tight';

  const variantStyles = {
    primary: 'bg-black text-white hover:bg-neutral-800 focus:ring-black shadow-xs',
    secondary: 'bg-[#F7F7F7] text-[#111111] hover:bg-neutral-200 border border-[#D4D4D4] focus:ring-neutral-400',
    outline: 'bg-white text-[#111111] border border-[#D4D4D4] hover:bg-[#F7F7F7] focus:ring-neutral-400',
    ghost: 'bg-transparent text-[#111111] hover:bg-[#F7F7F7] focus:ring-neutral-400',
    danger: 'bg-[#DC2626] text-white hover:bg-red-700 focus:ring-red-500 shadow-xs',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs h-9 gap-1.5 font-semibold',
    md: 'px-5 py-2.5 text-sm h-11 gap-2 font-medium',
    lg: 'px-7 py-3.5 text-sm h-12 gap-2.5 font-semibold',
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current fill-none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
