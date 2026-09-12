import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

let toastId = 0;
const listeners = new Set();

export function showToast(message, type = 'info', duration = 4000) {
  const id = ++toastId;
  listeners.forEach((fn) => fn({ id, message, type }));
  if (duration > 0) {
    setTimeout(() => {
      listeners.forEach((fn) => fn({ id, remove: true }));
    }, duration);
  }
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handler = (toast) => {
      if (toast.remove) {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      } else {
        setToasts((prev) => [...prev, toast]);
      }
    };
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'border-emerald-500/50 bg-emerald-950/90 text-emerald-100',
    error: 'border-red-500/50 bg-red-950/90 text-red-100',
    info: 'border-brand-500/50 bg-brand-950/90 text-brand-100',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = icons[toast.type] || Info;
        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-right ${colors[toast.type]}`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-2 opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
