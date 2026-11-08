import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadCandidates, type SelectedCandidate } from './select-candidates.js';
import { FEATURED_BUCKET, pruneFeatured } from './prune.js';

export const DOWNLOAD_TIMEOUT_MS = 15_000;
export const DOWNLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_MAX_MINUTES = 25;
export const DEFAULT_APP_URL = 'https://zerodollar-blond.vercel.app';

export type CliReportRow = { listing_id: string; pass: boolean; reasons: string[]; seconds: number };

export type CliRunner = (args: {
  inDir: string;
  outDir: string;
  reportPath: string;
  deadlineUnix: number;
}) => Promise<void>;

export type FeaturedTickDeps = {
  supabase: SupabaseClient;
  now?: () => Date;
  fetchImpl?: typeof fetch;
  runCli?: CliRunner;
  loadCandidatesImpl?: typeof loadCandidates;
  pruneImpl?: typeof pruneFeatured;
  notify?: (text: string) => Promise<void>;
  maxMinutes?: number;
  appUrl?: string;
};

export type FeaturedTickResult = {
  pruned: number;
  selected: number;
  downloaded: number;
  passed: number;
  inserted: number;
  timedOut: boolean;
};

const CLI_PATH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../featured/cli.py');

/** Spawn the Python CLI with a minimal env — no Supabase/alert secrets reach the image step. */
export const spawnPythonCli: CliRunner = ({ inDir, outDir, reportPath, deadlineUnix }) =>
  new Promise((resolve, reject) => {
    const python = process.env.FEATURED_PYTHON?.trim() || 'python3';
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: process.env.HOME };
    if (process.env.U2NET_HOME) env.U2NET_HOME = process.env.U2NET_HOME;
    const child = spawn(
      python,
      ['-I', CLI_PATH, '--in', inDir, '--out', outDir, '--report', reportPath,
        '--deadline', String(deadlineUnix)],
      { env, stdio: ['ignore', 'inherit', 'inherit'] },
    );
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`featured cli exited with code ${code}`)),
    );
  });

export async function downloadImage(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const res = await fetchImpl(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const declared = Number(res.headers.get('content-length') ?? '0');
  if (declared > DOWNLOAD_MAX_BYTES) throw new Error(`too large (${declared} bytes)`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > DOWNLOAD_MAX_BYTES) throw new Error(`too large (${buf.byteLength} bytes)`);
  return buf;
}

export function buildOperatorMessage(count: number, appUrl: string): string {
  return `今日精选：${count} 件新候选待审核 → ${appUrl.replace(/\/+$/, '')}/admin/featured`;
}

/** One daily pass: prune → select → download → cutout/gate (Python) → upload passing images → notify. */
export async function runFeaturedTick(deps: FeaturedTickDeps): Promise<FeaturedTickResult> {
  const now = deps.now ?? (() => new Date());
  const startedAt = now();
  const budgetMs = (deps.maxMinutes ?? DEFAULT_MAX_MINUTES) * 60_000;
  const deadline = startedAt.getTime() + budgetMs;
  const overBudget = () => now().getTime() >= deadline;
  const { supabase } = deps;

  const pruned = await (deps.pruneImpl ?? pruneFeatured)(supabase, startedAt);
  const selected = await (deps.loadCandidatesImpl ?? loadCandidates)(supabase, startedAt);
  const result: FeaturedTickResult = {
    pruned, selected: selected.length, downloaded: 0, passed: 0, inserted: 0, timedOut: false,
  };
  if (selected.length === 0) return result;

  const work = await mkdtemp(path.join(tmpdir(), 'featured-'));
  try {
    const inDir = path.join(work, 'in');
    const outDir = path.join(work, 'out');
    const reportPath = path.join(work, 'report.json');
    await mkdir(inDir, { recursive: true });

    const byId = new Map<string, SelectedCandidate>();
    for (const c of selected) {
      if (overBudget()) {
        result.timedOut = true;
        break;
      }
      try {
        const bytes = await downloadImage(c.sourceUrl, deps.fetchImpl);
        await writeFile(path.join(inDir, `${c.listingId}.jpg`), bytes);
        byId.set(c.listingId, c);
        result.downloaded += 1;
      } catch (err) {
        console.warn(`[featured] download skipped ${c.listingId}: ${(err as Error).message}`);
      }
    }
    if (byId.size === 0 || overBudget()) {
      result.timedOut ||= overBudget();
      return result;
    }

    await (deps.runCli ?? spawnPythonCli)({
      inDir, outDir, reportPath, deadlineUnix: Math.floor(deadline / 1000),
    });
    const report = JSON.parse(await readFile(reportPath, 'utf8')) as CliReportRow[];
    if (report.length < byId.size) result.timedOut = true;

    const batchDate = startedAt.toISOString().slice(0, 10);
    for (const row of report) {
      const cand = byId.get(row.listing_id);
      if (!cand || !row.pass) continue;
      result.passed += 1;
      const studioPath = `${batchDate}/${cand.listingId}.webp`;
      const bytes = await readFile(path.join(outDir, `${cand.listingId}.webp`));
      const { error: upErr } = await supabase.storage
        .from(FEATURED_BUCKET)
        .upload(studioPath, bytes, { contentType: 'image/webp', upsert: false });
      if (upErr) {
        console.warn(`[featured] upload failed ${cand.listingId}: ${upErr.message}`);
        continue;
      }
      const { error: insErr } = await supabase.from('featured_candidates').insert({
        listing_id: cand.listingId,
        consumer_city: cand.consumerCity,
        batch_date: batchDate,
        studio_path: studioPath,
        gate: { reasons: row.reasons, seconds: row.seconds },
        status: 'pending',
      });
      if (insErr) {
        // No orphan objects: undo the upload when the row cannot be written.
        await supabase.storage.from(FEATURED_BUCKET).remove([studioPath]);
        console.warn(`[featured] insert failed ${cand.listingId}: ${insErr.message}`);
        continue;
      }
      result.inserted += 1;
    }
  } finally {
    await rm(work, { recursive: true, force: true });
  }

  if (result.inserted > 0 && deps.notify) {
    try {
      await deps.notify(buildOperatorMessage(result.inserted, deps.appUrl ?? DEFAULT_APP_URL));
    } catch (err) {
      console.error('[featured] notify failed:', err);
    }
  }
  return result;
}
