"use client";

import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Layout, RefreshCw, ArrowLeft, ScrollText, Sparkles, Youtube,
  Smartphone, Instagram, Loader2, Quote, Copy, Check, Globe,
  TrendingUp, ChevronDown, Search, X, Clock, FileDown,
  Wand2, Settings2
} from 'lucide-react';

import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useActiveBrand } from '@/hooks/useActiveBrand';

// PDF Imports
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// --- MAIN PAGE ---
export default function OrchestratorPage() {
  const [goal, setGoal] = useState('');
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'instagram'>('youtube');
  const [scriptType, setScriptType] = useState<'UGC' | 'Advertisement' | 'Content'>('Content');
  const [isHeroMode, setIsHeroMode] = useState(false);

  const [pdfGeneratingId, setPdfGeneratingId] = useState<string | null>(null);

  const { brands, activeBrandId, selectBrand } = useActiveBrand();

  const [trends, setTrends] = useState<any[]>([]);
  const [selectedTrendId, setSelectedTrendId] = useState<string>("");

  const [isTrendDropdownOpen, setIsTrendDropdownOpen] = useState(false);
  const [trendSearch, setTrendSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedBrand = brands.find(b => b.id === activeBrandId);
  const selectedTrend = trends.find(t => t.id === selectedTrendId);
  const filteredTrends = trends.filter(t => t.name.toLowerCase().includes(trendSearch.toLowerCase()));

  useEffect(() => {
    const fetchData = async () => {
      const { data: t } = await supabase.from('signal_vault').select('id, topic');
      if (t) setTrends(t.map(x => ({ id: x.id, name: x.topic })));
    };
    fetchData();
  }, []);

  const runOrchestration = async () => {
    if (!goal.trim() || !activeBrandId) return;
    setLoading(true);
    setCampaign(null);

    try {
      if (isHeroMode) {
        const platforms = ['youtube', 'instagram', 'tiktok'];
        const results: any[] = [];

        const { data: { session } } = await supabase.auth.getSession();
        
        for (const p of platforms) {
          const res = await fetch("/api/ai/orchestrator", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({
              goal,
              brandId: activeBrandId,
              trendId: selectedTrendId || null,
              platform: p,
              scriptType
            }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          results.push(data);
          // Update campaign state progressively
          setCampaign([...results]);
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/ai/orchestrator", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
          },
          body: JSON.stringify({
            goal,
            brandId: activeBrandId,
            trendId: selectedTrendId || null,
            platform: platform,
            scriptType
          }),
        });
        const data = await res.json();
        if (data.error) {
          setCampaign({ error: data.error });
        } else {
          setCampaign(data);
        }
      }
    } catch (err: any) {
      console.error(err);
      setCampaign({ error: err.message || "Orchestration failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (data: any, cardId: string) => {
    setPdfGeneratingId(cardId);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const brandName = selectedBrand?.company_name || "Omni Orchestrator";
      const timestamp = new Date().toLocaleDateString();
      const currentPlatform = (data.platform || platform).toUpperCase();

      doc.setFillColor(18, 18, 18);
      doc.rect(0, 0, 210, 297, 'F');
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 4, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("AI GENERATED STRATEGY BRIEF", 20, 20);

      doc.setFontSize(28);
      doc.setTextColor(240, 240, 240);
      doc.text(brandName.toUpperCase(), 20, 35);

      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(`${currentPlatform} STRATEGY`, 20, 45);
      doc.setTextColor(100, 100, 100);
      doc.text(`DATE: ${timestamp}`, 150, 45);

      // Add Title
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text(data.title || "Untitled Campaign", 20, 60, { maxWidth: 170 });

      // Add Captions
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text("SOCIAL CAPTIONS:", 20, 80);

      let captionY = 90;
      (data.captions || []).forEach((cap: string, i: number) => {
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        const splitCap = doc.splitTextToSize(cap, 170);
        doc.text(splitCap, 20, captionY);
        captionY += (splitCap.length * 5) + 5;
      });

      // Add Script Table
      const scriptRows = (data.script || []).map((s: any) => [
        s.timestamp || "0:00",
        s.speaker || "Speaker",
        s.action || "Action",
        s.dialogue || "..."
      ]);

      if (scriptRows.length > 0) {
        autoTable(doc, {
          startY: captionY + 10,
          head: [['Time', 'Speaker', 'Action', 'Dialogue']],
          body: scriptRows,
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
          styles: { fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [30, 30, 30] },
        });
      }

      doc.save(`${brandName.replace(/\s+/g, '_')}_${currentPlatform}_Strategy.pdf`);
    } catch (err) {
      console.error("PDF Export failed", err);
    } finally {
      setPdfGeneratingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderCampaignCard = (data: any, index: number = 0) => {
    const currentPlatform = data.platform || platform;
    const cardId = `campaign-${index}`;
    const isThisPdfLoading = pdfGeneratingId === cardId;

    return (
      <motion.div
        key={cardId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`flex flex-col gap-6 pb-10 w-full ${isHeroMode ? 'xl:col-span-1' : 'lg:grid lg:grid-cols-4 lg:gap-8'}`}
      >
        <div className="space-y-6 lg:col-span-1">
          <div className="liquid-glass rounded-[2.5rem] p-10 backdrop-blur-md relative overflow-hidden h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Layout size={16} />
                  <span className="text-[9px] font-mono uppercase tracking-[0.3em]">{currentPlatform}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <Clock size={10} className="text-emerald-500" />
                  <span className="text-[9px] font-mono text-zinc-400 uppercase">{data.postingTime || "Viral Logic"}</span>
                </div>
              </div>

              {/* Authenticity Score Visualization */}
              <div className="mb-8 flex flex-col items-center">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="58" className="stroke-zinc-800 fill-none" strokeWidth="6" />
                    <motion.circle
                      cx="64" cy="64" r="58"
                      className="stroke-emerald-500 fill-none"
                      strokeWidth="6"
                      strokeDasharray="364.4"
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 - (364.4 * (data.authenticityScore || 85) / 100) }}
                      transition={{ duration: 2, ease: "easeOut" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black italic text-white leading-none">{(data.authenticityScore || 85)}%</span>
                    <span className="text-[8px] font-mono uppercase text-zinc-500 tracking-tighter mt-1">Authenticity</span>
                  </div>
                </div>
                {(data.authenticityScore || 85) > 90 && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    <Sparkles size={10} className="text-emerald-400" />
                    <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest">Native Energy</span>
                  </motion.div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-mono text-emerald-500/50 uppercase tracking-widest">Master Title</span>
                  <h2 className="text-xl font-black italic uppercase text-white leading-tight mt-1 line-clamp-2">{data?.title}</h2>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Visual Logic</span>
                  <p className="text-[11px] italic text-zinc-400 mt-1 line-clamp-2">"{data?.thumbnail?.concept}"</p>
                </div>
              </div>
            </div>

            <button onClick={() => handleDownloadPDF(data, cardId)} disabled={isThisPdfLoading} className="mt-8 w-full py-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3 transition-all group disabled:opacity-50">
              {isThisPdfLoading ? <Loader2 size={16} className="text-emerald-500 animate-spin" /> : <FileDown size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />}
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-500">{isThisPdfLoading ? 'Generating...' : 'Export Brief'}</span>
            </button>
          </div>
        </div>
        <div className={`${isHeroMode ? 'xl:col-span-1' : 'lg:col-span-3'} flex flex-col gap-6`}>
          <div className="liquid-glass rounded-[2.5rem] p-10 md:p-16 backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <ScrollText size={18} className="text-emerald-500" />
                <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">Proprietary Captions</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-600 uppercase">Single Tap Copy</span>
            </div>
            <div className={`grid grid-cols-1 ${isHeroMode ? 'gap-4' : 'md:grid-cols-3 gap-6'}`}>
              {(data?.captions || []).map((cap: string, i: number) => (
                <div key={i} className="bg-emerald-500/[0.02] border border-white/5 p-5 rounded-[2rem] relative group/cap hover:border-emerald-500/20 transition-all flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[8px] font-mono text-emerald-500/40 uppercase tracking-widest">Variant {i + 1}</span>
                    <button
                      onClick={() => copyToClipboard(cap, `${cardId}-cap-${i}`)}
                      className="p-2 bg-zinc-900 border border-white/10 rounded-xl opacity-0 group-hover/cap:opacity-100 transition-all text-emerald-500 hover:scale-110"
                    >
                      {copiedIndex === `${cardId}-cap-${i}` ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-300 italic leading-relaxed line-clamp-4">{cap}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="liquid-glass rounded-[2.5rem] p-10 md:p-16 backdrop-blur-md h-full overflow-y-auto max-h-[600px] scrollbar-hide">
            <div className="flex items-center gap-4 mb-10">
              <ScrollText size={16} className="text-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">Produced Script</span>
            </div>
            <div className="space-y-8">
              {(data?.script || []).map((step: any, idx: number) => (
                <div key={idx} className="relative pl-10 border-l border-white/5 group">
                  <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                    <span className="text-[10px] font-mono text-emerald-500/60 uppercase">{step?.timestamp}</span>
                    <span className="text-[10px] font-black text-zinc-400 uppercase italic tracking-widest">{step?.speaker}</span>
                    {step?.action && (
                      <span className="text-[9px] font-mono text-zinc-500 uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        {step.action}
                      </span>
                    )}
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] group-hover:border-emerald-500/10 transition-colors">
                    <p className="text-base md:text-lg font-medium text-zinc-200 italic leading-relaxed">"{step?.dialogue || "..."}"</p>
                  </div>
                </div>
              ))}
              {(!data?.script || data.script.length === 0) && (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-[3rem]">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.4em]">Awaiting Resonance...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

    return (
      <>
        <PrismaticStars />
        <ShootingStars />
  
        <motion.div className="relative min-h-screen w-full flex flex-col items-center pt-28 md:pt-48 px-4 md:px-12 z-10 selection:bg-emerald-500 selection:text-black">
          <div className="max-w-[1400px] w-full">
          <header className="mb-10 md:mb-20">
            <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter mb-4 leading-[0.85]">
              Scribe
            </h1>

            <div className="grid grid-cols-1 gap-6 mb-12 relative z-50 mt-12">
              {scriptType === 'Content' && (
                <div className="flex flex-col gap-3" ref={dropdownRef}>
                  <label className="text-[9px] font-mono uppercase text-zinc-500 tracking-[0.4em] ml-6 flex items-center gap-2">
                    <TrendingUp size={10} className="text-purple-500" /> 01. Cultural Signal
                  </label>
                  <div className="relative h-[74px] px-2 liquid-glass rounded-full flex items-center">
                    <button
                      onClick={() => setIsTrendDropdownOpen(!isTrendDropdownOpen)}
                      className={`w-full h-[58px] flex items-center justify-between px-8 rounded-full border transition-all relative z-10 ${selectedTrendId ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-white/5 border-white/5 text-zinc-500'
                        }`}
                    >
                      <span className="text-[10px] font-bold uppercase italic tracking-widest truncate">
                        {selectedTrend ? selectedTrend.name : "Inject Viral Signal..."}
                      </span>
                      <ChevronDown size={14} className={`transition-transform ${isTrendDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {isTrendDropdownOpen && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-[110%] left-0 right-0 liquid-glass rounded-[2rem] z-100 overflow-hidden shadow-2xl">
                          <div className="p-4 border-b border-white/5">
                            <input className="w-full bg-zinc-900 border border-white/5 rounded-full py-2 px-4 text-[10px] outline-none" placeholder="SEARCH SIGNALS..." value={trendSearch} onChange={(e) => setTrendSearch(e.target.value)} />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            <button
                              onClick={() => { setSelectedTrendId(""); setIsTrendDropdownOpen(false); }}
                              className="w-full p-4 hover:bg-white/5 text-left text-[10px] uppercase font-bold text-zinc-500 border-b border-white/5 italic"
                            >
                              No Trend / Evergreen
                            </button>
                            {filteredTrends.map(t => (
                              <button key={t.id} onClick={() => { setSelectedTrendId(t.id); setIsTrendDropdownOpen(false); }} className="w-full p-4 hover:bg-white/5 text-left text-[10px] uppercase font-bold text-zinc-400">{t.name}</button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6 md:space-y-8 w-full relative z-10">
              <div className="flex flex-wrap gap-3 items-center justify-center">
                <div className="flex gap-2 p-1.5 liquid-glass rounded-full relative z-10">
                  {['youtube', 'tiktok', 'instagram'].map((p) => (
                    <button key={p} disabled={isHeroMode} onClick={() => setPlatform(p as any)} className={`px-4 md:px-6 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase transition-all ${!isHeroMode && platform === p ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>{p}</button>
                  ))}
                </div>

                <div className="flex gap-2 p-1.5 liquid-glass rounded-full relative z-10">
                  {['UGC', 'Advertisement', 'Content'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setScriptType(t as any)}
                      className={`px-4 md:px-6 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase transition-all ${scriptType === t ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => setIsHeroMode(!isHeroMode)}
                  className={`relative px-10 py-4 rounded-full text-[10px] font-black uppercase border transition-all flex items-center gap-3 overflow-hidden group ${isHeroMode ? 'bg-linear-to-r from-emerald-600 to-emerald-400 text-black border-transparent shadow-[0_0_30px_rgba(16,185,129,0.4)]' : 'text-emerald-500 border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                >
                  <Sparkles size={14} className={isHeroMode ? 'animate-pulse' : ''} />
                  Hero Mode: Multi-Campaign
                  {isHeroMode && (
                    <motion.div className="absolute inset-0 pointer-events-none">
                      {[...Array(8)].map((_, i) => (
                        <motion.div key={i} className="absolute bg-white rounded-full" initial={{ scale: 0, x: "50%", y: "50%" }} animate={{ scale: [0, 1.2, 0], x: [`${50}%`, `${50 + (Math.random() * 80 - 40)}%`], y: [`${50}%`, `${50 + (Math.random() * 80 - 40)}%`] }} transition={{ duration: 0.7, repeat: Infinity, repeatDelay: Math.random() * 0.5 }} style={{ width: 2, height: 2 }} />
                      ))}
                    </motion.div>
                  )}
                </button>
              </div>

              <div className="liquid-glass p-2 rounded-[2rem] md:rounded-full flex flex-col md:flex-row gap-2 w-full shadow-2xl relative">
                <input
                  className="flex-1 bg-transparent px-6 md:px-8 py-5 md:py-6 outline-none text-lg md:text-2xl font-medium italic placeholder:text-zinc-700 relative z-10"
                  placeholder="Describe your campaign objective..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                />
                <button onClick={runOrchestration} disabled={loading || !activeBrandId || !goal} className="bg-emerald-500 text-black px-8 md:px-12 py-4 md:py-5 rounded-[1.5rem] md:rounded-full font-black uppercase italic flex items-center justify-center gap-3 disabled:opacity-20 transition-all hover:scale-[1.02] text-sm">
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  {isHeroMode ? 'Deploy Multi-Strategy' : 'Deploy Strategy'}
                </button>
              </div>

              {isHeroMode && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex justify-center"
                >
                  <div className="flex items-center gap-3 bg-emerald-500/10 px-8 py-3 rounded-full border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[11px] font-bold font-mono uppercase tracking-[0.3em] text-emerald-400">
                      Hero Mode Active / Multi-Platform Strategy Loop
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </header>

          <AnimatePresence>
            {campaign && campaign.error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 liquid-glass p-8 rounded-[2rem] border-emerald-500/20 text-center">
                <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest mb-2">Signal Interrupted</p>
                <p className="text-zinc-400 text-sm italic">{campaign.error}</p>
                <button onClick={() => setCampaign(null)} className="mt-4 text-[9px] font-mono uppercase text-zinc-500 hover:text-white transition-colors">Clear Signal</button>
              </motion.div>
            )}
            {campaign && !campaign.error && (
              <div className={isHeroMode ? "grid grid-cols-1 xl:grid-cols-3 gap-8" : "w-full"}>
                {Array.isArray(campaign) ? campaign.map((c, i) => renderCampaignCard(c, i)) : renderCampaignCard(campaign)}
              </div>
            )}
          </AnimatePresence>

          {loading && (
            <div className="mt-20 flex flex-col items-center gap-4">
              <RefreshCw className="animate-spin text-emerald-500" size={40} />
              <div className="flex flex-col items-center gap-2">
                <span className="text-[12px] font-bold font-mono text-emerald-500 uppercase tracking-[0.5em] animate-pulse">Orchestrating...</span>
                {isHeroMode && (
                  <p className="text-[9px] font-bold font-mono text-zinc-400 uppercase tracking-[0.3em] bg-white/5 px-6 py-2 rounded-full border border-white/10 mt-2">
                    Generating scripts one by one... Please hold.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}