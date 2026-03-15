"use client";
import { useState, useEffect } from 'react';
import { Zap, ShieldAlert, Sparkles, Loader2, Globe, BarChart3, Info, History, X, BrainCircuit, Clock } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import { supabase } from '@/lib/supabase';

export function VibeScanner() {
  const [input, setInput] = useState('');
  const [platform, setPlatform] = useState('default');
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [improvedScript, setImprovedScript] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCriteria, setActiveCriteria] = useState<string | null>(null);
  const [criterionLoading, setCriterionLoading] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchHistory(data.user.id);
      }
    });
  }, []);

  const fetchHistory = async (uid: string) => {
    try {
      const res = await fetch(`/api/ai/trust-score?userId=${uid}`);
      const data = await res.json();
      if (data.history) setHistory(data.history);
    } catch (e) {
      console.error("Failed to fetch history");
    }
  };

  const handleScan = async () => {
    if (!input) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/trust-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input, userId, platform }), // Pass userId and platform
      });
      const data = await res.json();
      setResult(data);
      if (userId) fetchHistory(userId); // Refresh history
    } catch (err) {
      alert("Analysis failed. System busy.");
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!input) return;
    setImproving(true);
    try {
      const res = await fetch('/api/ai/trust-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'improve', content: input, userId, platform }),
      });
      const data = await res.json();
      setImprovedScript(data);
      if (userId) fetchHistory(userId); // Refresh history to show new improvement
    } catch (err) {
      alert("Improvement failed. System busy.");
    } finally {
      setImproving(false);
    }
  };

  const handleCriterionClick = async (key: string, label: string) => {
    // If already open, close it
    if (activeCriteria === key) {
      setActiveCriteria(null);
      return;
    }

    // Set active first to expand UI immediately
    setActiveCriteria(key);

    // If we already have the reasoning in the result (from a previous on-demand fetch), don't fetch again
    if (result.reasoning?.[key]) return;

    // Fetch on-demand
    setCriterionLoading(key);
    try {
      const res = await fetch('/api/ai/trust-score/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: input,
          criterion: label,
          score: result.breakdown[key],
          totalScore: result.viralityScore
        }),
      });
      const data = await res.json();

      // Update the result object with the new reasoning
      setResult((prev: any) => ({
        ...prev,
        reasoning: {
          ...(prev.reasoning || {}),
          [key]: data.reasoning
        }
      }));
    } catch (err) {
      console.error("Failed to fetch reasoning");
    } finally {
      setCriterionLoading(null);
    }
  };

  const loadFromHistory = (item: any) => {
    if (item.result.is_improvement) {
      setImprovedScript(item.result);
      setResult(null); // Clear audit result so only the improvement shows
    } else {
      setResult(item.result);
      setImprovedScript(null);
    }
    setInput(item.content);
    setShowHistory(false);
    setActiveCriteria(null);
    setCriterionLoading(null);
  };

  return (
    <div className="space-y-10 relative">

      {/* HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div className="w-full max-w-md h-full bg-zinc-900 border-l border-white/10 p-8 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic uppercase">Audit History</h2>
              <button onClick={() => setShowHistory(false)} className="hover:text-emerald-500"><X /></button>
            </div>
            <div className="space-y-4">
              {history.map((item: any) => (
                <div key={item.id} onClick={() => loadFromHistory(item)} className="p-4 bg-zinc-800/50 rounded-xl border border-white/5 hover:border-emerald-500/50 cursor-pointer transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xl font-black ${item.score >= 80 ? 'text-emerald-500' : item.score >= 50 ? 'text-yellow-500' : 'text-zinc-500'}`}>
                      {item.score}/100
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(item.created_at).toLocaleDateString()}
                      {item.result?.is_improvement && ' - IMPROVED'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 font-mono">{item.content}</p>
                </div>
              ))}
              {history.length === 0 && <p className="text-zinc-500 italic">No past audits found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* THINKING MODAL */}
      {showThinking && result?.thinking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={() => setShowThinking(false)}>
          <div className="max-w-2xl w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 m-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowThinking(false)} className="absolute top-6 right-6 hover:text-emerald-500"><X /></button>
            <div className="flex items-center gap-3 mb-6 text-emerald-500">
              <BrainCircuit size={24} />
              <h3 className="font-mono uppercase tracking-widest text-sm">AI Thinking Process</h3>
            </div>
            <div className="prose prose-invert max-w-none">
              <p className="text-lg leading-relaxed text-zinc-300 whitespace-pre-wrap">{result.thinking}</p>
            </div>
          </div>
        </div>
      )}

      {/* 1. INPUT BOX */}
      <div className="bg-zinc-900/50 border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap gap-3 mb-6">
          {['default', 'tiktok', 'reels', 'shorts'].map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`px-5 py-2 rounded-full text-xs font-mono uppercase tracking-widest transition-all
                ${platform === p 
                  ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5'}`}
            >
              {p === 'default' ? 'General' : p}
            </button>
          ))}
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste script here (e.g., 'What's up besties, we are so back with a new drop...')"
          className="w-full h-48 bg-transparent text-white text-xl placeholder-zinc-700 outline-none resize-none leading-relaxed"
        />
        <div className="flex justify-between mt-4">
          {/* HISTORY TOGGLE */}
          {userId && (
            <button
              onClick={() => setShowHistory(true)}
              className="text-zinc-500 hover:text-white flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-mono uppercase tracking-widest"
            >
              <History size={16} /> Past Audits ({history.length})
            </button>
          )}

          <button
            onClick={handleScan}
            disabled={loading || !input}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 px-10 rounded-2xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-30 ml-auto"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} className="fill-current" />}
            {loading ? "SCANNING ENCRYPTIONS..." : "START AUDIT"}
          </button>
        </div>
      </div>

      {/* 2. FULL ANALYSIS REPORT */}
      {(result || improvedScript) && (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-8 pb-20">

          {result && (
            <>
              {/* HEADER SCORES */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* MAIN SCORE & FEEDBACK */}
                <div className="lg:col-span-2 bg-zinc-900/80 border border-white/5 p-10 rounded-[3rem] backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 flex gap-3">
                {/* THINKING BUTTON */}
                {result.thinking && (
                  <button
                    onClick={() => setShowThinking(true)}
                    className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full hover:bg-emerald-500/20 transition-colors cursor-pointer"
                  >
                    <BrainCircuit size={12} className="text-emerald-500" />
                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">View Logic</span>
                  </button>
                )}
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                  <Globe size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">{result.language || "Universal"}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="relative cursor-pointer group-hover:scale-105 transition-transform" onClick={() => result.thinking && setShowThinking(true)} title="Click to see AI thinking">
                  <div className="w-48 h-48 rounded-full border-4 border-emerald-500/20 flex items-center justify-center relative">
                    <div className="text-6xl font-black text-white italic">
                      {result.viralityScore}<span className="text-emerald-500 text-3xl">/100</span>
                    </div>
                    {/* SVG Progress Ring */}
                    <svg className="absolute -inset-1 w-50 h-50 -rotate-90">
                      <circle
                        cx="100" cy="100" r="96"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeDasharray={2 * Math.PI * 96}
                        strokeDashoffset={2 * Math.PI * 96 * (1 - result.viralityScore / 100)}
                        className="text-emerald-500 transition-all duration-1000 ease-out"
                      />
                    </svg>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] text-center mt-6 group-hover:text-emerald-400 transition-colors">Audit Score</p>
                </div>

                <div className="flex-1 space-y-4">
                  <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] flex items-center gap-2">
                    <Info size={14} className="text-emerald-500" /> Executive Summary
                  </h3>
                  <p className="text-2xl font-medium text-white leading-relaxed italic">
                    "{result.feedback}"
                  </p>
                </div>
              </div>
            </div>

            {/* QUICK STATS / RED FLAGS */}
            <div className="bg-zinc-900 border border-white/5 p-8 rounded-[3rem]">
              <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-500" /> Red Flags ({result.redFlags.length})
              </h3>
              <div className="space-y-4">
                {result.redFlags.map((flag: string, i: number) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0 group-hover:scale-150 transition-transform" />
                    <p className="text-zinc-400 text-sm leading-tight">{flag}</p>
                  </div>
                ))}
                {result.redFlags.length === 0 && (
                  <p className="text-emerald-500/50 text-sm italic">No cringe detected. You're clear.</p>
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-4">
                <button
                  onClick={handleImprove}
                  disabled={improving}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold py-3 rounded-xl border border-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
                >
                  {improving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />}
                  {improving ? "GENERATING IMPROVEMENTS..." : "AUTO-IMPROVE SCRIPT"}
                </button>
              </div>
            </div>
          </div>

          {/* ANALYTICS DASHBOARD */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* RADAR CHART */}
            <div className="bg-zinc-900/50 border border-white/5 p-10 rounded-[3rem] min-h-[650px] flex flex-col">
              <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-10 flex items-center gap-2">
                <BarChart3 size={14} className="text-emerald-500" /> Performance Dimensions
              </h3>
              <div className="flex-1 w-full relative min-h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[
                    { subject: 'Hook Strength', A: result.breakdown.hook_strength, fullMark: 100 },
                    { subject: 'Clarity', A: result.breakdown.clarity, fullMark: 100 },
                    { subject: 'Incongruency', A: result.breakdown.incongruency, fullMark: 100 },
                    { subject: 'Simplicity', A: result.breakdown.simplicity, fullMark: 100 },
                    { subject: 'Emotional Trigger', A: result.breakdown.emotional_trigger, fullMark: 100 },
                    { subject: 'Retention', A: result.breakdown.retention, fullMark: 100 },
                    { subject: 'Shareability', A: result.breakdown.shareability, fullMark: 100 },
                    { subject: 'Personal Touch', A: result.breakdown.personal_touch, fullMark: 100 },
                    { subject: 'Takeaway & CTA', A: result.breakdown.takeaway_cta, fullMark: 100 },
                  ]}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Audit"
                      dataKey="A"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* VIBE SCALE LEGEND */}
              <div className="mt-12 pt-8 border-t border-white/10">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                  {[
                    { r: '0–30', l: 'Dead on Arrival', c: 'text-zinc-500', bg: 'bg-zinc-500' },
                    { r: '31–45', l: 'Polite Content', c: 'text-blue-400', bg: 'bg-blue-400' },
                    { r: '46–60', l: 'Competent, Non-Viral', c: 'text-emerald-400', bg: 'bg-emerald-400' },
                    { r: '61–70', l: 'High-Quality, Low Explosion', c: 'text-yellow-400', bg: 'bg-yellow-400' },
                    { r: '71–80', l: 'Algorithm-Eligible', c: 'text-orange-400', bg: 'bg-orange-400' },
                    { r: '81–90', l: 'Platform Weapon', c: 'text-red-400', bg: 'bg-red-400' },
                    { r: '91–100', l: 'Cultural Event', c: 'text-purple-400', bg: 'bg-purple-400' },
                  ].map((s, i) => (
                    <div key={i} className="space-y-1.5 group cursor-default">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-1 rounded-full ${s.bg} group-hover:scale-150 transition-all`} />
                        <span className="text-[10px] font-mono text-zinc-600 tracking-tighter">{s.r}</span>
                      </div>
                      <p className={`text-[10px] font-black ${s.c} uppercase leading-tight tracking-tight`}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* NUMERICAL BREAKDOWN */}
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: 'Hook Strength', key: 'hook_strength', color: 'emerald' },
                { label: 'Clarity', key: 'clarity', color: 'blue' },
                { label: 'Incongruency', key: 'incongruency', color: 'purple' },
                { label: 'Simplicity', key: 'simplicity', color: 'orange' },
                { label: 'Emotional Trigger', key: 'emotional_trigger', color: 'pink' },
                { label: 'Retention', key: 'retention', color: 'cyan' },
                { label: 'Shareability', key: 'shareability', color: 'indigo' },
                { label: 'Personal Touch', key: 'personal_touch', color: 'teal' },
                { label: 'Takeaway & CTA', key: 'takeaway_cta', color: 'orange' },
              ].map((item) => (
                <div
                  key={item.key}
                  onClick={() => handleCriterionClick(item.key, item.label)}
                  className={`bg-zinc-900/30 border ${activeCriteria === item.key ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5'} p-6 rounded-2xl cursor-pointer hover:border-white/10 transition-all`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">{item.label}</p>
                      <div className="h-1.5 w-48 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                          style={{ width: `${result.breakdown[item.key]}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-3xl font-black text-white italic">
                      {result.breakdown[item.key]}<span className="text-zinc-600 text-sm ml-1"> pts</span>
                    </div>
                  </div>
                  {activeCriteria === item.key && (
                    <div className="mt-4 p-4 bg-black/40 rounded-xl border border-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-1 text-red-400">
                        <ShieldAlert size={12} />
                        <span className="text-[8px] font-mono uppercase tracking-widest font-bold">Deduction Reason</span>
                      </div>
                      {criterionLoading === item.key ? (
                        <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-mono animate-pulse">
                          <Loader2 size={10} className="animate-spin" /> GENERATING ANALYTICS...
                        </div>
                      ) : result.reasoning?.[item.key] ? (
                        <p className="text-xs text-zinc-300 leading-relaxed italic">
                          "{result.reasoning[item.key]}"
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">No breakdown available.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
          </>
          )}

          {/* IMPROVED SCRIPT OUTPUT */}
          {improvedScript && (
            <div className="bg-zinc-900 border border-emerald-500/20 p-10 rounded-[3rem] animate-in fade-in slide-in-from-bottom-8">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-emerald-500" size={24} />
                <h2 className="text-2xl font-black italic uppercase text-white">Improved Script: {improvedScript.title}</h2>
                <div className="ml-auto text-emerald-500 font-mono text-xl font-bold">
                  {improvedScript.authenticityScore}<span className="text-sm text-zinc-500">/100 Authenticity</span>
                </div>
              </div>

              {improvedScript.improvements?.length > 0 && (
                <div className="mb-10 space-y-4">
                  <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em]">Key Improvements</h3>
                  {improvedScript.improvements.map((imp: any, idx: number) => (
                    <div key={idx} className="bg-zinc-800/50 p-4 rounded-xl border border-white/5">
                      <p className="text-xs text-red-400 line-through mb-1">{imp.original}</p>
                      <p className="text-sm text-emerald-400 mb-2">{imp.tweak}</p>
                      <p className="text-[10px] text-zinc-500 font-mono italic">Reasoning: {imp.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-zinc-500 text-[10px] font-mono uppercase tracking-[0.3em] mb-4">Final Script Beats</h3>
                <div className="space-y-4">
                  {improvedScript.script?.map((beat: any, i: number) => (
                    <div key={i} className="flex gap-4 p-4 border border-white/5 rounded-xl hover:border-emerald-500/30 transition-colors bg-zinc-800/30 group">
                      <div className="w-12 text-zinc-500 font-mono text-xs pt-1">{beat.timestamp}</div>
                      <div className="flex-1 space-y-1">
                        <p className="text-xs text-emerald-500/70 font-mono uppercase tracking-widest">{beat.speaker} <span className="text-zinc-600">|</span> {beat.action}</p>
                        <p className="text-zinc-200 text-sm leading-relaxed">{beat.dialogue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}