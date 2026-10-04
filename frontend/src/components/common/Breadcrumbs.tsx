import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { type BreadcrumbItem } from './SEO';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  if (!items || items.length === 0) return null;

  // Filter out any leading root item if already present
  const displayItems = items.filter((rawItem, idx) => {
    const name = ('name' in rawItem && rawItem.name ? rawItem.name : 'label' in rawItem && rawItem.label ? rawItem.label : '') as string;
    const path = ('item' in rawItem && rawItem.item ? rawItem.item : 'path' in rawItem && rawItem.path ? rawItem.path : '') as string;
    if (idx === 0 && (name.toLowerCase() === 'home' || path === '/')) {
      return false;
    }
    return true;
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-xs font-mono text-[#666666] py-3 overflow-x-auto whitespace-nowrap ${className}`}
    >
      <ol className="flex items-center gap-1.5 list-none p-0 m-0">
        <li className="flex items-center">
          <Link
            to="/"
            className="flex items-center gap-1 text-[#444444] hover:text-black transition-colors font-medium"
            title="Home"
          >
            <Home className="w-3.5 h-3.5 text-[#666666]" />
            <span className="sr-only sm:not-sr-only">Home</span>
          </Link>
        </li>

        {displayItems.map((rawItem, index) => {
          const isLast = index === displayItems.length - 1;
          const name = ('name' in rawItem && rawItem.name ? rawItem.name : 'label' in rawItem && rawItem.label ? rawItem.label : '') as string;
          const path = ('item' in rawItem && rawItem.item ? rawItem.item : 'path' in rawItem && rawItem.path ? rawItem.path : '/') as string;

          return (
            <li key={index} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-[#999999] shrink-0" aria-hidden="true" />
              {isLast ? (
                <span
                  className="font-bold text-[#111111] truncate max-w-[200px] sm:max-w-xs"
                  aria-current="page"
                >
                  {name}
                </span>
              ) : (
                <Link
                  to={path}
                  className="text-[#555555] hover:text-black transition-colors font-medium truncate max-w-[150px] sm:max-w-none"
                >
                  {name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
