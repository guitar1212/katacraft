import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  ParamFieldType,
  ParamSchema,
  sanitizeParamValues,
  type ExportFormat,
} from '@katacraft/shared';
import { buildOpenscadArgs } from './openscad-args';
import { StorageService } from '../storage/storage.service';

export interface RenderResult {
  outputKey: string;
  outputUrl: string;
}

@Injectable()
export class OpenscadCliService {
  private readonly logger = new Logger(OpenscadCliService.name);
  private readonly bin: string;
  private readonly timeoutMs: number;

  constructor(
    private config: ConfigService,
    private storage: StorageService,
  ) {
    this.bin = this.config.get<string>('OPENSCAD_BIN', 'openscad');
    this.timeoutMs = Number(this.config.get<string>('RENDER_TIMEOUT_MS', '60000'));
  }

  /**
   * Renders one job: writes the .scad source to a scratch temp file,
   * invokes the OpenSCAD CLI with a fully-sanitized argv, and stores the
   * resulting geometry file. Throws on invalid params or a non-zero exit.
   */
  async render(opts: {
    scadSource: string;
    paramSchema: ParamSchema;
    rawParams: Record<string, unknown>;
    format: ExportFormat;
    fn: number;
    outputPrefix: string;
  }): Promise<RenderResult> {
    const paramValues = sanitizeParamValues(opts.paramSchema, opts.rawParams);
    const fieldTypes: Record<string, ParamFieldType> = {};
    for (const f of opts.paramSchema.fields) fieldTypes[f.key] = f.type;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'katacraft-render-'));
    const scadPath = path.join(tmpDir, `${randomUUID()}.scad`);
    const localOutputPath = path.join(tmpDir, `output.${opts.format}`);

    try {
      await fs.writeFile(scadPath, opts.scadSource, 'utf-8');

      const args = buildOpenscadArgs({
        scadPath,
        outputPath: localOutputPath,
        paramValues,
        fieldTypes,
        fn: opts.fn,
      });

      await this.runOpenscad(args);

      const outputBuffer = await fs.readFile(localOutputPath);
      const stored = await this.storage.saveBuffer(opts.outputPrefix, `model.${opts.format}`, outputBuffer);
      return { outputKey: stored.key, outputUrl: stored.url };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  private runOpenscad(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        this.bin,
        args,
        { timeout: this.timeoutMs, killSignal: 'SIGKILL', windowsHide: true, shell: false },
        (error, stdout, stderr) => {
          if (error) {
            this.logger.warn(`openscad failed: ${error.message}\n${stderr}`);
            reject(new Error(`OpenSCAD render failed: ${stderr?.trim() || error.message}`));
            return;
          }
          resolve();
        },
      );
    });
  }
}
