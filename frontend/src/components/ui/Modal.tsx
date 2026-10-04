import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full bg-white rounded-2xl border border-[#E5E5E5] shadow-2xl overflow-hidden ${widthStyles[maxWidth]} my-auto animate-in zoom-in-95 duration-200`}
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white sticky top-0 z-10">
          <h3 className="text-sm sm:text-base font-bold text-[#111111] truncate pr-2">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#111111] p-2 rounded-lg hover:bg-[#F7F7F7] transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[75vh] sm:max-h-[70vh] overflow-y-auto">{children}</div>

        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-[#E5E5E5] bg-[#F7F7F7] flex flex-wrap items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLeft = position === 'left';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex ${isLeft ? 'justify-start' : 'justify-end'} bg-black/50 backdrop-blur-xs animate-in fade-in duration-200`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col ${
          isLeft ? 'border-r animate-in slide-in-from-left' : 'border-l animate-in slide-in-from-right'
        } border-[#E5E5E5] duration-200`}
      >
        <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <h3 className="text-sm sm:text-base font-bold text-[#111111] truncate pr-2">
            {title || 'Navigation'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#111111] p-2 rounded-lg hover:bg-[#F7F7F7] cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center -mr-1"
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};
