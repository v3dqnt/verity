"use client";
import React, { useState, useRef, useEffect, memo } from "react";

// --- BACKGROUND COMPONENTS (Synced with Dashboard) ---
const ShootingStars = () => {
  const [stars, setStars] = useState<any[]>([]);
  useEffect(() => {
    const interval = setInterval(() => {
      setStars((prev) => [...prev, { id: Date.now(), x: Math.random() * 100, y: Math.random() * 50 }].slice(-3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <AnimatePresence>
        {stars.map((star) => (
          <motion.div
            key={star.id}
            initial={{ opacity: 0, x: -100, y: -100 }}
            animate={{ opacity: [0, 1, 0], x: 400, y: 400 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "linear" }}
            className="absolute h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
            style={{ left: `${star.x}%`, top: `${star.y}%`, width: '200px', transform: 'rotate(35deg)' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

const PrismaticStars = memo(() => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    const particleCount = 200;

    const createParticles = () => {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 1.5 + 0.5,
          color: Math.random() > 0.5 ? '#10b981' : '#ffffff',
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          z: Math.random() * 1000
        });
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      createParticles();
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseX.get();
      const my = mouseY.get();

      particles.forEach(p => {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const parallaxX = (dx / 40) * (p.z / 1000);
        const parallaxY = (dy / 40) * (p.z / 1000);

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x + parallaxX, p.y + parallaxY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.2 * (1 - p.z / 1000);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mouseX, mouseY]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
});
PrismaticStars.displayName = "PrismaticStars";

import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { VideoCameraIcon, ArrowUpTrayIcon, PlayCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";

export default function VisionPage() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // PERSISTENCE: Load from sessionStorage on mount
    useEffect(() => {
        const savedResult = sessionStorage.getItem('vision_analysis_result');
        const savedVideo = sessionStorage.getItem('vision_video_url');
        
        if (savedResult) {
            try {
                setAnalysisResult(JSON.parse(savedResult));
            } catch (e) { console.error("Error parsing saved analysis", e); }
        }
        
        if (savedVideo) {
            setVideoPreview(savedVideo);
        }
    }, []);

    // PERSISTENCE: Save to sessionStorage when data changes
    useEffect(() => {
        if (analysisResult) {
            sessionStorage.setItem('vision_analysis_result', JSON.stringify(analysisResult));
        }
        if (videoPreview) {
            sessionStorage.setItem('vision_video_url', videoPreview);
        }
    }, [analysisResult, videoPreview]);

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

    const seekTo = (seconds: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            videoRef.current.play();
            // Scroll to video if needed
            videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const parseTimestamp = (ts: string) => {
        if (!ts) return 0;
        const parts = ts.split(':');
        if (parts.length === 2) {
            return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
        }
        return parseFloat(ts) || 0;
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
        <>
            <PrismaticStars />
            <ShootingStars />
            <motion.div className="relative min-h-screen w-full flex flex-col items-center pt-28 md:pt-48 px-4 md:px-12 z-10 selection:bg-emerald-500 selection:text-black">
                <div className="max-w-5xl w-full">
                <header className="mb-8 md:mb-12 text-left">
                    <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.85] mb-4">
                        Vision
                    </h1>
                </header>

                <div className="flex flex-col gap-8">
                    {/* UPLOAD & PLAYBACK SECTION */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="liquid-glass rounded-[2rem] p-4 md:p-6 space-y-6 relative overflow-hidden h-fit"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                        <div className="relative z-10 w-full h-full space-y-4">
                            <div className="relative group rounded-[1.5rem] border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden w-full max-h-[70vh] aspect-video flex flex-col items-center justify-center text-center">
                                {!videoPreview ? (
                                    <>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                            <ArrowUpTrayIcon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors duration-300" />
                                        </div>
                                        <h3 className="text-lg font-medium text-white mb-1">Drop video here</h3>
                                        <p className="text-zinc-500 text-xs">MP4, MOV up to 100MB</p>
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

                            {videoPreview && (
                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-30 relative overflow-hidden"
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                            <span className="uppercase tracking-widest text-xs">Analyzing Frames...</span>
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircleIcon className="w-6 h-6" />
                                            <span className="uppercase tracking-widest text-xs">Run Vision Analysis</span>
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
                                className="liquid-glass rounded-[2rem] p-8 flex flex-col items-center justify-center text-center min-h-[300px] relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                <motion.div
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        rotate: [0, 180, 360],
                                        borderRadius: ["20%", "50%", "20%"]
                                    }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-12 h-12 border border-white/20 bg-white/5 mb-6"
                                />
                                <h3 className="text-lg font-medium text-white mb-2">Simulating Audience Reaction</h3>
                                <p className="text-zinc-400 text-xs">Extracting keyframes and analyzing pacing, retention hooks, and visual clarity...</p>
                            </motion.div>
                        )}

                        {analysisResult && !isAnalyzing && (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                {/* HEADER SCORES */}
                                <div className="liquid-glass rounded-[2rem] p-6 md:p-8 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                                    
                                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                                        <div className="relative group-hover:scale-105 transition-transform shrink-0">
                                            <div className="w-32 h-32 rounded-full border-2 border-emerald-500/10 flex items-center justify-center relative">
                                                <div className="text-4xl font-black text-white italic">
                                                    {analysisResult.retention_score}<span className="text-emerald-500 text-xl">/10</span>
                                                </div>
                                                <svg className="absolute -inset-1 w-34 h-34 -rotate-90">
                                                    <circle
                                                        cx="68" cy="68" r="64"
                                                        fill="transparent"
                                                        stroke="currentColor"
                                                        strokeWidth="3"
                                                        strokeDasharray={2 * Math.PI * 64}
                                                        strokeDashoffset={2 * Math.PI * 64 * (1 - analysisResult.retention_score / 10)}
                                                        className={`${analysisResult.retention_score >= 8 ? 'text-emerald-500' : analysisResult.retention_score >= 5 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                                                        style={{ transform: 'translate(0, 0)' }}
                                                    />
                                                </svg>
                                            </div>
                                            <p className="text-[8px] font-mono text-zinc-500 uppercase tracking-[0.3em] text-center mt-4 group-hover:text-emerald-400 transition-colors">Retention Score</p>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <h3 className="text-zinc-500 text-[9px] font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                                                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-emerald-500" /> Executive Verdict
                                            </h3>
                                            <p className="text-xl font-medium text-white leading-relaxed italic">
                                                "{analysisResult.verdict}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* RED FLAGS */}
                                    <div className="liquid-glass rounded-[2rem] p-6 md:p-8">
                                        <h3 className="text-zinc-500 text-[9px] font-mono uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500" /> Critical Red Flags ({analysisResult.red_flags.length})
                                        </h3>
                                        <div className="space-y-5">
                                            {analysisResult.red_flags.map((flag: any, i: number) => (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.05 * i }}
                                                    key={i}
                                                    className="flex gap-4 items-start group"
                                                >
                                                    <button 
                                                        onClick={() => seekTo(parseTimestamp(flag.timestamp))}
                                                        className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-lg text-[10px] font-mono shrink-0 hover:bg-red-500 hover:text-black transition-all cursor-pointer"
                                                    >
                                                        {flag.timestamp}
                                                    </button>
                                                    <div className="flex-1">
                                                        <h4 className="text-red-300 font-bold mb-0.5 text-xs">{flag.issue}</h4>
                                                        <p className="text-zinc-500 text-xs leading-relaxed">{flag.reason}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                            {analysisResult.red_flags.length === 0 && (
                                                <div className="text-emerald-500/50 text-xs italic">No major red flags detected.</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* SUGGESTIONS */}
                                    <div className="liquid-glass rounded-[2rem] p-6 md:p-8">
                                        <h3 className="text-zinc-500 text-[9px] font-mono uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                            <PlayCircleIcon className="w-3.5 h-3.5 text-emerald-500" /> Strategic Fixes
                                        </h3>
                                        <div className="space-y-4">
                                            {analysisResult.suggestions.map((suggestion: string, i: number) => (
                                                <div key={i} className="flex gap-3 items-start group">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                                                    <p className="text-zinc-400 text-xs leading-snug">{suggestion}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* TRANSCRIPT */}
                                {analysisResult.transcriptSegments && analysisResult.transcriptSegments.length > 0 && (
                                    <div className="liquid-glass rounded-[2rem] p-6 md:p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-zinc-500 text-[9px] font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                                                <PlayCircleIcon className="w-3.5 h-3.5 text-emerald-500" /> Audio Transcript
                                            </h3>
                                            <button
                                                onClick={() => handleCopyTranscript(analysisResult)}
                                                className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 hover:text-emerald-400 transition-colors bg-white/5 border border-white/5 px-3 py-1.5 rounded-full cursor-pointer"
                                            >
                                                {copied ? "Copied!" : "Copy"}
                                            </button>
                                        </div>
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                                            {analysisResult.transcriptSegments.map((seg: any, idx: number) => (
                                                <button 
                                                    key={idx} 
                                                    onClick={() => seekTo(seg.start)}
                                                    className="flex gap-4 items-start w-full text-left group hover:bg-white/[0.02] p-2 rounded-xl transition-colors"
                                                >
                                                    <span className="text-emerald-500/40 font-mono text-[10px] shrink-0 w-16 pt-0.5 group-hover:text-emerald-400 transition-colors">
                                                        {seg.start.toFixed(1)}s
                                                    </span>
                                                    <span className="text-zinc-400 text-xs leading-relaxed group-hover:text-zinc-200 transition-colors">{seg.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    </>
    );
}
