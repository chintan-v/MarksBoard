import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-fadeIn transition-all glass-panel-deep bg-[#090e1a]/95 text-[#F4EDE0] ${
        toast.type === 'success'
          ? 'border-[#F4EDE0]/30 shadow-[#14213D]/60'
          : toast.type === 'error'
          ? 'border-rose-500/40 text-rose-100 shadow-rose-950/40'
          : 'border-[#F4EDE0]/25 shadow-[#14213D]/40'
      }`}
    >
      {toast.type === 'success' && (
        <CheckCircle2 className="w-5 h-5 text-[#F4EDE0] shrink-0 mt-0.5" />
      )}
      {toast.type === 'error' && (
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      )}
      {toast.type === 'info' && (
        <Info className="w-5 h-5 text-[#F4EDE0] shrink-0 mt-0.5" />
      )}

      <div className="flex-1 text-xs">
        {toast.title && (
          <h5 className="font-bold text-[#F4EDE0] mb-0.5 text-sm">{toast.title}</h5>
        )}
        <p className="leading-relaxed text-[#F4EDE0]/90">{toast.message}</p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[#F4EDE0]/60 hover:text-[#F4EDE0] transition-colors p-1 -mr-1 -mt-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body
  );
};
