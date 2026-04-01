"use client";
import React, { useState, useEffect } from 'react';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { Image as ImageIcon, Loader2, Download, Wand2 } from 'lucide-react';

export default function VisualSandbox() {
  const { activeBrand } = useActiveBrand();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const generateImage = async (promptText: string) => {
    if (!promptText.trim() || !activeBrand) return;
    setLoading(true);
    setImageUrl(null);
    setPrompt(promptText);
    try {
      const fullPrompt = `A clean, professional, minimalist UI diagram or infographic for brand ${activeBrand.company_name} (Industry: ${activeBrand.industry}). Create a flat-design diagrammatic explanation of: ${promptText}. Do not use realistic photography or photorealistic elements. Focus on vector-style icons, structural mind-maps, geometric shapes, and clean text layout against a dark, tech-focused background.`;
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      });
      const data = await res.json();
      if (data.url) setImageUrl(data.url);
      else console.error(data.error || "Failed to generate visual.");
    } catch (e) {
      console.error("Error generating image.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleGenerate = (e: any) => {
      const promptText = e.detail;
      if (promptText) {
        generateImage(promptText);
      }
    };
    window.addEventListener('generateVisual', handleGenerate);
    return () => window.removeEventListener('generateVisual', handleGenerate);
  }, [activeBrand]); // Re-bind when brand changes

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${activeBrand?.company_name || 'brand'}_visual.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!activeBrand) return null;

  return (
    <div className="flex flex-col h-full bg-black/40 p-6 relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
      
      <div className="flex gap-3 items-center mb-6 relative z-10">
        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
          <Wand2 size={16} className="text-emerald-500" />
        </div>
        <div>
          <span className="text-xs font-black uppercase italic tracking-widest text-white">Visual Sandbox</span>
          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Co-Pilot Canvas</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-[1.5rem] flex-1 flex items-center justify-center overflow-hidden relative min-h-[250px]">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">Rendering Frame...</span>
              <span className="text-xs font-mono text-zinc-500 italic max-w-xs text-center">"{prompt}"</span>
            </div>
          ) : imageUrl ? (
            <div className="w-full h-full relative group/img">
              <img src={imageUrl} alt="Generated visual" className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-105" />
              <div className="absolute top-4 left-4 right-4 text-[9px] font-mono text-white/50 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 line-clamp-2">
                 {prompt}
              </div>
              <button 
                onClick={handleDownload}
                className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/20 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
                title="Download Visual"
              >
                <Download size={18} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-30 gap-3 text-center p-6">
              <ImageIcon size={48} className="text-zinc-500" />
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-loose">
                Waiting for Brainstorm Agent <br/> to conceptualize visuals...
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
