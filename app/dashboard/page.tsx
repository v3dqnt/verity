"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  SignalIcon, MagnifyingGlassIcon, PencilSquareIcon,
  ArrowPathIcon, EyeIcon
} from "@heroicons/react/24/outline";
import { supabase } from "@/lib/supabase";
import { motion, useMotionValue } from "framer-motion";

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
        <motion.div
          key={star.id}
          className="absolute h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: '150px', transform: 'rotate(15deg)' }}
          initial={{ opacity: 0, x: -100, y: -100 }}
          animate={{ opacity: [0, 0.8, 0], x: 400, y: 150 }}
          transition={{ duration: 2, ease: "linear" }}
        />
      ))}
    </div>
  );
};

const PrismaticStars = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 1.5,
      opacity: Math.random(),
      speed: 0.005 + Math.random() * 0.01,
      color: Math.random() > 0.8 ? "rgb(16, 185, 129)" : "white"
    }));

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseX.get();
      const my = mouseY.get();

      stars.forEach(s => {
        s.opacity += s.speed;
        if (s.opacity > 1 || s.opacity < 0) s.speed = -s.speed;
        
        // Parallax effect
        const dx = (mx - window.innerWidth / 2) * (s.size * 0.02);
        const dy = (my - window.innerHeight / 2) * (s.size * 0.02);

        ctx.beginPath();
        ctx.arc(s.x + dx, s.y + dy, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color === "white" 
          ? `rgba(255, 255, 255, ${Math.abs(s.opacity) * 0.5})`
          : `rgba(16, 185, 129, ${Math.abs(s.opacity) * 0.8})`;
        ctx.fill();
        
        if (s.size > 1.2 && Math.random() > 0.99) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = s.color === "white" ? "white" : "rgb(16, 185, 129)";
        } else {
          ctx.shadowBlur = 0;
        }
      });
      requestAnimationFrame(render);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
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

  if (loading) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="w-48 h-1 bg-zinc-900 rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-emerald-500" 
          initial={{ width: 0 }} 
          animate={{ width: "100%" }} 
          transition={{ duration: 1.5, ease: "easeInOut" }} 
        />
      </div>
      <p className="text-[10px] tracking-widest uppercase font-mono text-emerald-500/60">Initializing Neural Link...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="relative min-h-screen w-full flex flex-col items-center pb-20 px-4 md:px-12"
      >
        <PrismaticStars />
        <ShootingStars />
        
        {/* TOP SPACING */}
        <div className="h-28 md:h-56 w-full" />

        {/* BENTO GRID - EDITORIAL LAYOUT */}
        <div className="max-w-7xl w-full z-10">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6 md:h-[650px] auto-rows-fr">
            
            {/* AUDITOR - Wide Horizon */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="md:col-span-4 md:row-span-1 group min-h-[160px] md:min-h-0"
            >
              <Link
                href="/dashboard/scanner"
                onClick={(e) => navigateWithFade(e, "/dashboard/scanner")}
                className="block h-full"
              >
                <div className="bg-black/10 border border-white/10 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-10 h-full flex flex-row items-center gap-5 md:justify-between hover:bg-emerald-500/[0.06] transition-all duration-700 relative overflow-hidden group-hover:shadow-[0_0_50px_-15px_rgba(16,185,129,0.3)] group-hover:border-emerald-500/40">
                   <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                   <div className="p-4 md:hidden rounded-2xl border border-white/10 bg-zinc-950 group-hover:border-emerald-500/40 group-hover:scale-110 transition-all duration-500 relative z-10 shadow-2xl shrink-0">
                      <MagnifyingGlassIcon className="w-8 h-8 text-emerald-500" />
                   </div>
                   <div className="flex flex-col gap-1 md:gap-2 relative z-10 flex-1 md:flex-none">
                    <h3 className="text-2xl md:text-5xl font-black tracking-tighter group-hover:text-emerald-400 transition-all duration-500">Auditor</h3>
                      <p className="text-zinc-500 text-xs md:text-sm max-w-sm font-medium group-hover:text-zinc-300 transition-colors hidden md:block">Neural script resonance & cultural alignment scanner.</p>
                   </div>
                   <div className="p-4 md:p-5 hidden md:flex rounded-2xl border border-white/10 bg-zinc-950 group-hover:border-emerald-500/40 group-hover:scale-110 transition-all duration-500 relative z-10 shadow-2xl shrink-0">
                      <MagnifyingGlassIcon className="w-10 h-10 text-emerald-500" />
                   </div>
                </div>
              </Link>
            </motion.div>

            {/* SCRIBE - Tall Pillar */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="md:col-span-2 md:row-span-2 group min-h-[160px] md:min-h-0"
            >
              <Link
                href="/dashboard/orchestrator"
                onClick={(e) => navigateWithFade(e, "/dashboard/orchestrator")}
                className="block h-full"
              >
                <div className="bg-black/10 border border-white/10 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-12 h-full flex flex-row md:flex-col items-center md:items-start gap-5 md:gap-0 md:justify-between hover:bg-cyan-500/[0.06] transition-all duration-700 relative overflow-hidden group-hover:shadow-[0_0_50px_-15px_rgba(6,182,212,0.25)] group-hover:border-cyan-500/40">
                  <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                  <div className="p-4 md:p-5 rounded-2xl border border-white/10 bg-zinc-950 group-hover:border-cyan-500/40 group-hover:scale-110 transition-all duration-500 relative z-10 shadow-2xl shrink-0">
                    <PencilSquareIcon className="w-8 h-8 md:w-10 md:h-10 text-cyan-400" />
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-2xl md:text-4xl font-black tracking-tighter mb-0 md:mb-4 group-hover:text-cyan-400 transition-all duration-500">Scribe</h3>
                    <p className="text-xs md:text-sm text-zinc-500 leading-relaxed font-medium group-hover:text-zinc-300 transition-colors hidden md:block">Advanced AI script architect for high-conversion UGC.</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* VISION - Dynamic Square */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="md:col-span-2 md:row-span-1 group min-h-[160px] md:min-h-0"
            >
              <Link
                href="/dashboard/vision"
                onClick={(e) => navigateWithFade(e, "/dashboard/vision")}
                className="block h-full"
              >
                <div className="bg-black/10 border border-white/10 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 h-full flex flex-row md:flex-col items-center md:items-start gap-5 md:gap-0 md:justify-center hover:bg-orange-500/[0.06] transition-all duration-700 relative overflow-hidden group-hover:border-orange-500/40 group-hover:shadow-[0_0_50px_-15px_rgba(249,115,22,0.2)]">
                  <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[3rem] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                  <div className="p-4 md:p-5 rounded-2xl border border-white/10 bg-zinc-950 group-hover:border-orange-500/40 group-hover:scale-110 transition-all relative z-10 shadow-2xl shrink-0">
                    <EyeIcon className="w-8 h-8 md:w-10 md:h-10 text-orange-400" />
                  </div>
                  <div className="text-left relative z-10">
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter group-hover:text-orange-400 transition-all">Vision</h3>
                    <p className="text-xs text-zinc-500 font-medium group-hover:text-zinc-300 transition-colors hidden md:block mt-2">Native video intelligence to decode virality signals.</p>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* RADAR - Dynamic Square */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="md:col-span-2 md:row-span-1 group min-h-[160px] md:min-h-0"
            >
              <Link
                href="/dashboard/radar"
                onClick={(e) => navigateWithFade(e, "/dashboard/radar")}
                className="block h-full"
              >
                <div className="bg-black/10 border border-white/10 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 h-full flex flex-row md:flex-col items-center md:items-start gap-5 md:gap-0 md:justify-center hover:bg-purple-500/[0.06] transition-all duration-700 relative overflow-hidden group-hover:border-purple-500/40 group-hover:shadow-[0_0_50px_-15px_rgba(168,85,247,0.2)]">
                  <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[3rem] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                  <div className="p-4 md:p-5 rounded-2xl border border-white/10 bg-zinc-950 group-hover:border-purple-500/40 group-hover:scale-110 transition-all relative z-10 shadow-2xl shrink-0">
                    <SignalIcon className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
                  </div>
                  <div className="text-left relative z-10">
                    <h3 className="text-2xl md:text-3xl font-black tracking-tighter group-hover:text-purple-400 transition-all">Radar</h3>
                    <p className="text-xs text-zinc-500 font-medium group-hover:text-zinc-300 transition-colors hidden md:block mt-2">Real-time monitoring of global cultural shifts.</p>
                  </div>
                </div>
              </Link>
            </motion.div>


          </div>
        </div>
      </motion.div>
    </main>
  );
}