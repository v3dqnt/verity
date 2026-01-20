"use client";
import React, { useState, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Image as ImageIcon, Download, Share2, Layers, Loader2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from "next/navigation";

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

export default function ImgedPage() {
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [mode, setMode] = useState<"image" | "video">("image");
  const [error, setError] = useState<string | null>(null);

  const navigateWithFade = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => router.push(href), 500);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedImage(null);
    setGeneratedVideo(null);

    try {
      const res = await fetch('/api/ai/imged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          image: uploadedImageBase64,
          type: mode
        })
      });

      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (mode === "video") {
        setGeneratedVideo(data.url);
      } else {
        setGeneratedImage(data.url);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = async () => {
    const result = mode === "video" ? generatedVideo : generatedImage;
    if (!result) return;
    try {
      const a = document.createElement('a');
      a.href = result;
      a.download = `verity-imged-${mode}-${Date.now()}${mode === "video" ? ".mp4" : ".png"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed", err);
      window.open(result, '_blank');
    }
  };

  return (
    <main className="min-h-screen bg-[#020202] text-white p-6 md:p-12 relative overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-black">
      <Stars />
      <div className="max-w-7xl mx-auto relative z-10">

        {/* NAVIGATION */}
        <nav className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
          <Link
            href="/dashboard"
            onClick={(e) => navigateWithFade(e, "/dashboard")}
            className="flex items-center gap-3 text-zinc-500 hover:text-emerald-500 transition-all group"
          >
            <ArrowLeft size={18} />
            <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Back To Hub</span>
          </Link>
        </nav>

        {/* HEADER */}
        <header className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
              AD <span className="text-emerald-500">/</span> ENGINE
            </h1>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-4">Generative Visual Synthesis</p>
          </div>

          {/* MODE TOGGLE */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setMode("image")}
              className={`px-8 py-3 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${mode === "image" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"}`}
            >
              Image
            </button>
            <button
              onClick={() => setMode("video")}
              className={`px-8 py-3 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all ${mode === "video" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"}`}
            >
              Video
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

          {/* CONTROLS */}
          <div className="lg:col-span-4 space-y-8">
            <div className="liquid-glass p-8 rounded-[2.5rem] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              {/* Image Upload for Img2Img */}
              <div className="mb-8 relative z-10">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4 block flex items-center justify-between">
                  <span className="flex items-center gap-2"><ImageIcon size={12} className="text-emerald-500" /> Reference Image (Optional)</span>
                  {uploadedImageBase64 && (
                    <button onClick={() => setUploadedImageBase64(null)} className="text-red-500 hover:text-red-400 text-[10px]">REMOVE</button>
                  )}
                </label>

                {!uploadedImageBase64 ? (
                  <div
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="w-full h-32 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group/upload"
                  >
                    <ImageIcon size={24} className="text-zinc-600 group-hover/upload:text-emerald-500 transition-colors mb-2" />
                    <span className="text-zinc-600 text-xs font-mono uppercase">Click to Upload Reference</span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setUploadedImageBase64(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 relative rounded-2xl overflow-hidden border border-white/10 group/preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadedImageBase64} alt="Reference" className="w-full h-full object-cover opacity-60 group-hover/preview:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Prompt Input */}
              <div className="mb-8 relative z-10">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4 block flex items-center gap-2">
                  <Sparkles size={12} className="text-emerald-500" /> Vision Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the visual... e.g. 'Cyberpunk street food vendor in Tokyo, neon lights, rain, cinematic lighting, 8k'"
                  className="w-full bg-black/50 border border-white/10 rounded-2xl p-6 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-emerald-500/50 min-h-[160px] resize-none leading-relaxed"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="mb-10 relative z-10">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4 block flex items-center gap-2">
                  <Layers size={12} className="text-emerald-500" /> Dimensions
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: '9:16', label: 'Story', icon: '▮' },
                    { id: '16:9', label: 'Cinema', icon: '▬' },
                  ].map((ratio) => (
                    <button
                      key={ratio.id}
                      onClick={() => setAspectRatio(ratio.id)}
                      className={`
                                        p-4 rounded-xl border flex flex-col items-center gap-2 transition-all
                                        ${aspectRatio === ratio.id
                          ? 'bg-emerald-500 text-black border-emerald-500'
                          : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'}
                                    `}
                    >
                      <span className="text-xl">{ratio.icon}</span>
                      <span className="text-[8px] font-mono uppercase tracking-widest">{ratio.label}</span>
                    </button>
                  ))}
                </div>
              </div>



              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading || !prompt}
                className="w-full relative z-10 py-6 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)]"
              >
                {loading ? <Loader2 className="animate-spin" /> : mode === "video" ? <Sparkles size={20} /> : <ImageIcon size={20} />}
                {loading ? "Synthesizing..." : mode === "video" ? "Generate Video" : "Generate Visual"}
              </button>

              {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-mono text-center">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* PREVIEW AREA */}
          <div className="lg:col-span-8">
            <div className="h-full min-h-[600px] liquid-glass rounded-[3rem] p-2 relative overflow-hidden flex items-center justify-center group">

              {!generatedImage && !generatedVideo && !loading && (
                <div className="text-center opacity-30">
                  {mode === "video" ? <Sparkles size={64} className="mx-auto mb-6 text-emerald-500" /> : <ImageIcon size={64} className="mx-auto mb-6 text-emerald-500" />}
                  <p className="text-2xl font-black italic uppercase text-white tracking-tighter">Ready to {mode === "video" ? "Animate" : "Visualize"}</p>
                  <p className="text-xs font-mono uppercase tracking-widest mt-2">{mode === "video" ? "Specify motion in prompt" : "Enter prompt to initialize engine"}</p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                  <div className="w-24 h-24 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-8" />
                  <p className="text-emerald-500 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">{mode === "video" ? "VEOSynthesis in progress..." : "Diffusion in progress..."}</p>
                </div>
              )}

              {mode === "video" && generatedVideo && (
                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden group/image">
                  <video
                    src={generatedVideo}
                    autoPlay
                    loop
                    muted
                    controls
                    className="w-full h-full object-contain bg-black/40"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex justify-between items-end transform translate-y-4 group-hover/image:translate-y-0 duration-300">
                    <div>
                      <p className="text-white text-sm font-bold truncate max-w-md">{prompt}</p>
                      <p className="text-emerald-500 text-[9px] font-mono uppercase tracking-widest mt-1">Veo 3.1 Preview</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={downloadResult} className="p-3 bg-white/10 hover:bg-emerald-500 hover:text-black border border-white/10 rounded-full backdrop-blur-md transition-all">
                        <Download size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mode === "image" && generatedImage && (
                <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden group/image">
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-full object-contain bg-black/40"
                  />

                  <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex justify-between items-end transform translate-y-4 group-hover/image:translate-y-0 duration-300">
                    <div>
                      <p className="text-white text-sm font-bold truncate max-w-md">{prompt}</p>
                      <p className="text-emerald-500 text-[9px] font-mono uppercase tracking-widest mt-1">Nano Banana</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={downloadResult} className="p-3 bg-white/10 hover:bg-emerald-500 hover:text-black border border-white/10 rounded-full backdrop-blur-md transition-all">
                        <Download size={20} />
                      </button>
                      <button onClick={() => window.open(generatedImage, '_blank')} className="p-3 bg-white/10 hover:bg-white border border-white/10 hover:text-black rounded-full backdrop-blur-md transition-all">
                        <Maximize2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}