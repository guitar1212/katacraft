import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { X } from './icons';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant?: 'default' | 'error' | 'success';
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const variantClasses: Record<NonNullable<ToastItem['variant']>, string> = {
  default: 'border-gray-200 bg-white text-gray-900',
  error: 'border-red-300 bg-red-50 text-red-900',
  success: 'border-green-300 bg-green-50 text-green-900',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <RadixToast.Provider swipeDirection="right" duration={4500}>
        {children}
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            onOpenChange={(open) => !open && removeToast(t.id)}
            className={`pointer-events-auto flex w-80 items-start justify-between gap-2 rounded-md border p-3 shadow-lg ${variantClasses[t.variant ?? 'default']}`}
          >
            <div>
              <RadixToast.Title className="text-sm font-semibold">{t.title}</RadixToast.Title>
              {t.description && <RadixToast.Description className="mt-1 text-xs opacity-80">{t.description}</RadixToast.Description>}
            </div>
            <RadixToast.Close aria-label="Close" className="opacity-60 hover:opacity-100">
              <X />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
