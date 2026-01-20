"use client";
import { useState } from 'react';
import { Zap, ShieldAlert, Sparkles, Loader2, Copy } from 'lucide-react';

export function VibeScanner() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleScan = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/trust-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("Analysis failed. System busy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* 1. INPUT BOX */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-md">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste script here (e.g., 'What's up besties, we are so back with a new drop...')"
          className="w-full h-48 bg-transparent text-white text-xl placeholder-zinc-700 outline-none resize-none leading-relaxed"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleScan}
            disabled={loading || !input}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-30"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} className="fill-current" />}
            {loading ? "SCANNING ENCRYPTIONS..." : "START AUDIT"}
          </button>
        </div>
      </div>

      {/* 2. FULL ANALYSIS REPORT */}
      {result && (
        <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-6 pb-20">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* SCORE AREA */}
            <div className="bg-zinc-900 border border-white/5 p-8 rounded-[2rem] flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Authenticity Rating</span>
              <div className="text-7xl font-black text-white italic">
                {result.overallScore}<span className="text-emerald-500">%</span>
              </div>
              <p className="text-zinc-400 text-sm mt-4 font-medium italic leading-snug">
                "{result.feedback}"
              </p>
            </div>

            {/* REASONS / RED FLAGS AREA */}
            <div className="md:col-span-2 bg-zinc-900 border border-white/5 p-8 rounded-[2rem]">
              <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-500" /> Detected Inconsistencies
              </h3>
              <div className="space-y-3">
                {result.redFlags.map((flag: string, i: number) => (
                  <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-xl text-zinc-300 text-sm flex items-center gap-3">
                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                    {flag}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* REVAMPED SCRIPT AREA */}
          <div className="bg-gradient-to-br from-emerald-950/20 to-zinc-900 border border-emerald-500/20 p-10 rounded-[2.5rem] relative group">
            <h3 className="text-emerald-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Sparkles size={14} /> Recommended Revamp
            </h3>
            <p className="text-white text-2xl font-bold leading-relaxed pr-10">
              {result.improvedVersion}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(result.improvedVersion)}
              className="absolute top-10 right-10 text-zinc-600 hover:text-white transition-colors"
              title="Copy to clipboard"
            >
              <Copy size={20} />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}