"use client";
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, Loader2, Send, Sparkles, Database, ExternalLink, BookmarkPlus, CheckCircle, X, Trash2, Globe, Copy, FileText, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from "@/lib/supabase";
import FloatingNav from '@/components/FloatingNav';

// --- BACKGROUND COMPONENT ---
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

export default function SignalRadar() {
  const [trends, setTrends] = useState<any[]>([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [vaultTrends, setVaultTrends] = useState<any[]>([]);
  const [modelThinking, setModelThinking] = useState<string>('');

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const [brands, setBrands] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [session, setSession] = useState<any>(null);

  // --- UPDATED AUTH & VAULT SYNC ---

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadVault = useCallback(async (currentSession: any) => {
    if (!currentSession) return;

    try {
      const res = await fetch(`/api/ai/trends?userId=${currentSession.user.id}`);
      if (!res.ok) return;

      const data = await res.json();
      const permanentSaves = data.data || [];

      setVaultTrends(permanentSaves);
      setSavedIds(new Set(permanentSaves.map((p: any) => p.topic)));
    } catch (err) {
      console.error("Vault sync failed:", err);
    }
  }, []);

  const loadBrands = useCallback(async (currentSession: any) => {
    if (!currentSession) return;
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('user_id', currentSession.user.id);
    if (!error) setBrands(data || []);
  }, []);

  useEffect(() => {
    if (session) {
      loadVault(session);
      loadBrands(session);
    }
  }, [session, loadVault, loadBrands]);

  const toggleSave = async (e: React.MouseEvent, trend: any) => {
    e.stopPropagation();
    if (!session) {
      alert("Please log in to save trends.");
      return;
    }

    const name = trend.name;
    if (savedIds.has(name)) return;

    // Optimistic UI
    setSavedIds(prev => new Set(prev).add(name));
    setVaultTrends(prev => [{ ...trend, topic: trend.name }, ...prev]);

    try {
      const res = await fetch('/api/ai/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trend, userId: session.user.id })
      });

      // Robust JSON handling to prevent "Unexpected end of JSON input"
      const text = await res.text();
      if (!text) throw new Error("Empty response from server");
      const data = JSON.parse(text);

      if (!res.ok) throw new Error(data.error || "Save failed");
    } catch (err: any) {
      console.error("Save Error:", err.message);
      // Rollback UI state on failure
      setSavedIds(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
      setVaultTrends(prev => prev.filter(t => (t.topic || t.name) !== name));
      alert(`Archive Failed: ${err.message}`);
    }
  };

  const fetchSignals = useCallback(async (searchTerm = '', reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const userId = session?.user?.id || '';

      const query = searchTerm.trim() || "latest global tech and cultural breakthroughs";
      // Send userId and brandId to backend
      const res = await fetch(`/api/ai/trends?q=${encodeURIComponent(query)}&userId=${userId}&brandId=${selectedBrandId}`);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server Error ${res.status}`);
      }
      const data = await res.json();
      if (data.thinking) setModelThinking(data.thinking);

      if (reset) setTrends(data.posts || []);
      else setTrends(prev => [...prev, ...(data.posts || [])]);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId, loading]); // Added dependencies



  const removeTrend = async (e: React.MouseEvent, trendName: string) => {
    e.stopPropagation();
    // Local state removal
    setSavedIds(prev => {
      const next = new Set(prev);
      next.delete(trendName);
      return next;
    });
    setVaultTrends(prev => prev.filter(t => (t.topic || t.name) !== trendName));
    // Optional: Add fetch('/api/ai/trends', { method: 'DELETE' ... }) here later
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !selectedTopic) return;
    const userMsg = { role: 'user', content: chatInput };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedHistory, trendData: selectedTopic })
      });
      const data = await res.json();
      setChatHistory(p => [...p, { role: 'assistant', content: data.content }]);
    } catch (err) {
      setChatHistory(p => [...p, { role: 'assistant', content: "Unable to reach analysis service." }]);
    } finally { setIsTyping(false); }
  };

  const generateOrchestratorPrompt = (trend: any) => {
    const prompt = `Create a viral ${trend.platform || 'Instagram'} ${trend.platform === 'YouTube' ? 'Short' : 'Reel'} script based on this trending format:

TREND: ${trend.name}
VIRALITY SCORE: ${trend.score}%
VELOCITY: ${trend.status}

FORMAT BREAKDOWN:
${trend.ugc_strategy?.format_explanation || trend.desc}

DESCRIPTION:
${trend.desc}

REFERENCE EXAMPLES:
${trend.example_urls?.slice(0, 3).map((url: string, i: number) => `${i + 1}. ${url}`).join('\n') || 'No examples available'}

Please create a script that follows this exact format and structure, optimized for maximum engagement and virality.`;

    navigator.clipboard.writeText(prompt);
    setCopiedPromptId(trend.name);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };


  return (
    <main className="min-h-screen bg-[#020202] text-white p-6 md:p-12 relative overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-black">
      <Stars />
      <div className="max-w-7xl mx-auto relative z-10">

        <FloatingNav activePage="radar" />

        <header className="mb-20">
          <div className="flex flex-col gap-12">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
              <div className="space-y-4">
                <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none mb-4">
                  Trend <span className="text-emerald-500">/</span> Radar
                </h1>
                <div className="flex items-center gap-4">
                  <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">Intent-Based Discovery</p>
                  <button
                    onClick={() => setIsVaultOpen(true)}
                    className="flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
                  >
                    <Database size={14} /> Vault ({savedIds.size})
                  </button>
                </div>
              </div>

              {/* Time Estimate Note (Top Right of Row) */}
              <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-5 py-2.5 rounded-full mb-2">
                <Clock size={14} className="text-emerald-500" />
                <p className="text-[9px] font-bold font-mono uppercase tracking-[0.2em] text-zinc-400">
                  Trend finding can take <span className="text-emerald-500">10-12 mins</span> approximately
                </p>
              </div>
            </div>

            {/* Strategic Row: Search Bar + Selector */}
            <div className="flex flex-col xl:flex-row items-center gap-4">
              {/* Left: Search Bar */}
              <div className="relative flex-1 w-full group/search">
                <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/20 to-transparent rounded-full blur opacity-25 group-focus-within/search:opacity-100 transition duration-1000" />
                <div className="relative liquid-glass h-20 p-2.5 rounded-full flex items-center gap-3 w-full shadow-2xl border border-white/10 focus-within:border-emerald-500/40 transition-all backdrop-blur-3xl">
                  <input
                    className="flex-1 bg-transparent px-6 h-full outline-none text-lg md:text-xl font-medium italic placeholder:text-zinc-500 text-white min-w-0"
                    placeholder="What are we building today?"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') fetchSignals(searchInput, true);
                    }}
                  />
                  <button
                    onClick={() => fetchSignals(searchInput, true)}
                    disabled={loading || !searchInput.trim()}
                    className="bg-emerald-500 text-black h-full aspect-square shrink-0 rounded-full font-black flex items-center justify-center disabled:opacity-20 transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  >
                    {loading ? <Loader2 className="animate-spin text-black" size={24} /> : <Search size={24} />}
                  </button>
                </div>
              </div>

              {/* Right: Separate Brand Selector Area */}
              <div className="liquid-glass h-20 p-2.5 px-5 rounded-full border border-white/10 bg-black/20 backdrop-blur-3xl overflow-hidden shrink-0 flex items-center">
                <div className="flex gap-2.5 items-center h-full overflow-x-auto scrollbar-hide max-w-[300px] md:max-w-[600px]">
                  <button
                    onClick={() => setSelectedBrandId('')}
                    className={`shrink-0 h-full flex items-center gap-3 px-6 rounded-full text-[10px] font-black uppercase transition-all tracking-widest border transition-all ${!selectedBrandId ? 'bg-white text-black border-white' : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/20 hover:text-white'}`}
                  >
                    <div className="h-6 w-6 rounded-full flex items-center justify-center bg-zinc-800 border border-white/10 shrink-0">
                      <Globe size={12} className={!selectedBrandId ? 'text-black' : 'text-emerald-500'} />
                    </div>
                    <span className="italic tracking-tighter">General</span>
                  </button>
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => setSelectedBrandId(brand.id)}
                      className={`shrink-0 h-full flex items-center gap-3 px-6 rounded-full border transition-all ${selectedBrandId === brand.id ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-white/5 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'}`}
                    >
                      {brand.logo_url && (
                        <div className="h-6 w-6 rounded-full overflow-hidden bg-zinc-800 border border-white/10 shrink-0">
                          <img src={brand.logo_url} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                      <span className="text-[10px] font-black uppercase italic tracking-tighter whitespace-nowrap">{brand.company_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </header>




        <div className="space-y-12">
          {trends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="liquid-glass border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl bg-black/40"
            >
              {/* MATRIX HEADER */}
              <div className="bg-white/[0.03] border-b border-white/5 p-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">Systematic Intelligence Matrix</h2>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">YouTube</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Instagram</span>
                  </div>
                </div>
              </div>

              {/* STRATEGIC OVERVIEW SECTION */}
              {modelThinking && (
                <div className="p-8 border-b border-white/5 bg-emerald-500/[0.02]">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles size={16} className="text-emerald-500" />
                    <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-emerald-500">Master Strategic Inquest</span>
                  </div>
                  <p className="text-sm text-zinc-300 italic leading-relaxed max-w-5xl">
                    {modelThinking}
                  </p>
                </div>
              )}

              {/* TREND LIST SECTION */}
              <div className="divide-y divide-white/5">
                {trends.map((trend, idx) => (
                  <motion.div
                    key={trend.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group"
                  >
                    <div className="p-10 flex flex-col xl:flex-row gap-12 hover:bg-white/[0.01] transition-all">
                      {/* Left Ident: Name & Score */}
                      <div className="xl:w-1/4 space-y-6">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase border ${trend.category?.toLowerCase() === 'youtube'
                            ? 'bg-red-500/10 border-red-500/20 text-red-500'
                            : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                            }`}>
                            {trend.category || "Social"}
                          </span>
                          <span className="text-white/20 font-mono text-xs">0{idx + 1}</span>
                        </div>
                        <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white group-hover:text-emerald-400 transition-colors">
                          {trend.name}
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Velocity</p>
                            <p className="text-lg font-black italic text-emerald-500">{trend.status}</p>
                          </div>
                          <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                            <p className="text-[8px] text-zinc-500 uppercase font-mono tracking-widest mb-1">Virality</p>
                            <p className="text-lg font-black italic text-white">{trend.score}%</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => toggleSave(e, trend)}
                          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all transition-all"
                        >
                          {savedIds.has(trend.name) ? <CheckCircle size={16} className="text-emerald-500" /> : <BookmarkPlus size={16} className="text-zinc-500" />}
                          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">{savedIds.has(trend.name) ? 'Archived in Vault' : 'Archive Signal'}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); generateOrchestratorPrompt(trend); }}
                          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all group"
                        >
                          {copiedPromptId === trend.name ? (
                            <>
                              <CheckCircle size={16} className="text-emerald-500" />
                              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <FileText size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">Generate Script Prompt</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Middle: Description & Strategy */}
                      <div className="xl:flex-1 space-y-8">
                        <div>
                          <p className="text-[9px] font-mono uppercase text-zinc-600 tracking-[0.4em] mb-4">Master Breakdown</p>
                          <p className="text-zinc-300 text-sm leading-relaxed italic border-l-2 border-emerald-500/20 pl-6">
                            {trend.desc}
                          </p>
                        </div>

                        <div className="bg-white/[0.03] border border-emerald-500/10 p-6 rounded-3xl">
                          <p className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest mb-3">Format Breakdown</p>
                          <p className="text-xs text-zinc-300 leading-relaxed">
                            {trend.ugc_strategy?.format_explanation || "Analyzing format structure..."}
                          </p>
                        </div>
                      </div>

                      {/* Right: Sources & Interaction */}
                      <div className="xl:w-1/4 flex flex-col gap-6">
                        <div>
                          <p className="text-[9px] font-mono uppercase text-zinc-600 tracking-[0.4em] mb-4">Signal Verification</p>
                          <div className="space-y-2">
                            {trend.example_urls?.slice(0, 2).map((url: string, i: number) => (
                              <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-emerald-500 p-4 rounded-2xl group/link transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">Example {i + 1}</span>
                                </div>
                                <ExternalLink size={14} className="text-zinc-600 group-hover/link:text-emerald-500" />
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {loading && (
            <div className="py-40 flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 blur-2xl bg-emerald-500/40 animate-pulse rounded-full" />
                <Loader2 className="text-emerald-500 animate-spin relative" size={48} />
              </div>
              <div className="flex flex-col items-center gap-3">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.6em] animate-pulse">Synchronizing Live Intelligence...</p>
                <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.4em]">Optimizing trend velocity for your brand...</p>
              </div>
            </div>
          )}
        </div>
      </div >

      <AnimatePresence>
        {isVaultOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsVaultOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60"
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0a0a0a] border-l border-white/10 z-70 p-8 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black italic uppercase text-emerald-500">Intelligence Vault</h2>
                <button onClick={() => setIsVaultOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} className="text-zinc-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {vaultTrends.length === 0 ? (
                  <div className="h-40 flex items-center justify-center border border-dashed border-white/10 rounded-3xl">
                    <p className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest">No signals archived</p>
                  </div>
                ) : (
                  vaultTrends.map(trend => (
                    <div
                      key={trend.topic || trend.name}
                      onClick={() => { setSelectedTopic(trend); setIsVaultOpen(false); setChatHistory([]); }}
                      className="p-6 liquid-glass rounded-[2rem] hover:border-emerald-500/40 transition-all cursor-pointer group relative overflow-hidden"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-tighter">{trend.status}</span>
                        <button
                          onClick={(e) => removeTrend(e, trend.topic || trend.name)}
                          className="text-zinc-700 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h4 className="text-lg font-black italic uppercase text-white mb-2 leading-tight">{trend.topic || trend.name}</h4>
                      <p className="text-[10px] text-zinc-500 line-clamp-2 italic leading-relaxed">{trend.desc || trend.raw_data?.desc}</p>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTopic && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-6xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] overflow-hidden flex flex-col md:flex-row h-[85vh] shadow-2xl"
            >
              <div className="md:w-1/3 p-10 border-r border-white/5 overflow-y-auto">
                <button onClick={() => setSelectedTopic(null)} className="text-zinc-500 flex items-center gap-2 text-[9px] font-mono uppercase mb-12 hover:text-white transition-colors">
                  <X size={14} /> Close Panel
                </button>
                <h2 className="text-4xl font-black italic uppercase text-white mb-8 tracking-tighter">{selectedTopic.topic || selectedTopic.name}</h2>
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2rem] text-sm text-zinc-300 italic leading-relaxed mb-8">
                  {selectedTopic.desc || selectedTopic.raw_data?.desc}
                </div>

                {/* SIGNAL EVIDENCE BAR */}
                {(selectedTopic.source_evidence || selectedTopic.raw_data?.source_evidence) && (
                  <div className="mb-8 p-6 liquid-glass border border-emerald-500/20 rounded-[2rem]">
                    <p className="text-[8px] font-mono uppercase text-emerald-500 mb-3 tracking-[0.3em]">Signal Evidence</p>
                    <p className="text-xs text-zinc-400 italic">
                      {selectedTopic.source_evidence || selectedTopic.raw_data?.source_evidence}
                    </p>
                  </div>
                )}

                {/* REAL VIDEO EXAMPLES */}
                {(selectedTopic.example_urls?.length > 0 || selectedTopic.raw_data?.example_urls?.length > 0) && (
                  <div className="mb-8">
                    <p className="text-[8px] font-mono uppercase text-zinc-500 mb-4 tracking-[0.3em] ml-2">Real Video Examples</p>
                    <div className="grid grid-cols-1 gap-2">
                      {(selectedTopic.example_urls || selectedTopic.raw_data?.example_urls)?.map((url: string, i: number) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-emerald-500/30 p-4 rounded-2xl transition-all group"
                        >
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest group-hover:text-emerald-400">Example {i + 1}</span>
                          <ExternalLink size={14} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* UGC STRATEGY SECTION */}
                {(selectedTopic.ugc_strategy || selectedTopic.raw_data?.ugc_strategy) && (
                  <div className="space-y-6 mb-8">
                    {/* strategy content... same as before but checking raw_data too */}
                    {(() => {
                      const strategy = selectedTopic.ugc_strategy || selectedTopic.raw_data?.ugc_strategy;
                      return (
                        <>
                          <div className="bg-white/5 border border-emerald-500/10 p-6 rounded-[2rem] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(strategy.format_explanation);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 2000);
                                }}
                                className="bg-emerald-500 text-black px-3 py-1 rounded-full text-[8px] font-black uppercase italic tracking-tighter hover:bg-emerald-400 transition-all shadow-lg"
                              >
                                {copied ? 'Copied!' : 'Copy Format'}
                              </button>
                            </div>
                            <p className="text-[8px] font-mono uppercase text-emerald-500 mb-3 tracking-widest">Format Breakdown</p>
                            <p className="text-xs text-zinc-300 leading-relaxed italic pr-10">{strategy.format_explanation}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {strategy.key_slang?.map((s: string) => (
                              <span key={s} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono px-3 py-1 rounded-full uppercase tracking-widest">
                                #{s}
                              </span>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* SOURCES */}
                <div className="space-y-3">
                  <p className="text-[8px] font-mono uppercase text-zinc-500 tracking-[0.3em] ml-2">Intelligence Sources</p>
                  <div className="flex flex-col gap-2">
                    <a href={selectedTopic.link || `https://www.google.com/search?q=${encodeURIComponent(selectedTopic.topic || selectedTopic.name)}`} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-emerald-500/30 p-4 rounded-2xl transition-all group">
                      <div className="flex items-center gap-3">
                        <Globe size={14} className="text-emerald-500" />
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Primary Intel Page</span>
                      </div>
                      <ExternalLink size={14} className="text-zinc-600 hover:text-emerald-500 transition-colors" />
                    </a>

                    {(selectedTopic.source_links || selectedTopic.raw_data?.source_links)?.map((link: string, i: number) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between bg-white/5 border border-white/10 hover:border-emerald-500/30 p-4 rounded-2xl transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Database size={14} className="text-zinc-500" />
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Reference {i + 1}</span>
                        </div>
                        <ExternalLink size={14} className="text-zinc-600 hover:text-emerald-500 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:w-2/3 flex flex-col bg-zinc-950/40">
                <div className="p-6 border-b border-white/5 flex items-center gap-2">
                  <Sparkles className="text-emerald-500" size={16} /><span className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-500">Agent Analysis</span>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-6">
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-6 rounded-[2.5rem] text-[13px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-emerald-500 text-black font-bold' : 'bg-white/5 border border-white/10 text-zinc-300'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isTyping && <div className="flex gap-2 p-4 text-emerald-500"><Loader2 className="animate-spin" size={16} /> <span className="text-[10px] font-mono uppercase tracking-widest">Processing...</span></div>}
                </div>
                <div className="p-8 border-t border-white/5 flex gap-4 bg-black/40">
                  <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChat()} placeholder={`Inquire about ${selectedTopic.name}...`} className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-emerald-500/50 text-white placeholder:text-zinc-700" />
                  <button onClick={handleChat} className="bg-emerald-500 p-4 rounded-2xl text-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"><Send size={20} /></button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main >
  );
}