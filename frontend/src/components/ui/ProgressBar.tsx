import React, { useState } from 'react';

interface Step {
  id: number;
  label: string;
  description?: string;
}

interface ProgressBarProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ steps, currentStep, onStepClick }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <React.Fragment key={step.id}>
              <div
                onClick={() => isCompleted && onStepClick && onStepClick(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-xs cursor-pointer transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-black text-white font-bold shadow-xs'
                    : isCompleted
                    ? 'bg-[#F7F7F7] text-[#111111] border border-[#E5E5E5] font-semibold hover:border-black'
                    : 'text-[#888888] font-normal'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-white text-black'
                      : isCompleted
                      ? 'bg-black text-white'
                      : 'bg-[#E5E5E5] text-[#555555]'
                  }`}
                >
                  {isCompleted ? '✓' : `0${step.id}`}
                </span>
                <span className="uppercase tracking-wider text-[11px]">{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="flex-1 min-w-[20px] h-[1px] bg-[#E5E5E5] mx-1 shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

interface FileUploadProps {
  onFileSelect: (files: FileList | File[]) => void;
  accept?: string;
  label?: string;
  helperText?: string;
  multiple?: boolean;
  state?: 'default' | 'uploading' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '.pdf,.csv,.xlsx',
  label = 'UPLOAD SOURCE FILE',
  helperText = 'Drag & drop file or browse local storage',
  multiple = false,
  state = 'default',
  errorMessage,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-black bg-[#F7F7F7]'
            : state === 'error'
            ? 'border-[#DC2626] bg-red-50/40'
            : state === 'success'
            ? 'border-[#16A34A] bg-emerald-50/40'
            : 'border-[#D4D4D4] bg-white hover:border-black'
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-3 pointer-events-none">
          <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center mx-auto font-mono text-xs font-bold">
            ↑
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#111111]">{label}</p>
            <p className="text-xs text-[#555555] mt-1">{helperText}</p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F7F7F7] border border-[#E5E5E5] rounded font-mono text-[10px] text-[#555555]">
            <span>SUPPORTED: {accept.toUpperCase()}</span>
          </div>

          {state === 'error' && errorMessage && (
            <p className="font-mono text-xs font-bold text-[#DC2626]">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};
