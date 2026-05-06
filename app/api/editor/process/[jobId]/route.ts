import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../../auth';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  probeClip,
  extractKeyframes,
  analyzeClipWithGemini,
  planEditWithGPT,
  renderVideo,
  ClipAnalysis,
} from '@/lib/editor-pipeline';

export const maxDuration = 300; // 5 min max
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLIPS_BUCKET = 'editor-clips';
const OUTPUT_BUCKET = 'editor-output';

async function setStatus(jobId: string, status: string, extra: Record<string, unknown> = {}) {
  await supabaseAdmin.from('edit_jobs').update({ status, ...extra }).eq('id', jobId);
}

async function downloadFromStorage(storagePath: string, destPath: string) {
  const { data, error } = await supabaseAdmin.storage.from(CLIPS_BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Failed to download ${storagePath}: ${error?.message}`);
  const buf = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(destPath, buf);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const jobDir = path.join(os.tmpdir(), 'verity', jobId);

  try {
    const userId = await getAuthenticatedUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Load job from DB
    const { data: job, error: fetchErr } = await supabaseAdmin
      .from('edit_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (!['pending', 'failed'].includes(job.status)) {
      return NextResponse.json({ error: 'Job already processing or complete' }, { status: 409 });
    }

    fs.mkdirSync(jobDir, { recursive: true });

    // -----------------------------------------------------------------------
    // STAGE 1: Extract keyframes + probe metadata
    // -----------------------------------------------------------------------
    await setStatus(jobId, 'extracting');

    const localClipPaths: string[] = [];
    for (let i = 0; i < job.clip_paths.length; i++) {
      const sp = job.clip_paths[i];
      const ext = sp.split('.').pop() || 'mp4';
      const localPath = path.join(jobDir, `clip_${i + 1}.${ext}`);
      await downloadFromStorage(sp, localPath);
      localClipPaths.push(localPath);
    }

    let localMusicPath: string | null = null;
    if (job.music_path) {
      const ext = job.music_path.split('.').pop() || 'mp3';
      localMusicPath = path.join(jobDir, `music.${ext}`);
      await downloadFromStorage(job.music_path, localMusicPath);
    }

    // Probe metadata + extract frames in parallel per clip
    const clipAnalyses: ClipAnalysis[] = [];
    const metaResults = await Promise.all(
      localClipPaths.map((p, i) => Promise.all([
        probeClip(p),
        extractKeyframes(p, jobDir, i),
      ]))
    );

    // -----------------------------------------------------------------------
    // STAGE 2: Gemini frame analysis
    // -----------------------------------------------------------------------
    await setStatus(jobId, 'analyzing');

    for (let i = 0; i < localClipPaths.length; i++) {
      const [metadata, framePaths] = metaResults[i];
      const frameDescriptions = await analyzeClipWithGemini(
        framePaths,
        metadata.file,
        metadata.duration
      );
      clipAnalyses.push({ file: metadata.file, metadata, frame_descriptions: frameDescriptions });
    }

    // Save analyses to DB
    await supabaseAdmin.from('edit_jobs').update({
      clip_metadata: clipAnalyses.map(c => c.metadata),
      frame_descriptions: clipAnalyses.map(c => c.frame_descriptions),
    }).eq('id', jobId);

    // -----------------------------------------------------------------------
    // STAGE 3: GPT-4o edit planning
    // -----------------------------------------------------------------------
    await setStatus(jobId, 'planning');

    const editPlan = await planEditWithGPT(job.brief, clipAnalyses);

    // Validate + clamp the plan to use actual local filenames
    const localClipNames = localClipPaths.map(p => path.basename(p));
    editPlan.clips = editPlan.clips
      .filter(c => {
        // GPT uses clip names like "clip1.mp4" — map them to our actual names
        return true;
      })
      .map(c => {
        // Resolve the file to a local clip name
        const resolvedName = localClipNames.find(n =>
          n.toLowerCase().includes(c.file.toLowerCase().replace(/\.[^.]+$/, ''))
        ) || localClipNames[0];
        return {
          ...c,
          file: resolvedName,
          trim_start: Math.max(0, c.trim_start),
          trim_end: Math.min(
            clipAnalyses.find(ca => ca.metadata.file === c.file || resolvedName === ca.metadata.file)?.metadata.duration || 9999,
            c.trim_end
          ),
        };
      });

    await supabaseAdmin.from('edit_jobs').update({ edit_plan: editPlan }).eq('id', jobId);

    // -----------------------------------------------------------------------
    // STAGE 4: FFmpeg render
    // -----------------------------------------------------------------------
    await setStatus(jobId, 'rendering');

    const outputPath = path.join(jobDir, 'output.mp4');
    await renderVideo(editPlan, jobDir, localMusicPath, outputPath);

    // -----------------------------------------------------------------------
    // Upload output to storage
    // -----------------------------------------------------------------------
    const outputBytes = fs.readFileSync(outputPath);
    const outputStoragePath = `${userId}/${jobId}/output.mp4`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(OUTPUT_BUCKET)
      .upload(outputStoragePath, outputBytes, {
        contentType: 'video/mp4',
        upsert: true,
      });

    if (uploadErr) throw new Error(`Output upload failed: ${uploadErr.message}`);

    // Get a signed URL (7-day expiry)
    const { data: signedData } = await supabaseAdmin.storage
      .from(OUTPUT_BUCKET)
      .createSignedUrl(outputStoragePath, 60 * 60 * 24 * 7);

    await setStatus(jobId, 'done', { output_url: signedData?.signedUrl || null });

    return NextResponse.json({ status: 'done', output_url: signedData?.signedUrl });
  } catch (err: any) {
    console.error(`[editor/process/${jobId}] error:`, err.message || err);
    await setStatus(jobId, 'failed', { error: err.message || 'Unknown error' }).catch(() => {});
    return NextResponse.json({ error: err.message || 'Processing failed' }, { status: 500 });
  } finally {
    // Always clean up temp files
    try {
      if (fs.existsSync(jobDir)) fs.rmSync(jobDir, { recursive: true, force: true });
    } catch {}
  }
}
