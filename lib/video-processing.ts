import fs from 'fs';
import os from 'os';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import OpenAI from 'openai';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const openaiKey = process.env.OPENAI_API_KEY || '';
const openai = new OpenAI({ apiKey: openaiKey });

/**
 * Extracts frames from a video at specific intervals: 1s, 2s, 3s, and then every 3 seconds.
 * 
 * @param videoPath path to the local video file
 * @returns Array of base64 encoded strings of the frames
 */
export async function extractFrames(videoPath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'verity-frames-'));
        const filePattern = path.join(outDir, 'frame-%d.jpg');

        ffmpeg(videoPath)
            .outputOptions([
                '-vf', 'fps=1', // 1 frame per second
                '-q:v', '2',
                '-s', '480x854' // resize to 480p to save tokens
            ])
            .output(filePattern)
            .on('end', () => {
                try {
                    const files = fs.readdirSync(outDir).sort((a, b) => {
                        const numA = parseInt(a.replace('frame-', '').replace('.jpg', ''));
                        const numB = parseInt(b.replace('frame-', '').replace('.jpg', ''));
                        return numA - numB;
                    });

                    // files correspond to seconds 1, 2, 3, 4, 5...
                    // We want visual hook (1s, 2s, 3s) and then every 3 seconds (6s, 9s, 12s, 15s)
                    const selectedFiles = files.filter((f, index) => {
                        const s = index + 1;
                        return s <= 3 || s % 3 === 0;
                    });

                    const base64Frames = selectedFiles.map(f => {
                        const buf = fs.readFileSync(path.join(outDir, f));
                        return `data:image/jpeg;base64,${buf.toString('base64')}`;
                    });

                    // Cleanup
                    fs.rmSync(outDir, { recursive: true, force: true });

                    resolve(base64Frames);
                } catch (e) {
                    reject(e);
                }
            })
            .on('error', (err) => {
                // Cleanup on error
                fs.rmSync(outDir, { recursive: true, force: true });
                console.error("FFMPEG Error:", err);
                reject(err);
            })
            .run();
    });
}

/**
 * Extracts audio from a video and transcodes it to mp3 for OpenAI Whisper.
 * @param videoPath path to the video
 * @returns path to the extracted mp3
 */
export async function extractAudio(videoPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const audioPath = path.join(os.tmpdir(), `audio-${Date.now()}.mp3`);

        ffmpeg(videoPath)
            .noVideo()
            .audioCodec('libmp3lame')
            .output(audioPath)
            .on('end', () => resolve(audioPath))
            .on('error', (err) => reject(err))
            .run();
    });
}

/**
 * Analyzes audio for volume and silence features.
 */
export async function analyzeAudioMetadata(videoPath: string): Promise<any> {
    return new Promise((resolve) => {
        const stats = {
            mean_volume: -20,
            max_volume: 0,
            silences: [] as { start: number, duration: number }[]
        };

        ffmpeg(videoPath)
            .audioFilters(['volumedetect', 'silencedetect=n=-30dB:d=0.2'])
            .format('null')
            .output('-')
            .on('stderr', (line: string) => {
                if (line.includes('mean_volume:')) {
                    const match = line.match(/mean_volume: ([\-\d\.]+) dB/);
                    if (match) stats.mean_volume = parseFloat(match[1]);
                }
                if (line.includes('max_volume:')) {
                    const match = line.match(/max_volume: ([\-\d\.]+) dB/);
                    if (match) stats.max_volume = parseFloat(match[1]);
                }
                if (line.includes('silence_start:')) {
                    const match = line.match(/silence_start: ([\d\.]+)/);
                    if (match) stats.silences.push({ start: parseFloat(match[1]), duration: 0 });
                }
                if (line.includes('silence_duration:')) {
                    const match = line.match(/silence_duration: ([\d\.]+)/);
                    if (match && stats.silences.length > 0) {
                        stats.silences[stats.silences.length - 1].duration = parseFloat(match[1]);
                    }
                }
            })
            .on('end', () => resolve(stats))
            .on('error', () => resolve(stats))
            .run();
    });
}

/**
 * Transcribes an audio file using OpenAI Whisper.
 * @param audioPath path to the audio file
 * @returns transcription text
 */
export async function transcribeAudio(audioPath: string): Promise<any> {
    try {
        const fileStream = fs.createReadStream(audioPath);
        const response = await openai.audio.transcriptions.create({
            file: fileStream,
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment']
        });

        // Cleanup the temporary audio file
        fs.unlinkSync(audioPath);

        return response as any;
    } catch (e) {
        fs.unlinkSync(audioPath);
        throw e;
    }
}
