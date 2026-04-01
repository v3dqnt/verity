"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useActiveBrand } from '@/hooks/useActiveBrand';
import { Target, Loader2, Zap, Sparkles, Instagram } from 'lucide-react';

const formatInline = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold text-emerald-400">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-zinc-300">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const renderMarkdown = (text: string) => {
  return text.split('\n').map((line, i) => {
    if (line.trim().startsWith('### ')) {
      return <h3 key={i} className="text-sm font-black italic text-emerald-400 mt-6 mb-3 uppercase tracking-widest">{formatInline(line.replace('### ', ''))}</h3>;
    }
    if (line.trim().startsWith('## ')) {
      return <h2 key={i} className="text-base font-black italic text-emerald-500 mt-6 mb-3 uppercase tracking-widest">{formatInline(line.replace('## ', ''))}</h2>;
    }
    if (line.trim().startsWith('# ')) {
      return <h1 key={i} className="text-lg font-black italic text-emerald-600 mt-6 mb-3 uppercase tracking-widest">{formatInline(line.replace('# ', ''))}</h1>;
    }
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      return (
        <div key={i} className="flex gap-3 text-xs text-zinc-300 items-start mb-2 bg-black/40 p-4 rounded-xl border border-white/5 transition-all hover:bg-white/[0.02]">
          <div className="mt-0.5 rounded-full p-1 border border-emerald-500/20 bg-emerald-500/10 shrink-0">
            <Zap size={8} className="text-emerald-400" />
          </div>
          <span className="leading-relaxed">{formatInline(line.replace(/^[-*]\s*/, ''))}</span>
        </div>
      );
    }
    if (!line.trim()) return <div key={i} className="h-2" />;
    return <p key={i} className="text-xs text-zinc-300 mb-3 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">{formatInline(line)}</p>;
  });
};

export default function CompetitorIntel({ onIdeaGenerated }: { onIdeaGenerated?: (trend: any) => void }) {
  const { activeBrand } = useActiveBrand();
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generatingIdea, setGeneratingIdea] = useState(false);
  
  const [reelsLoading, setReelsLoading] = useState(false);
  const [competitorReels, setCompetitorReels] = useState<any[]>([]);
  // Guard: only fire Tavily+scraper once per brand, even if intel reference changes
  const reelsFetchedForBrand = useRef<string | null>(null);

  useEffect(() => {
    if (!activeBrand?.id) return;
    
    const sessionKey = `competitor_intel_${activeBrand.id}`;
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      try {
        setIntel(JSON.parse(cached));
        return; // Skip API call — use session cache
      } catch { /* corrupted cache, fall through */ }
    }

    setIntel(null);
    setLoading(true);

    const fetchIntel = async () => {
      try {
        const res = await fetch('/api/ai/competitor-intel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandData: activeBrand }),
        });
        const data = await res.json();
        const content = data.content || null;
        setIntel(content);
        if (content) {
          sessionStorage.setItem(sessionKey, JSON.stringify(content));
        }
      } catch (e) {
        setIntel('Failed to fetch competitive intelligence.');
      } finally {
        setLoading(false);
      }
    };

    fetchIntel();
  }, [activeBrand]);

  useEffect(() => {
    if (!intel || !activeBrand?.competitors?.length) return;
    // Only run once per brand — prevents repeated 429s
    if (reelsFetchedForBrand.current === activeBrand.id) return;
    reelsFetchedForBrand.current = activeBrand.id;

    const reelsSessionKey = `competitor_reels_${activeBrand.id}`;
    const cachedReels = sessionStorage.getItem(reelsSessionKey);
    if (cachedReels) {
      try {
        setCompetitorReels(JSON.parse(cachedReels));
        return;
      } catch { /* fall through */ }
    }
    
    const fetchReels = async () => {
      setReelsLoading(true);
      try {
        // Step 1: Use Tavily to resolve real IG handles from competitor names
        const resolveRes = await fetch('/api/social/instagram/resolve-handles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitors: activeBrand.competitors }),
        });
        const resolveData = await resolveRes.json();
        const handles: string[] = resolveData.handles || [];

        if (handles.length === 0) {
          setReelsLoading(false);
          return;
        }

        // Step 2: Scrape reels for each resolved handle (cached server-side per username)
        const allReels: any[] = [];
        for (const handle of handles.slice(0, 2)) {
          const res = await fetch(`/api/social/instagram/scrape?username=${handle}&count=12`);
          if (res.ok) {
            const data = await res.json();
            if (data.reels) {
              const taggedReels = data.reels.slice(0, 4).map((r: any) => ({ ...r, handle })); 
              allReels.push(...taggedReels);
            }
          }
        }

        const sorted = allReels.sort((a, b) => b.likes - a.likes);
        setCompetitorReels(sorted);
        if (sorted.length > 0) {
          sessionStorage.setItem(reelsSessionKey, JSON.stringify(sorted));
        }
      } catch (e) {
        console.error('Failed to fetch competitor reels', e);
      } finally {
        setReelsLoading(false);
      }
    };

    fetchReels();
  }, [intel, activeBrand]);

  const attemptToGenerateIdea = async () => {
    if (!intel || !activeBrand) return;
    setGeneratingIdea(true);
    try {
      const res = await fetch('/api/ai/competitor-to-trend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intel, brandData: activeBrand })
      });
      const data = await res.json();
      if (data.trend && onIdeaGenerated) {
        onIdeaGenerated(data.trend);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll up to see the new trend
      } else {
        alert("Failed to synthesize idea.");
      }
    } catch (err) {
      console.error(err);
      alert("Error generating strategic idea.");
    } finally {
      setGeneratingIdea(false);
    }
  };

  if (!activeBrand) {
    return (
      <div className="w-full min-h-[150px] backdrop-blur-3xl bg-black/10 rounded-[2rem] p-6 border border-white/10 flex flex-col items-center justify-center text-center transition-all duration-500 hover:border-white/20">
        <Target size={32} className="text-zinc-600 mb-4" />
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500">No Brand Selected</p>
      </div>
    );
  }

  return (
    <div className="w-full backdrop-blur-3xl bg-black/10 rounded-[2rem] p-6 border border-white/10 flex flex-col relative overflow-hidden group transition-all duration-500 hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]">
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
      
      <div className="flex justify-between items-start md:items-center gap-4 mb-6 relative z-10 flex-col md:flex-row">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Target size={16} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase italic tracking-widest text-white">Niche & Competitor Intel</h3>
            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Live Strategy Analysis</p>
          </div>
        </div>

        {intel && (
          <button 
            disabled={generatingIdea}
            onClick={attemptToGenerateIdea} 
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-full transition-all text-[10px] font-mono uppercase tracking-widest text-emerald-400 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingIdea ? (
              <><Loader2 size={14} className="animate-spin" /> Synthesizing Format...</>
            ) : (
              <><Sparkles size={14} className="group-hover:scale-110 transition-transform" /> Generate Content Idea</>
            )}
          </button>
        )}
      </div>

      <div className="w-full relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-10">
            <Loader2 className="animate-spin text-emerald-500" size={24} />
            <span className="text-[9px] font-mono uppercase text-emerald-500/50 tracking-[0.2em] animate-pulse">Running Threat Analysis...</span>
          </div>
        ) : intel && typeof intel === 'object' && !intel.error ? (
          <div className="flex flex-col gap-6">
            <div className="text-zinc-300 italic text-sm leading-relaxed pb-4 border-b border-white/5">
              {intel.summary}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CONTENT TYPES */}
              <div className="bg-black/40 border border-white/5 rounded-[1.5rem] p-5 shadow-inner transition-all hover:bg-white/[0.02]">
                <h4 className="text-[10px] font-mono text-emerald-500 tracking-widest uppercase mb-4">Tactics & Content</h4>
                <ul className="space-y-3">
                  {intel.content_types?.map((item: string, i: number) => (
                    <li key={i} className="flex gap-3 text-xs text-zinc-300 items-start">
                      <div className="mt-0.5 rounded-full p-1 border border-white/10 bg-white/5 shrink-0">
                        <Zap size={8} className="text-zinc-400" />
                      </div>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* WHAT WORKS */}
              <div className="bg-black/40 border border-white/5 rounded-[1.5rem] p-5 shadow-inner transition-all hover:bg-white/[0.02]">
                <h4 className="text-[10px] font-mono text-emerald-500 tracking-widest uppercase mb-4">What's Working</h4>
                <ul className="space-y-3">
                  {intel.what_works?.map((item: string, i: number) => (
                    <li key={i} className="flex gap-3 text-xs text-zinc-300 items-start">
                      <div className="mt-0.5 rounded-full p-1 border border-white/10 bg-white/5 shrink-0">
                        <Zap size={8} className="text-zinc-400" />
                      </div>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* GAPS */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[1.5rem] p-5 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)] transition-all hover:border-emerald-500/40">
                <h4 className="text-[10px] font-mono text-emerald-400 tracking-widest uppercase mb-4">Content Gaps</h4>
                <ul className="space-y-3">
                  {intel.gaps?.map((item: string, i: number) => (
                    <li key={i} className="flex gap-3 text-xs text-emerald-100/80 items-start">
                      <div className="mt-0.5 rounded-full p-1 border border-emerald-500/20 bg-emerald-500/10 shrink-0">
                        <Zap size={8} className="text-emerald-400" />
                      </div>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Competitor Reels Section */}
            {intel?.instagram_handles && intel.instagram_handles.length > 0 && (
              <div className="border-t border-white/5 pt-6 relative z-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 mb-4">
                  <Instagram size={14} className="text-emerald-500" />
                  <h4 className="text-xs font-black uppercase italic tracking-widest text-emerald-300 shadow-emerald-500 drop-shadow-md">Verified Competitor Reels</h4>
                </div>

                {reelsLoading ? (
                  <div className="flex gap-4">
                    <div className="h-48 w-32 bg-white/5 rounded-xl animate-pulse border border-white/10" />
                    <div className="h-48 w-32 bg-white/5 rounded-xl animate-pulse border border-white/10" />
                    <div className="h-48 w-32 bg-white/10 rounded-xl animate-pulse border border-white/10" />
                  </div>
                ) : competitorReels.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 hidden-scrollbar">
                    {competitorReels.map((reel) => (
                      <div key={reel.id} className="min-w-[130px] max-w-[130px] shrink-0 bg-black/40 rounded-xl overflow-hidden border border-white/10 relative group transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:-translate-y-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={reel.thumbnail_url} alt="Reel thumbnail" className="w-full h-[200px] object-cover opacity-60 group-hover:opacity-100 transition-all duration-500" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8 flex flex-col transition-all">
                            <span className="text-[9px] font-mono text-emerald-400 mb-1 tracking-wider">@{reel.handle}</span>
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-white font-bold tracking-tight">▲ {reel.likes >= 1000 ? (reel.likes/1000).toFixed(1) + 'k' : reel.likes}</span>
                              <span className="text-[8px] font-mono text-zinc-400">{reel.posted_at?.split('T')[0]}</span>
                            </div>
                          </div>
                          <a href={reel.post_url} target="_blank" className="absolute inset-0 z-10" rel="noreferrer">
                            <span className="sr-only">View Reel</span>
                          </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 italic p-4 bg-black/20 rounded-xl border border-white/5 inline-block">No recent reels found for these competitors.</div>
                )}
              </div>
            )}
          </div>
        ) : typeof intel === 'string' ? (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-500/70 mb-2">Cached Analysis</div>
            {renderMarkdown(intel)}
          </div>
        ) : (
          <div className="text-xs text-zinc-500 italic">No intelligence generated.</div>
        )}
      </div>
    </div>
  );
}
