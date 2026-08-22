import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-[#E5E5E5] rounded-xl p-6 shadow-none ${
        hoverEffect ? 'hover:border-black transition-all duration-200' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  technicalCode?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  badge,
  className = '',
  technicalCode,
}) => {
  return (
    <Card className={`relative overflow-hidden bg-white border border-[#E5E5E5] ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {technicalCode && (
              <span className="font-mono text-[10px] text-[#555555] uppercase tracking-widest font-bold">
                {technicalCode}
              </span>
            )}
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#555555]">{title}</p>
          </div>
          <h3 className="font-mono text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">{value}</h3>
        </div>
        {icon && (
          <div className="p-2 bg-[#F7F7F7] border border-[#E5E5E5] rounded-lg text-[#111111]">
            {icon}
          </div>
        )}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-xs">
          {subtitle && <span className="text-[#555555] font-mono text-[11px]">{subtitle}</span>}
          {trend && (
            <span
              className={`font-mono font-bold text-[11px] flex items-center gap-1 ${
                trend.isPositive ? 'text-[#16A34A]' : 'text-[#DC2626]'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
            </span>
          )}
          {badge && <div>{badge}</div>}
        </div>
      )}
    </Card>
  );
};
