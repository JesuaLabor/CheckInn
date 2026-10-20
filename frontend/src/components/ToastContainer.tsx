import React from 'react';
import { useToastStore, ToastType } from '../stores/toastStore';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'error':
        return (
          <>
            <div className="sm:hidden shrink-0 text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 items-center justify-center shrink-0 text-rose-400 shadow-sm shadow-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </>
        );
      case 'success':
        return (
          <>
            <div className="sm:hidden shrink-0 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-[#3B5E43]/30 border border-[#3B5E43]/50 items-center justify-center shrink-0 text-emerald-400 shadow-sm shadow-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </>
        );
      case 'warning':
        return (
          <>
            <div className="sm:hidden shrink-0 text-[#E2AE55]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-[#D49B41]/25 border border-[#D49B41]/45 items-center justify-center shrink-0 text-[#E2AE55] shadow-sm shadow-[#D49B41]/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </>
        );
      case 'info':
      default:
        return (
          <>
            <div className="sm:hidden shrink-0 text-sky-400">
              <Info className="w-4 h-4" />
            </div>
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 items-center justify-center shrink-0 text-sky-400 shadow-sm shadow-sky-500/20">
              <Info className="w-4 h-4" />
            </div>
          </>
        );
    }
  };

  const getContainerStyle = (type: ToastType) => {
    switch (type) {
      case 'error':
        return 'bg-[#181112]/96 border-rose-500/35 shadow-rose-950/40 ring-1 ring-rose-500/20';
      case 'success':
        return 'bg-[#0F1E15]/96 border-[#3B5E43]/50 shadow-emerald-950/40 ring-1 ring-[#3B5E43]/30';
      case 'warning':
        return 'bg-[#1F180F]/96 border-[#D49B41]/50 shadow-amber-950/40 ring-1 ring-[#D49B41]/30';
      case 'info':
      default:
        return 'bg-[#111923]/96 border-sky-500/40 shadow-sky-950/40 ring-1 ring-sky-500/20';
    }
  };

  const getProgressBarColor = (type: ToastType) => {
    switch (type) {
      case 'error':
        return 'bg-gradient-to-r from-rose-500 to-rose-400';
      case 'success':
        return 'bg-gradient-to-r from-[#3B5E43] to-emerald-400';
      case 'warning':
        return 'bg-gradient-to-r from-[#D49B41] to-amber-300';
      case 'info':
      default:
        return 'bg-gradient-to-r from-sky-500 to-blue-400';
    }
  };

  const getTitleColor = (type: ToastType) => {
    switch (type) {
      case 'error':
        return 'text-rose-300';
      case 'success':
        return 'text-emerald-300';
      case 'warning':
        return 'text-amber-300';
      case 'info':
      default:
        return 'text-sky-300';
    }
  };

  const isGenericTitle = (title?: string) => {
    if (!title) return true;
    const lower = title.toLowerCase().trim();
    return (
      lower === 'information' ||
      lower === 'success' ||
      lower === 'action required' ||
      lower === 'notice'
    );
  };

  return (
    <div
      aria-live="polite"
      className="fixed top-[max(0.75rem,env(safe-area-inset-top,0.75rem))] left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-6 sm:right-6 z-[100] w-max max-w-[92vw] sm:max-w-md sm:w-full flex flex-col items-center sm:items-end gap-2 sm:gap-3 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto relative overflow-hidden flex items-center sm:items-start gap-2.5 sm:gap-3 py-2 px-3.5 sm:p-4 rounded-full sm:rounded-2xl shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-2xl border transition-all animate-in fade-in slide-in-from-top-4 sm:slide-in-from-right-8 duration-300 ease-out group ${getContainerStyle(
            toast.type
          )}`}
        >
          {renderIcon(toast.type)}

          <div className="flex-1 min-w-0 pr-0.5 sm:pr-1 sm:pt-0.5">
            <h4
              className={`hidden sm:block text-[11px] font-black uppercase tracking-wider mb-0.5 leading-none ${getTitleColor(
                toast.type
              )}`}
            >
              {toast.title}
            </h4>
            <p className="text-xs font-semibold text-slate-100 leading-tight sm:leading-snug break-words">
              {!isGenericTitle(toast.title) && (
                <span className="font-black text-white mr-1 sm:hidden">
                  {toast.title}:
                </span>
              )}
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="w-5 h-5 sm:w-6 sm:h-6 rounded-full sm:rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center shrink-0 active:scale-90 cursor-pointer ml-1 sm:-mr-1 sm:-mt-0.5"
            aria-label="Dismiss notification"
          >
            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          {/* Animated Auto-Dismiss Countdown Bar */}
          {toast.duration > 0 && (
            <div
              className={`absolute bottom-0 left-0 h-[2px] sm:h-[2.5px] opacity-80 ${getProgressBarColor(
                toast.type
              )}`}
              style={{
                animation: `toast-progress ${toast.duration}ms linear forwards`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};
