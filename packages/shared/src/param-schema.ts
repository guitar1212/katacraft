import { z } from 'zod';

/**
 * Defines the shape of one customization field, and how it maps to an
 * OpenSCAD `-D name=value` argument. Every field type has a narrow,
 * fully-validated value space so user input can never smuggle extra
 * OpenSCAD syntax into the CLI invocation (see render/openscad-args.ts).
 */
export const ParamFieldType = {
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ENUM: 'enum',
  COLOR: 'color',
  TEXT: 'text',
} as const;
export type ParamFieldType = (typeof ParamFieldType)[keyof typeof ParamFieldType];

const baseField = {
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'must be a valid OpenSCAD identifier'),
  label: z.string().min(1).max(120),
  group: z.string().max(60).optional(),
  unit: z.string().max(20).optional(),
};

export const NumberFieldSchema = z.object({
  ...baseField,
  type: z.literal(ParamFieldType.NUMBER),
  min: z.number(),
  max: z.number(),
  step: z.number().positive().default(1),
  default: z.number(),
});

export const BooleanFieldSchema = z.object({
  ...baseField,
  type: z.literal(ParamFieldType.BOOLEAN),
  default: z.boolean(),
});

export const EnumFieldSchema = z.object({
  ...baseField,
  type: z.literal(ParamFieldType.ENUM),
  options: z
    .array(z.object({ value: z.string().min(1).max(60), label: z.string().min(1).max(120) }))
    .min(1),
  default: z.string(),
});

export const ColorFieldSchema = z.object({
  ...baseField,
  type: z.literal(ParamFieldType.COLOR),
  default: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const TextFieldSchema = z.object({
  ...baseField,
  type: z.literal(ParamFieldType.TEXT),
  maxLength: z.number().int().positive().max(200).default(40),
  // Restrict to a conservative charset: OpenSCAD strings are passed inside
  // double quotes on the CLI; disallow quotes/backslashes/control chars.
  pattern: z.string().max(200).optional(),
  default: z.string(),
});

export const ParamFieldSchema = z.discriminatedUnion('type', [
  NumberFieldSchema,
  BooleanFieldSchema,
  EnumFieldSchema,
  ColorFieldSchema,
  TextFieldSchema,
]);
export type ParamField = z.infer<typeof ParamFieldSchema>;

export const ParamSchemaSchema = z.object({
  groups: z.array(z.object({ key: z.string().min(1).max(60), label: z.string().min(1).max(120) })).optional(),
  fields: z.array(ParamFieldSchema).min(1).max(50),
});
export type ParamSchema = z.infer<typeof ParamSchemaSchema>;

export type ParamValues = Record<string, string | number | boolean>;

const SAFE_TEXT_RE = /^[a-zA-Z0-9 _\-.,!?()#@%&*+/]*$/;

export class ParamValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'ParamValidationError';
  }
}

/**
 * Validates raw user-supplied param values against a ParamSchema and
 * returns a fully-sanitized value map safe to forward to the OpenSCAD CLI.
 * Unknown keys are dropped; missing keys fall back to the field default.
 * Throws ParamValidationError on the first invalid field.
 */
export function sanitizeParamValues(schema: ParamSchema, raw: Record<string, unknown>): ParamValues {
  const out: ParamValues = {};

  for (const field of schema.fields) {
    const value = raw[field.key];

    switch (field.type) {
      case ParamFieldType.NUMBER: {
        const num = value === undefined ? field.default : Number(value);
        if (!Number.isFinite(num)) throw new ParamValidationError(field.key, 'must be a finite number');
        if (num < field.min || num > field.max) {
          throw new ParamValidationError(field.key, `must be between ${field.min} and ${field.max}`);
        }
        out[field.key] = num;
        break;
      }
      case ParamFieldType.BOOLEAN: {
        const bool = value === undefined ? field.default : value;
        if (typeof bool !== 'boolean') throw new ParamValidationError(field.key, 'must be a boolean');
        out[field.key] = bool;
        break;
      }
      case ParamFieldType.ENUM: {
        const str = value === undefined ? field.default : String(value);
        if (!field.options.some((o) => o.value === str)) {
          throw new ParamValidationError(field.key, 'must be one of the defined options');
        }
        out[field.key] = str;
        break;
      }
      case ParamFieldType.COLOR: {
        const str = value === undefined ? field.default : String(value);
        if (!/^#[0-9a-fA-F]{6}$/.test(str)) throw new ParamValidationError(field.key, 'must be a #rrggbb hex color');
        out[field.key] = str;
        break;
      }
      case ParamFieldType.TEXT: {
        const str = value === undefined ? field.default : String(value);
        if (str.length > field.maxLength) {
          throw new ParamValidationError(field.key, `must be at most ${field.maxLength} characters`);
        }
        const re = field.pattern ? new RegExp(field.pattern) : SAFE_TEXT_RE;
        if (!re.test(str)) throw new ParamValidationError(field.key, 'contains disallowed characters');
        out[field.key] = str;
        break;
      }
    }
  }

  return out;
}
