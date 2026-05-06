import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const gemini = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClipMetadata {
  file: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  has_audio: boolean;
}

export interface FrameDescription {
  timestamp_seconds: number;
  description: string;
  energy_level: 'low' | 'medium' | 'high';
  cut_worthy: boolean;
}

export interface ClipAnalysis {
  file: string;
  metadata: ClipMetadata;
  frame_descriptions: FrameDescription[];
}

export interface EditClip {
  file: string;
  trim_start: number;
  trim_end: number;
  transition: 'cut' | 'crossfade';
  transition_duration: number;
}

export interface EditPlan {
  total_duration_seconds: number;
  clips: EditClip[];
  color_grade: 'cinematic' | 'warm' | 'cool' | 'vintage' | 'none';
  music_fade_out: boolean;
}

// ---------------------------------------------------------------------------
// Step 1: Probe metadata with ffprobe
// ---------------------------------------------------------------------------

export function probeClip(clipPath: string): Promise<ClipMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(clipPath, (err, data) => {
      if (err) return reject(err);
      const vStream = data.streams.find(s => s.codec_type === 'video');
      const aStream = data.streams.find(s => s.codec_type === 'audio');
      const fps = vStream?.r_frame_rate
        ? eval(vStream.r_frame_rate) // e.g. "30000/1001"
        : 30;
      resolve({
        file: path.basename(clipPath),
        duration: parseFloat(String(data.format.duration || 0)),
        width: vStream?.width || 1920,
        height: vStream?.height || 1080,
        fps: Math.round(fps),
        has_audio: !!aStream,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Step 2: Extract keyframes (1 frame per 2 seconds)
// ---------------------------------------------------------------------------

export function extractKeyframes(clipPath: string, jobDir: string, clipIndex: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const outDir = path.join(jobDir, `frames_${clipIndex}`);
    fs.mkdirSync(outDir, { recursive: true });

    ffmpeg(clipPath)
      .outputOptions(['-vf', 'fps=0.5', '-q:v', '3', '-s', '640x360'])
      .output(path.join(outDir, 'frame_%04d.jpg'))
      .on('end', () => {
        try {
          const files = fs.readdirSync(outDir)
            .filter(f => f.endsWith('.jpg'))
            .sort()
            .map(f => path.join(outDir, f));
          resolve(files);
        } catch (e) {
          reject(e);
        }
      })
      .on('error', reject)
      .run();
  });
}

// ---------------------------------------------------------------------------
// Step 3: Analyze frames with Gemini Vision (via OpenRouter)
// ---------------------------------------------------------------------------

export async function analyzeClipWithGemini(
  framePaths: string[],
  clipName: string,
  duration: number
): Promise<FrameDescription[]> {
  if (framePaths.length === 0) return [];

  // Build image parts (max 15 frames to control cost)
  const framesToUse = framePaths.slice(0, 15);
  const imageParts = framesToUse.map(fp => {
    const base64 = fs.readFileSync(fp).toString('base64');
    return {
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64}`
      }
    };
  });

  const prompt = `You are analyzing frames extracted from a video clip named "${clipName}" (${duration.toFixed(1)}s long).
Frames were extracted at 0.5 fps (one frame every 2 seconds).

For each frame, return a JSON array with this exact shape — no markdown, no preamble, raw JSON only:
[
  {
    "timestamp_seconds": 2,
    "description": "person laughing, close up",
    "energy_level": "high",
    "cut_worthy": true
  }
]

energy_level must be one of: "low", "medium", "high"
cut_worthy means this frame is a good in-point or out-point for an edit.
Return exactly ${framesToUse.length} objects, one per frame in order.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-exp:free",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageParts
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '[]';
    
    // Strip any markdown fences
    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed: FrameDescription[] = JSON.parse(cleaned);

    // Attach correct timestamps (frame N = N*2 seconds)
    return parsed.map((f, i) => ({
      ...f,
      timestamp_seconds: (i + 1) * 2,
    }));
  } catch (e) {
    console.error('Gemini analysis failed, using fallback:', e);
    // Fallback: basic descriptions
    return framesToUse.map((_, i) => ({
      timestamp_seconds: (i + 1) * 2,
      description: `frame at ${(i + 1) * 2}s`,
      energy_level: 'medium' as const,
      cut_worthy: i % 3 === 0,
    }));
  }
}

// ---------------------------------------------------------------------------
// Step 4: GPT-4o plans the edit
// ---------------------------------------------------------------------------

export async function planEditWithGPT(
  brief: string,
  clipsData: ClipAnalysis[]
): Promise<EditPlan> {
  // Format clips as plain text for GPT
  const clipsText = clipsData.map(c => {
    const frames = c.frame_descriptions
      .map(f => `  [${f.timestamp_seconds}s] ${f.description} | energy=${f.energy_level} | cut_worthy=${f.cut_worthy}`)
      .join('\n');
    return `Clip: ${c.metadata.file}
Duration: ${c.metadata.duration.toFixed(1)}s | Resolution: ${c.metadata.width}x${c.metadata.height} | FPS: ${c.metadata.fps} | Has audio: ${c.metadata.has_audio}
Frames:
${frames}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are a professional video editor AI. You receive a creative brief and analyzed clip data, and output a precise JSON edit plan.

Rules:
- trim_start and trim_end must be within clip duration
- crossfade transition_duration must be 0.3 to 1.0 seconds
- cut transitions have transition_duration of 0
- total_duration_seconds should match the brief (60s reel = ~60, 30s = ~30, etc.)
- color_grade: "cinematic", "warm", "cool", "vintage", or "none"
- Use cut_worthy frames to pick good in/out points
- Output ONLY valid JSON. No markdown. No preamble.`;

  const userMessage = `BRIEF: ${brief}

CLIPS:
${clipsText}

Return a JSON edit plan with this exact shape:
{
  "total_duration_seconds": 60,
  "clips": [
    {
      "file": "clip1.mp4",
      "trim_start": 3.5,
      "trim_end": 6.0,
      "transition": "crossfade",
      "transition_duration": 0.5
    }
  ],
  "color_grade": "cinematic",
  "music_fade_out": true
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const text = response.choices[0]?.message?.content || '{}';
  return JSON.parse(text) as EditPlan;
}

// ---------------------------------------------------------------------------
// Step 5: FFmpeg renders the final video
// ---------------------------------------------------------------------------

// curves filter with single-quotes INSIDE filter_complex is rejected by many FFmpeg builds.
// Use colorlevels instead — it's a simple, universally supported filter.
const COLOR_GRADES: Record<string, string> = {
  cinematic: 'colorlevels=rimin=0.05:gimin=0:bimin=0.02:rimax=0.97:gimax=1:bimax=0.95',
  warm:      'colorlevels=rimin=0:gimin=0:bimin=0:rimax=1:gimax=0.92:bimax=0.82',
  cool:      'colorlevels=rimin=0:gimin=0:bimin=0.04:rimax=0.88:gimax=0.96:bimax=1',
  vintage:   'colorlevels=rimin=0.04:gimin=0:bimin=0.08:rimax=0.92:gimax=0.88:bimax=0.76',
  none: '',
};

export function renderVideo(
  editPlan: EditPlan,
  clipDir: string,
  musicPath: string | null,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const { clips, color_grade, music_fade_out } = editPlan;
    const gradeFilter = COLOR_GRADES[color_grade] || '';

    const cmd = ffmpeg();

    // Add all video inputs
    clips.forEach(clip => {
      cmd.input(path.join(clipDir, clip.file));
    });

    // Add music if provided
    if (musicPath) cmd.input(musicPath);

    // Build filter_complex
    let filterComplex = '';
    const trimmedLabels: string[] = [];

    clips.forEach((clip, i) => {
      // scale down to fit, then pad to exactly 1920x1080 with black bars.
      // Using fixed 0:0 offset avoids any expression evaluation issues across FFmpeg versions.
      filterComplex += `[${i}:v]trim=${clip.trim_start}:${clip.trim_end},setpts=PTS-STARTPTS,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:0:0,fps=30,format=yuv420p,setsar=1[v${i}];\n`;
      trimmedLabels.push(`[v${i}]`);
    });

    let videoOut = '';

    if (clips.length > 1) {
      // We force 'concat' instead of 'xfade' because xfade is too fragile with diverse clip lengths
      const n = clips.length;
      filterComplex += `${trimmedLabels.join('')}concat=n=${n}:v=1:a=0[concatv];\n`;
      videoOut = '[concatv]';
    } else {
      // Single clip, no concat needed
      videoOut = '[v0]';
    }

    // Apply color grade
    if (gradeFilter) {
      filterComplex += `${videoOut}${gradeFilter}[finalv];\n`;
      videoOut = '[finalv]';
    }

    // Audio handling: if music is provided, use it as the sole audio track
    const audioInputIdx = clips.length; // music input index
    if (musicPath) {
      const totalDur = editPlan.total_duration_seconds || 30; // fallback if 0
      const fadeFilter = music_fade_out ? `,afade=t=out:st=${Math.max(0, totalDur - 3)}:d=3` : '';
      filterComplex += `[${audioInputIdx}:a]volume=0.25${fadeFilter}[outa]`;
    }

    const finalComplexFilter = filterComplex.trimEnd().replace(/;\n$/, '');
    console.log("---- FFMPEG COMPLEX FILTER ----\n" + finalComplexFilter + "\n-------------------------------");

    const outputLabels = musicPath ? [videoOut.replace(/[\[\]]/g, ''), 'outa'] : [videoOut.replace(/[\[\]]/g, '')];

    cmd
      .complexFilter(filterComplex.trimEnd().replace(/;\n$/, ''))
      .outputOptions([
        `-map [${outputLabels[0]}]`,
        ...(musicPath ? [`-map [${outputLabels[1]}]`] : []),
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => {
        console.error('FFmpeg render error:', err.message);
        reject(err);
      })
      .run();
  });
}
