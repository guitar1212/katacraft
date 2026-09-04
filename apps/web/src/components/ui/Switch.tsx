import * as RadixSwitch from '@radix-ui/react-switch';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, id, disabled }: SwitchProps) {
  return (
    <RadixSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative h-6 w-11 flex-shrink-0 rounded-full bg-gray-300 outline-none transition-colors data-[state=checked]:bg-brand-600 disabled:opacity-50"
    >
      <RadixSwitch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform will-change-transform data-[state=checked]:translate-x-[22px]" />
    </RadixSwitch.Root>
  );
}
