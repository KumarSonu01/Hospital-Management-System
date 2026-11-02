import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 4000, title }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, title };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const success = useCallback((message, title = 'Success') => addToast({ message, type: 'success', title }), [addToast]);
  const error = useCallback((message, title = 'Error') => addToast({ message, type: 'error', title }), [addToast]);
  const warning = useCallback((message, title = 'Notice') => addToast({ message, type: 'warning', title }), [addToast]);
  const info = useCallback((message, title = 'Info') => addToast({ message, type: 'info', title }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast Render Portal */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-100',
            error: 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-100',
            warning: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100',
            info: 'bg-slate-50 border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100'
          };

          const IconComponent = {
            success: CheckCircle,
            error: XCircle,
            warning: AlertTriangle,
            info: Info
          }[toast.type] || Info;

          const iconColors = {
            success: 'text-emerald-600 dark:text-emerald-400',
            error: 'text-rose-600 dark:text-rose-400',
            warning: 'text-amber-600 dark:text-amber-400',
            info: 'text-teal-600 dark:text-teal-400'
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all transform translate-y-0 opacity-100 animate-slide-up ${typeStyles[toast.type]}`}
            >
              <IconComponent className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColors}`} />
              <div className="flex-1 text-sm">
                {toast.title && <p className="font-semibold">{toast.title}</p>}
                <p className="mt-0.5 leading-snug">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
