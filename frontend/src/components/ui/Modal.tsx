import React from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className={`w-full bg-white rounded-2xl border border-[#E5E5E5] shadow-2xl overflow-hidden ${widthStyles[maxWidth]} my-8 animate-in zoom-in-95 duration-200`}
      >
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <h3 className="text-base font-bold text-[#111111]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#111111] p-1 rounded-lg hover:bg-[#F7F7F7] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 max-h-[60vh] sm:max-h-[68vh] overflow-y-auto">{children}</div>

        {footer && <div className="px-6 py-3.5 border-t border-[#E5E5E5] bg-[#F7F7F7] flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#E5E5E5] animate-in slide-in-from-right duration-200">
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
          <h3 className="text-base font-bold text-[#111111]">{title || 'Navigation'}</h3>
          <button
            onClick={onClose}
            className="text-[#666666] hover:text-[#111111] p-1.5 rounded-lg hover:bg-[#F7F7F7] cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};
