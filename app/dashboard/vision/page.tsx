"use client";
import React, { useState, useRef, useEffect, memo } from "react";

// --- BACKGROUND COMPONENT (From Radar) ---
const Stars = memo(() => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        let stars: any[] = [];
        const init = () => {
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            stars = Array.from({ length: 100 }, () => ({
                x: Math.random() * canvas.width, y: Math.random() * canvas.height,
                size: Math.random() * 1.5, opacity: Math.random(), speed: Math.random() * 0.01 + 0.005
            }));
        };
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(s => {
                s.opacity += s.speed; if (s.opacity > 1 || s.opacity < 0) s.speed = -s.speed;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(s.opacity)})`; ctx.fill();
            });
            requestAnimationFrame(render);
        };
        init(); render(); window.addEventListener('resize', init);
        return () => window.removeEventListener('resize', init);
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-30" />;
});
import { motion, AnimatePresence } from "framer-motion";
import { VideoCameraIcon, ArrowUpTrayIcon, PlayCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";

export default function VisionPage() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith("video/")) {
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
            setAnalysisResult(null);
        }
    };

    const handleAnalyze = async () => {
        if (!videoFile) return;

        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            // 1. Upload to Supabase Storage to bypass Vercel's 4.5MB payload limit
            const fileExt = videoFile.name.split('.').pop() || 'mp4';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vision-videos')
                .upload(filePath, videoFile);

            if (uploadError) {
                console.error("Supabase upload error:", uploadError);
                throw new Error("Failed to upload video to storage. Make sure your 'vision-videos' bucket exists and is public.");
            }

            const { data: urlData } = supabase.storage
                .from('vision-videos')
                .getPublicUrl(filePath);

            if (!urlData.publicUrl) throw new Error("Could not get public URL for video.");

            // 2. Send the URL to the API
            const response = await fetch("/api/ai/vision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoUrl: urlData.publicUrl }),
            });

            if (!response.ok) throw new Error("Analysis failed on server.");

            const data = await response.json();
            setAnalysisResult(data);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Failed to analyze video. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCopyTranscript = (result: any) => {
        let textToCopy = "";

        if (result.transcriptSegments && result.transcriptSegments.length > 0) {
            textToCopy = result.transcriptSegments
                .map((seg: any) => `[${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s]: ${seg.text}`)
                .join("\n");
        } else {
            textToCopy = result.transcript || "";
        }

        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="min-h-screen bg-[#020202] text-white pt-32 p-6 md:p-12 relative overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-black">
            <Stars />
            <div className="max-w-7xl mx-auto relative z-10">
                <header className="mt-12 md:mt-32 mb-20 text-center md:text-left">
                    <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
                        Vision
                    </h1>
                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-4">Audience Hooks & Visual Pacing</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* UPLOAD SECTION */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="liquid-glass rounded-[2rem] p-6 md:p-8 space-y-6 relative overflow-hidden h-fit"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                        <div className="relative z-10 w-full h-full space-y-6">
                            <div className="relative group rounded-[1.5rem] border-2 border-dashed border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden aspect-[9/16] md:aspect-video lg:aspect-[9/16] flex flex-col items-center justify-center p-8 text-center cursor-pointer">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />

                                {!videoPreview ? (
                                    <>
                                        <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <ArrowUpTrayIcon className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors duration-300" />
                                        </div>
                                        <h3 className="text-xl font-medium text-white mb-2">Drop video here</h3>
                                        <p className="text-zinc-500 text-sm">MP4, MOV up to 100MB</p>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 w-full h-full bg-black z-0">
                                        <video
                                            ref={videoRef}
                                            src={videoPreview}
                                            className="w-full h-full object-contain"
                                            controls
                                            preload="metadata"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Canvas not needed anymore */}                        {videoPreview && (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 relative overflow-hidden"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            <span className="uppercase tracking-widest text-sm">Analyzing Frames...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircleIcon className="w-6 h-6" />
                                            <span className="uppercase tracking-widest text-sm">Run Vision Analysis</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* RESULTS SECTION */}
                    <AnimatePresence mode="popLayout">
                        {isAnalyzing && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="liquid-glass rounded-[2rem] p-8 flex flex-col items-center justify-center text-center min-h-[400px] relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 180, 360],
                                        borderRadius: ["20%", "50%", "20%"]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-16 h-16 border border-white/20 bg-white/5 mb-6"
                                />
                                <h3 className="text-xl font-medium text-white mb-2">Simulating Audience Reaction</h3>
                                <p className="text-zinc-400 text-sm">Extracting keyframes and analyzing pacing, retention hooks, and visual clarity...</p>
                            </motion.div>
                        )}

                        {analysisResult && !isAnalyzing && (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="liquid-glass rounded-[2rem] p-8 space-y-8 flex flex-col h-full overflow-y-auto relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                <div className="relative z-10 space-y-8">
                                    {/* HEADER SCORES */}
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* MAIN SCORE & VERDICT */}
                                        <div className="bg-zinc-900/80 border border-white/5 p-10 rounded-[3rem] backdrop-blur-sm relative overflow-hidden group">
                                            <div className="flex flex-col md:flex-row items-center gap-12">
                                                <div className="relative group-hover:scale-105 transition-transform">
                                                    <div className="w-48 h-48 rounded-full border-4 border-emerald-500/20 flex items-center justify-center relative">
                                                        <div className="text-6xl font-black text-white italic">
                                                            {analysisResult.retention_score}<span className="text-emerald-500 text-3xl">/10</span>
                                                        </div>
                                                        {/* SVG Progress Ring */}
                                                        <svg className="absolute -inset-1 w-50 h-50 -rotate-90">
                                                            <circle
                                                                cx="100" cy="100" r="96"
                                                                fill="transparent"
                                                                stroke="currentColor"
                                                                strokeWidth="4"
                                                                strokeDasharray={2 * Math.PI * 96}
                                                                strokeDashoffset={2 * Math.PI * 96 * (1 - analysisResult.retention_score / 10)}
                                                                className={`${analysisResult.retention_score >= 8 ? 'text-emerald-500' : analysisResult.retention_score >= 5 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                                            />
                                                        </svg>
                                                    </div>
                                                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] text-center mt-6 group-hover:text-emerald-400 transition-colors">Retention Score</p>
                                                </div>

                                                <div className="flex-1 space-y-4">
                                                    <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                                                        <ExclamationTriangleIcon className="w-4 h-4 text-emerald-500" /> Executive Verdict
                                                    </h3>
                                                    <p className="text-2xl font-medium text-white leading-relaxed italic">
                                                        "{analysisResult.verdict}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RED FLAGS */}
                                        <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem]">
                                            <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                                                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" /> Critical Red Flags ({analysisResult.red_flags.length})
                                            </h3>
                                            <div className="space-y-6">
                                                {analysisResult.red_flags.map((flag: any, i: number) => (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.1 * i }}
                                                        key={i}
                                                        className="flex gap-4 items-start group"
                                                    >
                                                        <div className="bg-red-500/20 text-red-500 border border-red-500/30 px-3 py-1 rounded-full text-xs font-mono shrink-0 group-hover:scale-105 transition-transform">
                                                            {flag.timestamp}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-red-300 font-medium mb-1 text-sm">{flag.issue}</h4>
                                                            <p className="text-zinc-400 text-sm leading-relaxed">{flag.reason}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                                {analysisResult.red_flags.length === 0 && (
                                                    <div className="text-emerald-500/50 text-sm italic">No major red flags detected.</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* SUGGESTIONS */}
                                        <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem]">
                                            <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                                                <PlayCircleIcon className="w-4 h-4 text-emerald-500" /> Improvement Suggestions
                                            </h3>
                                            <div className="grid gap-3">
                                                {analysisResult.suggestions.map((suggestion: string, i: number) => (
                                                    <div key={i} className="flex gap-4 items-start group">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                                                        <p className="text-zinc-400 text-sm leading-tight">{suggestion}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {analysisResult.transcriptSegments && analysisResult.transcriptSegments.length > 0 ? (
                                        <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem]">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <PlayCircleIcon className="w-4 h-4 text-emerald-500" /> Audio Transcript
                                                </h3>
                                                <button
                                                    onClick={() => handleCopyTranscript(analysisResult)}
                                                    className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition-colors bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 px-4 py-2 rounded-full cursor-pointer"
                                                >
                                                    {copied ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                            <div className="space-y-4 max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                                                {analysisResult.transcriptSegments.map((seg: any, idx: number) => (
                                                    <div key={idx} className="flex gap-6 items-start group">
                                                        <span className="text-emerald-500/50 font-mono text-xs shrink-0 w-24 pt-1 group-hover:text-emerald-400 transition-colors">
                                                            {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                                                        </span>
                                                        <span className="text-zinc-300 text-sm leading-relaxed group-hover:text-white transition-colors">{seg.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : analysisResult.transcript && analysisResult.transcript !== "No spoken audio detected." && (
                                        <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem]">
                                            <div className="flex items-center justify-between mb-8">
                                                <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                                                    <PlayCircleIcon className="w-4 h-4 text-emerald-500" /> Audio Transcript
                                                </h3>
                                                <button
                                                    onClick={() => handleCopyTranscript(analysisResult)}
                                                    className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-emerald-400 transition-colors bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 px-4 py-2 rounded-full cursor-pointer"
                                                >
                                                    {copied ? "Copied!" : "Copy"}
                                                </button>
                                            </div>
                                            <p className="text-zinc-300 leading-relaxed text-sm italic">
                                                "{analysisResult.transcript}"
                                            </p>
                                        </div>
                                    )}

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
}
