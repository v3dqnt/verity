"use client";
import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { Search, Loader2, Home, Send, Sparkles, Database, ExternalLink, BookmarkPlus, CheckCircle, X, Trash2, ArrowBigLeft, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { supabase } from "@/lib/supabase";

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

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string, content: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // --- UPDATED AUTH & VAULT SYNC ---

  const loadVault = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      // Pass userId so the backend knows which vault to fetch
      const res = await fetch(`/api/ai/trends?userId=${session.user.id}`);
      if (!res.ok) return;

      const data = await res.json();
      // 'posts' from the backend GET handler contains the latest trends + isSaved status
      // We look for the 'data' property if the backend specifically returned a full vault fetch
      const permanentSaves = data.data || [];

      setVaultTrends(permanentSaves);
      setSavedIds(new Set(permanentSaves.map((p: any) => p.topic)));
    } catch (err) {
      console.error("Vault sync failed:", err);
    }
  }, []);

  useEffect(() => {
    loadVault();
  }, [loadVault]);

  const toggleSave = async (e: React.MouseEvent, trend: any) => {
    e.stopPropagation();
    const { data: { session } } = await supabase.auth.getSession();

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
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || '';

      const query = searchTerm.trim() || "latest global tech and cultural breakthroughs";
      // Send userId to backend so it can mark "isSaved" accurately
      const res = await fetch(`/api/ai/trends?q=${encodeURIComponent(query)}&userId=${userId}`);

      if (!res.ok) throw new Error("Connection Failed");
      const data = await res.json();

      if (reset) setTrends(data.posts || []);
      else setTrends(prev => [...prev, ...(data.posts || [])]);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals(searchInput, true);
  }, []); // Run once on mount

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

  return (
    <main className="min-h-screen bg-[#020202] text-white p-6 md:p-12 relative overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-black">
      <Stars />
      <div className="max-w-7xl mx-auto relative z-10">

        <nav className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
          <Link href="/dashboard" className="flex items-center gap-3 text-zinc-500 hover:text-emerald-500 transition-all group">
            <ArrowLeft size={18} />
            <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Back To Hub</span>
          </Link>
          <button
            onClick={() => setIsVaultOpen(true)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
          >
            <Database size={14} /> Vault ({savedIds.size})
          </button>
        </nav>

        <header className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div>
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
              Trend <span className="text-emerald-500">/</span> Radar
            </h1>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-4">Intelligent Feed</p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
            <input
              type="text"
              placeholder="Search breakthroughs..."
              className="w-full liquid-glass rounded-2xl py-5 pl-12 pr-4 outline-none focus:border-emerald-500/40 text-sm transition-all text-white placeholder:text-zinc-700"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchSignals(searchInput, true);
              }}
            />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trends.map((trend) => (
            <motion.div
              key={trend.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5, scale: 1.02 }}
              onClick={() => { setSelectedTopic(trend); setChatHistory([]); }}
              className="liquid-glass relative overflow-hidden rounded-[3.5rem] cursor-pointer group flex flex-col h-full p-10
                transition-all duration-500 ease-out
                hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]"
            >
              {/* Inner glow layer */}
              <div className="absolute inset-0 rounded-[3.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <span className="bg-emerald-500/20 backdrop-blur-md text-emerald-400 text-[9px] font-mono px-4 py-1.5 rounded-full uppercase border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                    {trend.category || "General"}
                  </span>
                  <button onClick={(e) => toggleSave(e, trend)} className="relative z-20">
                    {savedIds.has(trend.name) ?
                      <CheckCircle className="text-emerald-500 drop-shadow-lg" size={22} /> :
                      <BookmarkPlus className="text-zinc-400 hover:text-emerald-400 transition-colors drop-shadow-md" size={22} />
                    }
                  </button>
                </div>
                <h3 className="text-2xl font-black italic uppercase text-white mb-6 leading-tight group-hover:text-emerald-400 transition-colors drop-shadow-lg">
                  {trend.name || "Unknown Signal"}
                </h3>
                <p className="text-zinc-300/80 text-xs italic mb-8 line-clamp-3 leading-relaxed drop-shadow-md">{trend.desc}</p>
                <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                  <div><p className="text-[8px] text-zinc-400 uppercase mb-1 font-mono tracking-widest">Momentum</p><p className="text-xl font-black italic text-emerald-400 drop-shadow-lg">{trend.status}</p></div>
                  <div className="text-right"><p className="text-[8px] text-zinc-400 uppercase mb-1 font-mono tracking-widest">Signal</p><p className="text-xl font-black italic text-white drop-shadow-lg">{trend.score}%</p></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {loading && (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="text-emerald-500 animate-spin" size={32} />
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Decoding Signals...</p>
          </div>
        )}
      </div>

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
                <a href={selectedTopic.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-emerald-500 text-[10px] font-mono uppercase tracking-widest hover:underline decoration-emerald-500/50 underline-offset-4">
                  <ExternalLink size={14} /> Intelligence Source
                </a>
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
    </main>
  );
}