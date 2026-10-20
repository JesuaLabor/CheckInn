import React, { useEffect, useRef } from 'react';
import { useConfirmStore, ConfirmIconType } from '../stores/confirmStore';
import { UserX, Trash2, AlertTriangle, ShieldCheck, LogOut, X, Check } from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    variant,
    icon,
    resolve,
    closeConfirm,
  } = useConfirmStore();

  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the cancel button for safety against accidental enter-key confirms
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (resolve) resolve(true);
    closeConfirm();
  };

  const handleCancel = () => {
    if (resolve) resolve(false);
    closeConfirm();
  };

  const renderIcon = (iconType?: ConfirmIconType) => {
    switch (iconType) {
      case 'user-x':
        return <UserX className="w-6 h-6 text-rose-600" />;
      case 'trash':
        return <Trash2 className="w-6 h-6 text-rose-600" />;
      case 'check':
        return <Check className="w-6 h-6 text-emerald-600" />;
      case 'log-out':
        return <LogOut className="w-6 h-6 text-rose-600" />;
      case 'alert':
      default:
        return variant === 'primary' ? (
          <ShieldCheck className="w-6 h-6 text-[#1E3A2B]" />
        ) : (
          <AlertTriangle className={`w-6 h-6 ${variant === 'danger' ? 'text-rose-600' : 'text-[#D49B41]'}`} />
        );
    }
  };

  const iconBgClasses = {
    danger: 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-100',
    warning: 'bg-amber-50 border-amber-200 text-[#8F611A] shadow-amber-100',
    primary: 'bg-emerald-50 border-emerald-200 text-[#1E3A2B] shadow-emerald-100',
  }[variant || 'danger'];

  const confirmBtnClasses = {
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-md shadow-rose-600/25 active:scale-95',
    warning:
      'bg-gradient-to-r from-[#D49B41] to-[#BF8832] hover:brightness-105 text-[#212529] font-black shadow-md shadow-[#D49B41]/25 active:scale-95',
    primary:
      'bg-gradient-to-r from-[#1E3A2B] to-[#3B5E43] hover:from-[#162C20] hover:to-[#2F4D36] text-white font-extrabold shadow-md shadow-[#1E3A2B]/25 active:scale-95',
  }[variant || 'danger'];

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto pointer-events-auto">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Responsive Modal Card (Mobile Action Sheet / Desktop Centered Card) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative z-10 w-full sm:max-w-md bg-white rounded-t-[32px] sm:rounded-3xl border border-[#E8E2D8] shadow-2xl p-6 sm:p-7 flex flex-col space-y-4 animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-250 ease-out pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] sm:pb-7"
      >
        {/* Mobile Sheet Grab Handle */}
        <div className="sm:hidden w-12 h-1 bg-slate-200 rounded-full mx-auto -mt-2 mb-2" />

        {/* Header: Icon Badge & Dismiss Button */}
        <div className="flex items-start justify-between">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-sm shrink-0 ${iconBgClasses}`}
          >
            {renderIcon(icon)}
          </div>

          <button
            onClick={handleCancel}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dismiss confirmation"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Section */}
        <div className="space-y-1.5">
          <h3 id="confirm-modal-title" className="text-lg sm:text-xl font-black text-[#212529] tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Action Buttons: Stacked on mobile for thumb reach, side-by-side on desktop */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-100">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={handleCancel}
            className="w-full sm:w-auto px-5 py-3 sm:py-2.5 min-h-[46px] sm:min-h-[42px] rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center cursor-pointer select-none"
          >
            {cancelText || 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className={`w-full sm:w-auto px-6 py-3 sm:py-2.5 min-h-[46px] sm:min-h-[42px] rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${confirmBtnClasses}`}
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
