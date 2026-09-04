import * as RadixDialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { X } from './icons';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, title, children }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <RadixDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <RadixDialog.Title className="text-lg font-semibold text-gray-900">{title}</RadixDialog.Title>
            <RadixDialog.Close className="text-gray-400 hover:text-gray-700">
              <X />
            </RadixDialog.Close>
          </div>
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
