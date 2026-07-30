'use client';

/**
 * AI Analytics — PLACEHOLDER PAGE.
 *
 * The UI is real: a member can pick a video and it is registered against their
 * profile in `analytics-queue.json`. Nothing analyses it yet.
 *
 * TODO(ai-analytics): to make this page live, in order —
 *   1. Swap `handleFiles` from metadata-only to a real multipart upload
 *      (`POST /api/analytics/uploads` with FormData; the route already exists and
 *      just needs a multer/busboy layer + `env.uploadsDir`).
 *   2. Poll `GET /api/analytics/uploads` for `status: 'complete'` and render the
 *      returned `analysis` payload instead of the "queued" chip.
 *   3. Build the results view: rep-by-rep score, joint-angle traces, bar-path
 *      overlay, and the detected fault list with coaching cues.
 *   4. Link a completed analysis back to the logged exercise so the dashboard
 *      can show a technique score beside the tonnage.
 * @see backend/src/services/analyticsService.js for the server-side plan.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { KioskShell } from '@/components/layout/KioskShell';
import { PageHeading } from '@/components/layout/PageHeading';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge, EmptyState, ErrorNote, LoadingPanel } from '@/components/ui/Feedback';
import { SelectField } from '@/components/ui/Field';
import { useRequireSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';
import { api, ApiError } from '@/lib/api';
import { cx, formatBytes, formatRelativeDate } from '@/lib/format';
import type { AnalyticsStatus, VideoUpload } from '@/lib/types';

const ROADMAP_TONE: Record<string, string> = {
  in_design: 'border-accent/40 bg-accent-soft text-accent',
  planned: 'border-white/10 bg-white/[0.03] text-white/45',
};

export default function AnalyticsPage() {
  const { user, token, isRestoring } = useRequireSession();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<AnalyticsStatus | null>(null);
  const [uploads, setUploads] = useState<VideoUpload[]>([]);
  const [exercise, setExercise] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(null);
      try {
        const statusResult = await api.getAnalyticsStatus(signal);
        setStatus(statusResult.status);
        setExercise((current) => current || statusResult.status.supportedLifts[0]?.name || '');

        if (token) {
          const uploadsResult = await api.listVideoUploads(token, signal);
          setUploads(uploadsResult.uploads);
        }
      } catch (caught) {
        if ((caught as Error).name === 'AbortError') return;
        setError(caught instanceof ApiError ? caught.message : 'Could not reach the AI lab');
      } finally {
        setIsLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /**
   * Registers the picked file. Only metadata crosses the wire today — the
   * binary is deliberately not uploaded until there is something to process it.
   */
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !token) return;
      const file = files[0];

      if (!exercise) {
        setError('Pick which lift this video shows first.');
        return;
      }

      const maxBytes = (status?.maxUploadMb ?? 250) * 1_000_000;
      if (file.size > maxBytes) {
        setError(`That file is ${formatBytes(file.size)} — the limit is ${status?.maxUploadMb ?? 250} MB.`);
        return;
      }

      setIsUploading(true);
      setError(null);
      try {
        const result = await api.queueVideoUpload(
          { exercise, fileName: file.name, fileSizeBytes: file.size },
          token,
        );
        setUploads((current) => [result.upload, ...current]);
        toast.info('Video queued', result.message);
      } catch (caught) {
        setError(caught instanceof ApiError ? caught.message : 'Could not queue that video');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [exercise, status, token, toast],
  );

  if (isRestoring || (isLoading && !status)) {
    return (
      <KioskShell>
        <LoadingPanel label="Connecting to the AI lab" />
      </KioskShell>
    );
  }

  if (!user || !token) {
    return (
      <KioskShell>
        <LoadingPanel label="Returning to scan" />
      </KioskShell>
    );
  }

  return (
    <KioskShell>
      <PageHeading
        eyebrow="Vision module"
        title="AI analytics"
        detail="Film a set, and Elever will grade your technique rep by rep."
        action={<Badge tone="warn">Pre-release</Badge>}
      />

      <div className="flex flex-col gap-4">
        {error ? <ErrorNote message={error} onRetry={() => setError(null)} /> : null}

        {/* ---------------------------------------------------------------- */}
        {/* Coming soon hero                                                 */}
        {/* ---------------------------------------------------------------- */}
        <Panel accent edge brackets className="overflow-hidden p-6 text-center sm:p-10">
          {/* Scanner rings behind the figure */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <svg viewBox="0 0 320 320" className="h-80 w-80 max-w-full">
              <g fill="none" stroke="rgb(var(--accent-rgb))">
                <circle cx="160" cy="160" r="64" strokeOpacity="0.14" />
                <circle cx="160" cy="160" r="104" strokeOpacity="0.09" />
                <circle
                  cx="160"
                  cy="160"
                  r="140"
                  strokeOpacity="0.16"
                  strokeDasharray="3 12"
                  className="animate-spin-slow"
                  style={{ transformOrigin: 'center' }}
                />
              </g>
            </svg>
          </div>

          <div className="relative">
            {/* Pose-skeleton glyph */}
            <svg viewBox="0 0 120 120" className="mx-auto h-24 w-24" aria-hidden>
              <g stroke="rgb(var(--accent-rgb))" strokeWidth="1.6" strokeLinecap="round" fill="none">
                <circle cx="60" cy="24" r="9" strokeOpacity="0.85" />
                <line x1="60" y1="33" x2="60" y2="66" strokeOpacity="0.7" />
                <line x1="60" y1="42" x2="38" y2="56" strokeOpacity="0.6" />
                <line x1="60" y1="42" x2="82" y2="56" strokeOpacity="0.6" />
                <line x1="38" y1="56" x2="32" y2="80" strokeOpacity="0.5" />
                <line x1="82" y1="56" x2="88" y2="80" strokeOpacity="0.5" />
                <line x1="60" y1="66" x2="46" y2="92" strokeOpacity="0.7" />
                <line x1="60" y1="66" x2="74" y2="92" strokeOpacity="0.7" />
                <line x1="46" y1="92" x2="42" y2="112" strokeOpacity="0.5" />
                <line x1="74" y1="92" x2="78" y2="112" strokeOpacity="0.5" />
              </g>
              {/* Joint nodes */}
              <g fill="rgb(var(--accent-rgb))">
                {[
                  [60, 42],
                  [38, 56],
                  [82, 56],
                  [60, 66],
                  [46, 92],
                  [74, 92],
                ].map(([cx2, cy2]) => (
                  <circle key={`${cx2}-${cy2}`} cx={cx2} cy={cy2} r="2.6" />
                ))}
              </g>
            </svg>

            <p className="mt-5 font-display text-[10px] font-semibold uppercase tracking-[0.34em] text-accent">
              Coming Soon
            </p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-[0.06em] text-white sm:text-3xl">
              AI Form Analysis
            </h2>
            <p className="mx-auto mt-3 max-w-md text-balance text-sm leading-relaxed text-white/45">
              {status?.message}
            </p>
          </div>
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Upload                                                           */}
        {/* ---------------------------------------------------------------- */}
        <Panel className="p-5">
          <PanelHeader label="Submit a set" title="Upload workout video" />

          <SelectField
            className="mt-4"
            label="Which lift is this?"
            value={exercise}
            onChange={(event) => setExercise(event.target.value)}
            options={(status?.supportedLifts ?? []).map((lift) => ({ value: lift.name, label: lift.name }))}
          />

          {/* Drop zone */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              void handleFiles(event.dataTransfer.files);
            }}
            className={cx(
              'mt-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
              isDragging ? 'border-accent/70 bg-accent-soft' : 'border-white/12 bg-white/[0.02]',
            )}
          >
            <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              Drop a video here
            </p>
            <p className="mt-1.5 text-xs text-white/30">
              {status?.acceptedFormats.join(' · ').toUpperCase()} · up to {status?.maxUploadMb} MB
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(event) => void handleFiles(event.target.files)}
            />

            <NeonButton
              className="mt-5"
              size="lg"
              isLoading={isUploading}
              onClick={() => fileInputRef.current?.click()}
              icon={!isUploading ? <span aria-hidden>⬆</span> : undefined}
            >
              {isUploading ? 'Queuing' : 'Upload video'}
            </NeonButton>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-white/30">
            Pre-release behaviour: your video stays on this device. Only the file name, size and chosen lift
            are recorded so your submission is first in the queue when analysis goes live.
          </p>
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Queue                                                            */}
        {/* ---------------------------------------------------------------- */}
        <Panel className="p-5">
          <PanelHeader
            label="Your queue"
            title={`${uploads.length} video${uploads.length === 1 ? '' : 's'}`}
          />

          {uploads.length === 0 ? (
            <EmptyState
              title="Nothing queued"
              detail="Upload a set above and it will wait here for the vision pipeline."
            />
          ) : (
            <ul className="mt-4 flex flex-col gap-1.5">
              {uploads.map((upload) => (
                <li
                  key={upload.id}
                  className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                      {upload.exercise}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-white/35">
                      {upload.fileName} · {formatBytes(upload.fileSizeBytes)} ·{' '}
                      {formatRelativeDate(upload.createdAt.slice(0, 10))}
                    </span>
                  </span>
                  <Badge tone="warn">{upload.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Roadmap                                                          */}
        {/* ---------------------------------------------------------------- */}
        <Panel className="p-5">
          <PanelHeader label="Build order" title="What ships when" />
          <ol className="mt-4 flex flex-col gap-2">
            {(status?.roadmap ?? []).map((phase) => (
              <li
                key={phase.phase}
                className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <span
                  className={cx(
                    'shrink-0 rounded-md border px-2 py-1 font-display text-[9px] font-semibold uppercase tracking-[0.14em]',
                    ROADMAP_TONE[phase.status] ?? ROADMAP_TONE.planned,
                  )}
                >
                  {phase.phase}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                    {phase.title}
                  </span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-white/40">{phase.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>

        {/* Supported lifts */}
        <Panel className="p-5">
          <PanelHeader
            label="Coverage"
            title="Lifts at launch"
            action={
              <span className="font-display text-[10px] uppercase tracking-[0.16em] text-white/30">
                {status?.supportedLifts.length ?? 0} movements
              </span>
            }
          />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {(status?.supportedLifts ?? []).map((lift) => (
              <span key={lift.name} className="chip">
                {lift.name}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </KioskShell>
  );
}
