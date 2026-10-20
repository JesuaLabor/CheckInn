import { create } from 'zustand';

export type ConfirmVariant = 'danger' | 'warning' | 'primary';
export type ConfirmIconType = 'user-x' | 'trash' | 'alert' | 'check' | 'log-out';

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: ConfirmIconType;
}

interface ConfirmState extends ConfirmModalOptions {
  isOpen: boolean;
  resolve?: (value: boolean) => void;
  openConfirm: (options: ConfirmModalOptions & { resolve: (value: boolean) => void }) => void;
  closeConfirm: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
  icon: 'alert',
  resolve: undefined,

  openConfirm: (options) =>
    set({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'danger',
      icon: options.icon || (options.variant === 'danger' ? 'trash' : options.variant === 'primary' ? 'check' : 'alert'),
      resolve: options.resolve,
    }),

  closeConfirm: () =>
    set({
      isOpen: false,
      resolve: undefined,
    }),
}));

/**
 * Universal promise-based confirmation modal helper.
 * Replaces window.confirm() with a sleek, responsive, accessible custom modal.
 * 
 * Usage:
 * const confirmed = await confirmModal({
 *   title: 'Deactivate Staff Account',
 *   message: 'Are you sure you want to deactivate this account?',
 *   confirmText: 'Deactivate Staff',
 *   variant: 'danger',
 *   icon: 'user-x'
 * });
 * if (!confirmed) return;
 */
export const confirmModal = (options: ConfirmModalOptions): Promise<boolean> => {
  return new Promise<boolean>((resolve) => {
    useConfirmStore.getState().openConfirm({
      ...options,
      resolve,
    });
  });
};
