"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SignalIcon, MagnifyingGlassIcon, PencilSquareIcon,
  ArrowPathIcon, ArchiveBoxIcon
} from "@heroicons/react/24/outline";
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
      <ArrowPathIcon className="w-6 h-6 text-emerald-500 animate-spin" />
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



        {/* CONTENT AREA */}
        <div className="max-w-7xl w-full z-10 pt-32 px-6 md:px-12">
          <header className="mt-12 mb-20 text-center md:text-left relative">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 uppercase italic leading-none">
              Welcome, <span className="text-emerald-500">{operatorName}</span>
            </h2>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl font-light italic">Select an intelligence module to begin your deployment.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* SCRIBE */}
            <Link
              href="/dashboard/orchestrator"
              onClick={(e) => navigateWithFade(e, "/dashboard/orchestrator")}
              className="block group"
            >
              <motion.div
                initial="initial"
                whileHover="hover"
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.05 }
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="liquid-glass rounded-[2rem] p-10 hover:border-emerald-500/40 hover:bg-white/8 transition-all duration-300 shadow-xl relative overflow-hidden"
              >
                {/* Illustration Area */}
                <div className="w-full aspect-square rounded-[1.5rem] mb-6 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 via-emerald-600/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                      <PencilSquareIcon className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-16 h-16 bg-emerald-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-6 left-6 w-20 h-20 bg-emerald-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                </div>

                {/* Title & Description */}
                <div className="text-center relative z-10">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                    Scribe
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Automated content engine that transforms brand DNA into strategic messaging and high-performing creative assets.
                  </p>
                </div>
              </motion.div>
            </Link>

            {/* AUDITOR */}
            <Link
              href="/dashboard/scanner"
              onClick={(e) => navigateWithFade(e, "/dashboard/scanner")}
              className="block group"
            >
              <motion.div
                initial="initial"
                whileHover="hover"
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.05 }
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="liquid-glass rounded-[2rem] p-10 hover:border-cyan-500/40 hover:bg-white/8 transition-all duration-300 shadow-xl relative overflow-hidden"
              >
                {/* Illustration Area */}
                <div className="w-full aspect-square rounded-[1.5rem] mb-6 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 via-cyan-600/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
                      <MagnifyingGlassIcon className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-16 h-16 bg-cyan-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-6 left-6 w-20 h-20 bg-cyan-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                </div>

                {/* Title & Description */}
                <div className="text-center relative z-10">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    Auditor
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Comprehensive analysis of content scripts to detect resonance and ensure cultural alignment.
                  </p>
                </div>
              </motion.div>
            </Link>

            {/* RADAR */}
            <Link
              href="/dashboard/radar"
              onClick={(e) => navigateWithFade(e, "/dashboard/radar")}
              className="block group"
            >
              <motion.div
                initial="initial"
                whileHover="hover"
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.05 }
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="liquid-glass rounded-[2rem] p-10 hover:border-purple-500/40 hover:bg-white/8 transition-all duration-300 shadow-xl relative overflow-hidden"
              >
                {/* Illustration Area */}
                <div className="w-full aspect-square rounded-[1.5rem] mb-6 overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 via-purple-600/10 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                      <SignalIcon className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-4 right-4 w-16 h-16 bg-purple-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-6 left-6 w-20 h-20 bg-purple-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                </div>

                {/* Title & Description */}
                <div className="text-center relative z-10">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    Radar
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Real-time monitoring of global cultural shifts and market signals to keep your brand ahead of the curve.
                  </p>
                </div>
              </motion.div>
            </Link>

          </div>
        </div>
      </motion.div>
    </main>
  );
}