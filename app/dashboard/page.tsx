"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, TrendingUp, Cpu, Camera, ShieldCheck,
  LogOut, Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";

// --- BACKGROUND COMPONENTS ---
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
      {stars.map((star) => (
        <motion.div key={star.id} className="absolute h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" style={{ left: `${star.x}%`, top: `${star.y}%`, width: '150px', transform: 'rotate(35deg)' }} initial={{ opacity: 0, x: -100, y: -100 }} animate={{ opacity: [0, 1, 0], x: 400, y: 400 }} transition={{ duration: 1.5 }} />
      ))}
    </div>
  );
};

const StarsBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let stars = Array.from({ length: 150 }, () => ({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, size: Math.random() * 1.2, opacity: Math.random(), speed: Math.random() * 0.02 }));
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => { s.opacity += s.speed; if (s.opacity > 1 || s.opacity < 0) s.speed = -s.speed; ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(s.opacity)})`; ctx.fill(); });
      requestAnimationFrame(render);
    };
    canvas.width = window.innerWidth; canvas.height = window.innerHeight; render();
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/auth');
      else setSession(session);
      setLoading(false);
    };
    getSession();
  }, [router]);

  const handleLogout = async () => {
    setIsExiting(true);
    setTimeout(async () => {
      await supabase.auth.signOut();
      router.push('/');
    }, 500);
  };

  const navigateWithFade = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => {
      router.push(href);
    }, 500);
  };

  const operatorName = session?.user?.email?.split('@')[0] || "Operator";

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <Loader2 className="text-emerald-500 animate-spin" size={24} />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020202] text-white relative overflow-hidden">

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="relative min-h-screen w-full flex flex-col items-center"
      >
        <StarsBackground />
        <ShootingStars />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)] pointer-events-none" />

        {/* FIXED NAV */}
        <div className="fixed top-0 left-0 w-full z-50 backdrop-blur-md border-b border-white/10 bg-black/40">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex justify-between items-center">
            <Link href="/" onClick={(e) => navigateWithFade(e, "/")} className="group">
              <h1 className="text-3xl md:text-4xl font-black tracking-[-0.06em] uppercase italic">
                VERITY<span className="text-emerald-500">.</span>
              </h1>
              <p className="text-[7px] font-mono uppercase tracking-[0.5em] text-zinc-500">Cultural Intelligence</p>
            </Link>

            {session && (
              <div className="flex items-center gap-6">
                <span className="text-sm font-bold text-white uppercase tracking-tighter italic">
                  {operatorName}
                </span>

                <button
                  onClick={handleLogout}
                  className="group relative flex items-center gap-2 px-4 py-2 bg-white/3 hover:bg-red-500/10 border border-white/10 hover:border-red-500/40 rounded-xl transition-all duration-300"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-red-400 transition-colors">Term Session</span>
                  <LogOut size={14} className="text-zinc-500 group-hover:text-red-400 transition-all" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="max-w-7xl w-full z-10 pt-32 px-6 md:px-12">
          <header className="mb-14 mt-10">
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-3 uppercase italic leading-none">
              Welcome, <span className="text-emerald-500">{operatorName}</span>
            </h2>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl font-light italic">Select an intelligence module to begin your deployment.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* OMNI ORCHESTRATOR */}
            <Link
              href="/dashboard/orchestrator"
              onClick={(e) => navigateWithFade(e, "/dashboard/orchestrator")}
              className="md:col-span-2 block group relative rounded-[2.5rem]"
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.01 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full liquid-glass p-10 rounded-[2.5rem] flex flex-col justify-between overflow-hidden relative shadow-2xl
                  hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-500 shadow-inner border border-white/5">
                    <Cpu size={28} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black italic uppercase text-white tracking-tighter transition-transform group-hover:translate-x-1 duration-300">Omni Orchestrator</h3>
                    <p className="text-zinc-400 text-base mt-2 font-medium italic">Unified campaign engine. Sync visual DNA and copy strategy.</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* VIBE SCANNER */}
            <Link
              href="/dashboard/scanner"
              onClick={(e) => navigateWithFade(e, "/dashboard/scanner")}
              className="block group relative rounded-[2.5rem]"
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full liquid-glass p-8 rounded-[2.5rem] flex flex-col justify-between overflow-hidden relative shadow-2xl
                  hover:shadow-[0_8px_32px_0_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-cyan-500 group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-inner border border-white/5">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter transition-transform group-hover:translate-x-1">Vibe Scanner</h3>
                    <p className="text-zinc-400 text-sm mt-2 font-medium italic">Audit scripts for resonance and cringe-detection.</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* TREND RADAR */}
            <Link
              href="/dashboard/radar"
              onClick={(e) => navigateWithFade(e, "/dashboard/radar")}
              className="block group relative rounded-[2.5rem]"
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full liquid-glass p-8 rounded-[2.5rem] flex flex-col justify-between overflow-hidden relative shadow-2xl
                  hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-purple-500 group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-inner border border-white/5">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter transition-transform group-hover:translate-x-1">Trend Radar</h3>
                    <p className="text-zinc-400 text-sm mt-2 font-medium italic">Real-time market signals from cultural shifts.</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* BRAND VAULT */}
            <Link
              href="/dashboard/brandvault"
              onClick={(e) => navigateWithFade(e, "/dashboard/brandvault")}
              className="block group relative rounded-[2.5rem]"
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full liquid-glass p-8 rounded-[2.5rem] flex flex-col justify-between overflow-hidden relative shadow-2xl
                   hover:shadow-[0_8px_32px_0_rgba(245,158,11,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-amber-500 group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-inner border border-white/5">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter transition-transform group-hover:translate-x-1">Brand Vault</h3>
                    <p className="text-zinc-400 text-sm mt-2 font-medium italic">Secure identity repository and brand DNA guidelines.</p>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* IMGED GENERATOR */}
            <Link
              href="/dashboard/imged"
              onClick={(e) => navigateWithFade(e, "/dashboard/imged")}
              className="block group relative rounded-[2.5rem]"
            >
              <motion.div
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full w-full liquid-glass p-8 rounded-[2.5rem] flex flex-col justify-between overflow-hidden relative shadow-2xl
                   hover:shadow-[0_8px_32px_0_rgba(236,72,153,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]"
              >
                {/* Inner Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-pink-500 group-hover:text-black group-hover:scale-110 transition-all duration-500 shadow-inner border border-white/5">
                    <Camera size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-white tracking-tighter transition-transform group-hover:translate-x-1">AD<span className="text-pink-500"> </span>ENGINE</h3>
                    <p className="text-zinc-400 text-sm mt-2 font-medium italic">Generative visual synthesis engine.</p>
                  </div>
                </div>
              </motion.div>
            </Link>

          </div>
        </div>
      </motion.div>
    </main>
  );
}