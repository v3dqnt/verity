"use client";
import React, { useState, useEffect, useRef, memo } from 'react';
import { VibeScanner } from '@/components/VibeScanner';
import { motion, useMotionValue } from 'framer-motion';
import { useRouter } from "next/navigation";
import { Zap, Clock, History, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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

const PrismaticStars = memo(() => {
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
});

PrismaticStars.displayName = "PrismaticStars";

export default function ScannerPage() {
  const [isExiting, setIsExiting] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        fetchHistory(data.user.id);
      }
    });

    // Listen for custom scan completion to refresh history
    const handleRefresh = () => {
       supabase.auth.getUser().then(({ data }) => {
         if (data.user) fetchHistory(data.user.id);
       });
    };
    window.addEventListener('scan-complete', handleRefresh);
    return () => window.removeEventListener('scan-complete', handleRefresh);
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

  return (
    <main className="min-h-screen bg-[#020202] text-white relative overflow-x-hidden selection:bg-emerald-500/30 selection:text-emerald-200">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="relative min-h-screen w-full flex flex-col items-center pb-20 px-6 md:px-12"
      >
        <PrismaticStars />
        <ShootingStars />
        
        {/* TOP SPACING */}
        <div className="h-28 md:h-52 w-full" />

        <div className="max-w-[1600px] w-full z-10">
          {/* HEADER AREA */}
          <header className="mb-10 md:mb-20">
             <h1 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-none hover:text-emerald-400 transition-colors duration-500">
               AUDITOR
             </h1>
          </header>

          <div className="flex flex-col lg:flex-row gap-6 md:gap-10 items-start">
            
            {/* MAIN SCAN BOX */}
            <div className="flex-1 w-full relative group order-1">
              <div className="absolute -inset-1 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-[2.5rem] md:rounded-[3.5rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="bg-black/20 border border-white/10 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-14 transition-all duration-700 relative overflow-hidden group-hover:shadow-[0_0_60px_-15px_rgba(16,185,129,0.3)] group-hover:border-emerald-500/30">
                 <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[3.5rem] bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
                 <div className="relative z-10">
                   <VibeScanner externalLoadItem={selectedItem} />
                 </div>
              </div>
            </div>

            {/* SIDEBAR: AUDIT HISTORY (On the Right) */}
            <aside className="w-full lg:w-80 shrink-0 space-y-4 order-2 lg:sticky lg:top-40">
               <div className="flex items-center gap-3 mb-4 opacity-60 px-4">
                  <History size={18} className="text-emerald-500" />
                  <span className="text-[11px] font-mono uppercase tracking-[0.4em] font-bold">Audit History</span>
               </div>
               
               <div className="space-y-3 max-h-[40vh] lg:max-h-[750px] overflow-y-auto pr-3 scrollbar-vibe pb-6 lg:pb-12">
                  {history.map((item) => (
                    <motion.div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      whileHover={{ x: -4 }}
                      className={`p-6 rounded-[2rem] border transition-all cursor-pointer group relative overflow-hidden
                        ${selectedItem?.id === item.id 
                          ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]' 
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.08]'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                         <span className={`text-2xl font-black italic tracking-tighter ${item.score >= 80 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                           {item.score}<span className="text-[10px] opacity-40">/100</span>
                         </span>
                         <span className="text-[8px] font-mono opacity-30 mt-1 uppercase">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 line-clamp-2 font-medium leading-relaxed group-hover:text-zinc-300 transition-colors italic">
                        "{item.content}"
                      </p>
                      {selectedItem?.id === item.id && (
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                      )}
                    </motion.div>
                  ))}
                  
                  {history.length === 0 && (
                    <div className="py-12 px-6 text-center border border-dashed border-white/10 rounded-[2rem] opacity-30">
                      <Clock size={24} className="mx-auto mb-4" />
                      <p className="text-[10px] font-mono uppercase tracking-widest">Archive Empty</p>
                    </div>
                  )}
               </div>
            </aside>

          </div>

          <footer className="mt-24 flex flex-col md:flex-row items-center justify-center gap-6 opacity-30">
            <div className="flex gap-8">
               <div className="w-40 h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
            </div>
          </footer>
        </div>
      </motion.div>
    </main>
  );
}