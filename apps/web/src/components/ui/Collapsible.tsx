import * as RadixCollapsible from '@radix-ui/react-collapsible';
import { useState, type ReactNode } from 'react';
import { ChevronDown } from './icons';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <RadixCollapsible.Root open={open} onOpenChange={setOpen} className="border-b border-gray-200 py-3">
      <RadixCollapsible.Trigger className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-800">
        <span>{title}</span>
        <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </RadixCollapsible.Trigger>
      <RadixCollapsible.Content className="mt-3 space-y-4">{children}</RadixCollapsible.Content>
    </RadixCollapsible.Root>
  );
}
