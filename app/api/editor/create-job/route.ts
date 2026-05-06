import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '../../auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Supabase admin client (bypasses RLS — auth enforced manually via Clerk/token)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = 'editor-clips';
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB per clip

export async function POST(req: Request) {
  try {
    const userId = await getAuthenticatedUser(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await req.formData();
    const brief = form.get('brief') as string | null;

    if (!brief?.trim()) {
      return NextResponse.json({ error: 'Brief is required' }, { status: 400 });
    }

    // Collect clip files
    const clipFiles: File[] = [];
    for (const [key, value] of form.entries()) {
      if (key.startsWith('clip_') && value instanceof File) {
        if (value.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: `File ${value.name} exceeds 500 MB limit` }, { status: 400 });
        }
        clipFiles.push(value);
      }
    }

    if (clipFiles.length === 0) {
      return NextResponse.json({ error: 'At least one clip is required' }, { status: 400 });
    }

    const musicFile = form.get('music') instanceof File ? form.get('music') as File : null;

    // Generate a job ID to use as the storage prefix
    const jobId = crypto.randomUUID();
    const clipPaths: string[] = [];
    let musicPath: string | null = null;

    // Upload clips to Supabase storage
    for (let i = 0; i < clipFiles.length; i++) {
      const file = clipFiles[i];
      const ext = file.name.split('.').pop() || 'mp4';
      const storagePath = `${userId}/${jobId}/clips/clip_${i + 1}.${ext}`;

      const bytes = await file.arrayBuffer();
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, bytes, {
          contentType: file.type || 'video/mp4',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        return NextResponse.json({ error: `Failed to upload clip: ${error.message}` }, { status: 500 });
      }

      clipPaths.push(storagePath);
    }

    // Upload music if provided
    if (musicFile) {
      const ext = musicFile.name.split('.').pop() || 'mp3';
      const storagePath = `${userId}/${jobId}/music/track.${ext}`;
      const bytes = await musicFile.arrayBuffer();
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(storagePath, bytes, {
          contentType: musicFile.type || 'audio/mpeg',
          upsert: false,
        });

      if (!error) musicPath = storagePath;
    }

    // Create the job record
    const { error: dbError } = await supabaseAdmin
      .from('edit_jobs')
      .insert({
        id: jobId,
        user_id: userId,
        brief: brief.trim(),
        clip_paths: clipPaths,
        music_path: musicPath,
        status: 'pending',
      });

    if (dbError) {
      console.error('DB insert error:', dbError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    return NextResponse.json({ jobId });
  } catch (err: any) {
    console.error('create-job error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
