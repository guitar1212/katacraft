import { ParamFieldType, type ParamValues } from '@katacraft/shared';

/**
 * Builds the argv array for the OpenSCAD CLI. This is the one place in the
 * codebase that turns user data into a subprocess command line, so it is
 * deliberately conservative:
 *  - Never goes through a shell (caller must use execFile with shell:false).
 *  - Every value in `params` MUST already have passed
 *    `sanitizeParamValues()` from @katacraft/shared — this function trusts
 *    its input's *type* (number/boolean/string) but re-validates that
 *    strings don't contain characters that could break out of the OpenSCAD
 *    string literal, as defense in depth.
 *  - `$fn` (render resolution) is set by the caller, never by user input,
 *    so a client can't request an arbitrarily expensive render.
 */
export function buildOpenscadArgs(opts: {
  scadPath: string;
  outputPath: string;
  paramValues: ParamValues;
  fieldTypes: Record<string, ParamFieldType>;
  fn: number;
}): string[] {
  const args: string[] = ['-o', opts.outputPath];

  args.push('-D', `$fn=${Math.max(8, Math.min(256, Math.round(opts.fn)))}`);

  for (const [key, value] of Object.entries(opts.paramValues)) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
      throw new Error(`Refusing unsafe OpenSCAD variable name: ${key}`);
    }
    const type = opts.fieldTypes[key];
    args.push('-D', `${key}=${formatValue(value, type)}`);
  }

  args.push(opts.scadPath);
  return args;
}

function formatValue(value: string | number | boolean, type: ParamFieldType | undefined): string {
  if (type === ParamFieldType.NUMBER) {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('expected finite number');
    return String(value);
  }
  if (type === ParamFieldType.BOOLEAN) {
    if (typeof value !== 'boolean') throw new Error('expected boolean');
    return value ? 'true' : 'false';
  }
  // ENUM / COLOR / TEXT all become OpenSCAD string literals.
  const str = String(value);
  if (/["\\\n\r]/.test(str)) {
    throw new Error('string value contains disallowed characters after sanitization — refusing to render');
  }
  return `"${str}"`;
}
