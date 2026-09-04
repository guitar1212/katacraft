import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ParamField, ParamSchema, ParamValues } from '@katacraft/shared';
import { CollapsibleSection } from './ui/Collapsible';
import { Select } from './ui/Select';
import { Switch } from './ui/Switch';

interface ParamFormProps {
  schema: ParamSchema;
  values: ParamValues;
  onChange: (key: string, value: string | number | boolean) => void;
  disabled?: boolean;
}

const UNGROUPED_KEY = '__ungrouped__';

export function ParamForm({ schema, values, onChange, disabled }: ParamFormProps) {
  const { t } = useTranslation();

  const groups = useMemo(() => {
    const map = new Map<string, ParamField[]>();
    for (const field of schema.fields) {
      const key = field.group ?? UNGROUPED_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(field);
    }
    return map;
  }, [schema.fields]);

  const groupLabel = (key: string): string => {
    if (key === UNGROUPED_KEY) return t('model.customize');
    return schema.groups?.find((g) => g.key === key)?.label ?? key;
  };

  return (
    <div>
      {Array.from(groups.entries()).map(([key, fields]) => (
        <CollapsibleSection key={key} title={groupLabel(key)} defaultOpen>
          {fields.map((field) => (
            <ParamFieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => onChange(field.key, v)}
              disabled={disabled}
            />
          ))}
        </CollapsibleSection>
      ))}
    </div>
  );
}

function ParamFieldInput({
  field,
  value,
  onChange,
  disabled,
}: {
  field: ParamField;
  value: string | number | boolean | undefined;
  onChange: (value: string | number | boolean) => void;
  disabled?: boolean;
}) {
  const label = field.unit ? `${field.label} (${field.unit})` : field.label;

  switch (field.type) {
    case 'number': {
      const v = typeof value === 'number' ? value : field.default;
      return (
        <div>
          <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
            <label htmlFor={field.key}>{label}</label>
            <input
              type="number"
              min={field.min}
              max={field.max}
              step={field.step}
              value={v}
              disabled={disabled}
              onChange={(e) => {
                const num = Number(e.target.value);
                if (Number.isFinite(num)) onChange(num);
              }}
              className="w-20 rounded border border-gray-300 px-2 py-0.5 text-right text-sm"
            />
          </div>
          <input
            id={field.key}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={v}
            disabled={disabled}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );
    }
    case 'boolean': {
      const v = typeof value === 'boolean' ? value : field.default;
      return (
        <div className="flex items-center justify-between text-sm text-gray-700">
          <label htmlFor={field.key}>{label}</label>
          <Switch id={field.key} checked={v} onCheckedChange={onChange} disabled={disabled} />
        </div>
      );
    }
    case 'enum': {
      const v = typeof value === 'string' ? value : field.default;
      return (
        <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
          <label htmlFor={field.key}>{label}</label>
          <Select
            value={v}
            onValueChange={onChange}
            options={field.options.map((o) => ({ value: o.value, label: o.label }))}
          />
        </div>
      );
    }
    case 'color': {
      const v = typeof value === 'string' ? value : field.default;
      return (
        <div className="flex items-center justify-between text-sm text-gray-700">
          <label htmlFor={field.key}>{label}</label>
          <input
            id={field.key}
            type="color"
            value={v}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-14 cursor-pointer rounded border border-gray-300 bg-white p-0.5"
          />
        </div>
      );
    }
    case 'text': {
      const v = typeof value === 'string' ? value : field.default;
      return (
        <div>
          <label htmlFor={field.key} className="mb-1 block text-sm text-gray-700">
            {label}
          </label>
          <input
            id={field.key}
            type="text"
            maxLength={field.maxLength}
            value={v}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
          />
        </div>
      );
    }
    default:
      return null;
  }
}

/** Builds the initial param values map from a schema's field defaults. */
export function defaultParamValues(schema: ParamSchema): ParamValues {
  const out: ParamValues = {};
  for (const field of schema.fields) {
    out[field.key] = field.default;
  }
  return out;
}
