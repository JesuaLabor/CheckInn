import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

export type CurrencyCode = 'PHP' | 'USD' | 'EUR' | 'JPY' | 'SGD' | 'AUD' | 'GBP';

interface CurrencyRates {
  [code: string]: number;
}

interface CurrencyState {
  currency: CurrencyCode;
  rates: CurrencyRates;
  symbols: Record<string, string>;
  setCurrency: (code: CurrencyCode) => void;
  fetchRates: () => Promise<void>;
  formatPrice: (amountInPHP: number, overrideCurrency?: CurrencyCode) => string;
}

const DEFAULT_RATES: CurrencyRates = {
  PHP: 1.0,
  USD: 0.0175,
  EUR: 0.0162,
  JPY: 2.65,
  SGD: 0.0234,
  AUD: 0.0268,
  GBP: 0.0138,
};

const DEFAULT_SYMBOLS: Record<string, string> = {
  PHP: '₱',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  SGD: 'S$',
  AUD: 'A$',
  GBP: '£',
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      currency: 'PHP',
      rates: DEFAULT_RATES,
      symbols: DEFAULT_SYMBOLS,

      setCurrency: (currency: CurrencyCode) => set({ currency }),

      fetchRates: async () => {
        try {
          const res = await api.get('/inns/exchange-rates/');
          if (res.data?.rates) {
            set({
              rates: { ...DEFAULT_RATES, ...res.data.rates },
              symbols: { ...DEFAULT_SYMBOLS, ...res.data.symbols },
            });
          }
        } catch {
          // Fall back to built-in rates
        }
      },

      formatPrice: (amountInPHP: number, overrideCurrency?: CurrencyCode) => {
        const { currency, rates, symbols } = get();
        const target = overrideCurrency || currency;
        const rate = rates[target] || 1.0;
        const symbol = symbols[target] || target + ' ';

        const converted = amountInPHP * rate;

        if (target === 'JPY') {
          return `${symbol}${Math.round(converted).toLocaleString()}`;
        }

        if (target === 'PHP') {
          return `${symbol}${Math.round(converted).toLocaleString()}`;
        }

        return `${symbol}${converted.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      },
    }),
    {
      name: 'localstay-currency-storage',
      partialize: (state) => ({ currency: state.currency }),
    }
  )
);
