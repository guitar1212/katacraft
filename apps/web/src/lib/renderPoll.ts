import type { RenderJobStatus } from '@katacraft/shared';
import { RenderStatus } from '@katacraft/shared';
import { api } from './api';

const POLL_INTERVAL_MS = 1500;

/**
 * Polls GET /render/:id every ~1.5s while QUEUED/PROCESSING, resolving with
 * the final RenderJobStatus once DONE or FAILED. Pass an AbortController's
 * `signal` to stop polling early (e.g. component unmount); in that case the
 * promise never resolves, so callers should ignore results after abort.
 */
export function pollRenderJob(
  id: string,
  onUpdate: (status: RenderJobStatus) => void,
  signal?: AbortSignal,
): Promise<RenderJobStatus> {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      if (signal?.aborted) return;
      try {
        const status = await api.get<RenderJobStatus>(`/render/${id}`);
        if (signal?.aborted) return;
        onUpdate(status);
        if (status.status === RenderStatus.DONE || status.status === RenderStatus.FAILED) {
          resolve(status);
          return;
        }
        setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        if (!signal?.aborted) reject(err);
      }
    };
    tick();
  });
}
