import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration: number;
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const getDefaultTitle = (type: ToastType): string => {
  switch (type) {
    case 'error':
      return 'Action Required';
    case 'success':
      return 'Success';
    case 'warning':
      return 'Notice';
    case 'info':
    default:
      return 'Information';
  }
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type = 'error', title, duration = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const toastItem: ToastItem = {
      id,
      type,
      title: title || getDefaultTitle(type),
      message,
      duration,
      createdAt: Date.now(),
    };

    set((state) => ({
      toasts: [...state.toasts.slice(-3), toastItem], // Keep at most 4 active toasts
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

export const toast = {
  error: (msg: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast(msg, 'error', title, duration),
  success: (msg: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast(msg, 'success', title, duration),
  info: (msg: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast(msg, 'info', title, duration),
  warning: (msg: string, title?: string, duration?: number) =>
    useToastStore.getState().addToast(msg, 'warning', title, duration),
};
