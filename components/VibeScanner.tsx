"use client";
import { useState } from 'react';
import { Zap, ShieldAlert, Sparkles, Loader2, Globe, BarChart3, Info } from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip
} from 'recharts';

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
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-8 pb-20">

          {/* HEADER SCORES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* MAIN SCORE & FEEDBACK */}
            <div className="lg:col-span-2 bg-zinc-900/80 border border-white/5 p-10 rounded-[3rem] backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8">
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full">
                  <Globe size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">{result.language || "Universal"}</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="relative">
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
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em] text-center mt-6">Audit Score</p>
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
                <div key={item.key} className="bg-zinc-900/30 border border-white/5 p-6 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                  <div>
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">{item.label}</p>
                    <div className="h-1.5 w-48 bg-white/5 rounded-full mt-2 overflow-hidden">
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
              ))}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}