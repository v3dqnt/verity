import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { extractFrames, extractAudio, transcribeAudio, analyzeAudioMetadata } from '@/lib/video-processing';

export const maxDuration = 120; // Allow enough time for video processing and analysis
export const dynamic = 'force-dynamic';

const openaiKey = process.env.OPENAI_API_KEY || '';

const VisionResponseSchema = z.object({
    retention_score: z.number().describe("0-10 score predicting audience retention based on both visual spacing and audio/spoken hooks"),
    red_flags: z.array(z.object({
        timestamp: z.string().describe("Estimated timestamp or '0:00' format"),
        issue: z.string().describe("Short issue name (e.g. 'Slow Hook', 'Cluttered Visuals', 'Boring Intro')"),
        reason: z.string().describe("Detailed explanation of why this will cause a drop-off, referencing visuals and audio")
    })).describe("List of critical red flags that might make the video flop"),
    suggestions: z.array(z.string()).describe("3-5 actionable improvement suggestions"),
    verdict: z.string().describe("A harsh but fair 1-2 sentence final verdict on the video's potential on TikTok/Reels")
});

export async function POST(req: Request) {
    let tempVideoPath: string | null = null;
    let tempAudioPath: string | null = null;

    try {
        const { videoUrl } = await req.json();

        if (!videoUrl) {
            return NextResponse.json({ error: "No video URL provided" }, { status: 400 });
        }

        if (!openaiKey) {
            return NextResponse.json({ error: "System configuration error: OpenAI Key missing." }, { status: 500 });
        }

        // SSRF protection: Validate URL is HTTPS and matches allowed storage domain
        let parsed;
        try {
            parsed = new URL(videoUrl);
        } catch {
            return NextResponse.json({ error: "Invalid video URL format" }, { status: 400 });
        }
        
        const allowedHosts = [process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')];
        if (parsed.protocol !== 'https:' || !allowedHosts.some(h => h && parsed.hostname.endsWith(h))) {
            return NextResponse.json({ error: 'Invalid video URL: Host not allowed' }, { status: 400 });
        }

        // Download the file from Supabase to the temp directory
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) throw new Error("Failed to download video from storage");
        
        const bytes = await videoResponse.arrayBuffer();
        const buffer = Buffer.from(bytes);
        tempVideoPath = path.join(os.tmpdir(), `upload-${Date.now()}.mp4`);
        fs.writeFileSync(tempVideoPath, buffer);

        console.log(`Processing video: ${tempVideoPath}`);

        // Extract frames and audio in parallel
        console.log("Extracting frames and audio...");
        const [frames, audioPath] = await Promise.all([
            extractFrames(tempVideoPath),
            extractAudio(tempVideoPath)
        ]);
        tempAudioPath = audioPath; // Store to clean up later

        console.log(`Extracted ${frames.length} frames.`);

        // Transcribe and analyze audio in parallel
        console.log(`Analyzing audio features and transcribing...`);
        let transcript = 'No spoken audio detected.';
        let transcriptSegments: any[] = [];
        let audioStats: any = { mean_volume: -20, max_volume: 0, silences: [] };

        try {
            const [whisperResponse, stats] = await Promise.all([
                transcribeAudio(audioPath),
                analyzeAudioMetadata(tempVideoPath!)
            ]);

            if (whisperResponse && whisperResponse.text) {
                transcript = whisperResponse.text;
                transcriptSegments = whisperResponse.segments || [];
            }
            audioStats = stats;
            console.log(`Audio analysis completed.`);
        } catch (err: any) {
            console.warn("Audio analysis failed:", err.message || err);
        }

        // Calculate Audio Metadata Features
        const totalDuration = transcriptSegments.length > 0 ? transcriptSegments[transcriptSegments.length - 1].end : 1;
        const totalWords = transcript.split(/\s+/).filter(w => w.length > 0).length;
        const wordsPerSecond = (totalWords / (totalDuration || 1)).toFixed(1);
        const silenceInFirst3s = audioStats.silences
            .filter((s: any) => s.start < 3)
            .reduce((acc: number, s: any) => acc + s.duration, 0);

        const energyRamp = audioStats.max_volume > -5 ? "Explosive" : (audioStats.mean_volume < -25 ? "Slow" : "Steady");

        const audioFeatureSummary = `
Speech speed: ${wordsPerSecond} words/sec
Silence in first 3s: ${silenceInFirst3s > 0.5 ? 'YES (' + silenceInFirst3s.toFixed(1) + 's)' : 'NO'}
Energy ramp: ${energyRamp}
Volume Range: ${(audioStats.max_volume - audioStats.mean_volume).toFixed(1)}dB
Music detected: ${transcript.toLowerCase().includes('music') ? 'YES' : 'NO'}
`.trim();

        const openai = new OpenAI({ apiKey: openaiKey });

        const contentParts: any[] = [
            {
                type: "text",
                text: `You are a ruthless social media strategist and marketing psychology expert for Gen Z brands. Your goal is to analyze the virality potential of this short-form video (TikTok/Reels/Shorts).

virality relies heavily on visual pacing and the audio hook.
I will provide you with the audio transcript of the video, followed by a sequence of visual frames. The frames are extracted specifically at the 1-second, 2-second, and 3-second marks to check the "visual hook", and then every 3 seconds to check the pacing.

--- AUDIO ANALYSIS ---
${audioFeatureSummary}

--- TRANSCRIPT ---
${transcript}

--- TIMESTAMPS ---
${transcriptSegments.map(seg => `[${seg.start}s - ${seg.end}s]: ${seg.text}`).join('\n')}
------------------

Analyze the retention probability. Specifically check:
1. The spoken hook & tone in the first 3 seconds (specifically account for the ${silenceInFirst3s > 0.5 ? 'dead air' : 'instant audio start'}).
2. Speech speed (${wordsPerSecond} words/sec) - is it too slow for Gen Z or too fast to understand?
3. The visual pacing & hook (first 3 frames).
4. The overall energy (${energyRamp}), editing rhythm, and pacing throughout the video.

Point out "red flags" that will make users scroll away (e.g., boring hook, bad lighting, slow pacing, awkward framing, lack of subtitles if speech is present), and offer actionable fixes.

Respond in valid JSON matching this schema:
{
  "retention_score": number (0-10), 
  "red_flags": [{ "timestamp": "0:05", "issue": "Weak Hook", "reason": "Text is too small" }],
  "suggestions": ["Add faster cuts in the intro", "Start with the main punchline"],
  "verdict": "Will flop unless pacing is fixed."
}`
            }
        ];

        // Add the extracted frames
        frames.slice(0, 20).forEach((imgData: string) => {
            contentParts.push({
                type: "image_url",
                image_url: {
                    url: imgData,
                    detail: "low" // Keep cost/latency down
                }
            });
        });

        console.log(`Analyzing video content with GPT-5.4...`);

        const response = await openai.chat.completions.create({
            model: "gpt-5.4",
            messages: [
                {
                    role: "user",
                    content: contentParts
                }
            ],
            response_format: zodResponseFormat(VisionResponseSchema, "vision_analysis"),
            temperature: 0.7,
        });

        const resultText = response.choices[0]?.message?.content || "{}";
        const data = JSON.parse(resultText);

        // Include transcript and segments in response
        data.transcript = transcript;
        data.transcriptSegments = transcriptSegments;
        data.audio_features = {
            words_per_second: wordsPerSecond,
            silence_duration_first_3s: silenceInFirst3s,
            energy_ramp: energyRamp,
            mean_volume: audioStats.mean_volume,
            max_volume: audioStats.max_volume
        };

        // Cleanup temp file
        if (tempVideoPath && fs.existsSync(tempVideoPath)) {
            fs.unlinkSync(tempVideoPath);
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("VIDEO_API_ERROR:", error.message || error);

        // Cleanup temp files on error
        if (tempVideoPath && fs.existsSync(tempVideoPath)) {
            try { fs.unlinkSync(tempVideoPath); } catch (e) { }
        }
        if (tempAudioPath && fs.existsSync(tempAudioPath)) {
            try { fs.unlinkSync(tempAudioPath); } catch (e) { }
        }

        return NextResponse.json({ error: error.message || "Failed to analyze video" }, { status: 500 });
    }
}
