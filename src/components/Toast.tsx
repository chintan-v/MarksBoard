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
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl animate-fadeIn transition-all ${
        toast.type === 'success'
          ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-500/10'
          : toast.type === 'error'
          ? 'bg-slate-900/95 border-rose-500/40 text-rose-100 shadow-rose-500/10'
          : 'bg-slate-900/95 border-cyan-500/40 text-cyan-100 shadow-cyan-500/10'
      }`}
    >
      {toast.type === 'success' && (
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      )}
      {toast.type === 'error' && (
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      )}
      {toast.type === 'info' && (
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
      )}

      <div className="flex-1 text-xs">
        {toast.title && (
          <h5 className="font-bold text-white mb-0.5 text-sm">{toast.title}</h5>
        )}
        <p className="leading-relaxed text-slate-200">{toast.message}</p>
      </div>

      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 -mt-1"
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
