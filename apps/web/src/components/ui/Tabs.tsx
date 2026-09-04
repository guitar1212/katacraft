import * as RadixTabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
}

export function Tabs({ items, value, onValueChange }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List className="flex gap-1 border-b border-gray-200">
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-800 data-[state=active]:border-brand-600 data-[state=active]:text-brand-700"
          >
            {item.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content key={item.value} value={item.value} className="py-4">
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
