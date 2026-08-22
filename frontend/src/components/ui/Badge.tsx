import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'neutral' | 'outline' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-[#16A34A] border border-emerald-200',
    warning: 'bg-amber-50 text-[#D97706] border border-amber-200',
    error: 'bg-red-50 text-[#DC2626] border border-red-200',
    neutral: 'bg-[#F7F7F7] text-[#111111] border border-[#E5E5E5]',
    outline: 'bg-white text-[#666666] border border-[#E5E5E5]',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] font-medium tracking-tight rounded-md',
    md: 'px-2.5 py-1 text-xs font-medium tracking-tight rounded-lg',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {children}
    </span>
  );
};
