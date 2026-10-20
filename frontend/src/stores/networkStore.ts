import { create } from 'zustand';
import { toast } from './toastStore';

interface NetworkState {
  isOnline: boolean;
  hasReconnected: boolean;
  initNetworkListeners: () => () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  hasReconnected: false,

  initNetworkListeners: () => {
    const handleOnline = () => {
      const wasOffline = !get().isOnline;
      set({ isOnline: true, hasReconnected: wasOffline });
      if (wasOffline) {
        toast.success('Connection restored. Updating live availability.');
      }
    };

    const handleOffline = () => {
      set({ isOnline: false });
      toast.warning('You are offline. Showing cached boutique stays.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  },
}));
