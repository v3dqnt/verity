"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; 

// --- BACKGROUND COMPONENTS ---

/**
 * SHOOTING STARS
 * Occasional emerald streaks across the sky
 */
const ShootingStars = () => {
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newStar = { 
        id: Date.now(), 
        x: Math.random() * 100, 
        y: Math.random() * 40 
      };
      setStars((prev) => [...prev, newStar].slice(-3)); 
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute h-px bg-linear-to-r from-transparent via-emerald-500 to-transparent"
          style={{ 
            left: `${star.x}%`, 
            top: `${star.y}%`, 
            width: '150px', 
            transform: 'rotate(35deg)' 
          }}
          initial={{ opacity: 0, x: -100, y: -100 }}
          animate={{ opacity: [0, 1, 0], x: 400, y: 400 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

/**
 * SHIMMERING STARS BACKGROUND
 * High-performance canvas-based twinkling stars
 */
const StarsBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let stars: any[] = [];

    const initStars = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.2 + 0.2,
        opacity: Math.random(),
        speed: Math.random() * 0.02 + 0.005 // Control shimmer/twinkle speed
      }));
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(s => {
        // Shimmer logic: Pulse opacity
        s.opacity += s.speed;
        if (s.opacity > 1 || s.opacity < 0) s.speed = -s.speed;
        
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(s.opacity)})`;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    initStars();
    render();

    const handleResize = () => initStars();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
};

export default function LandingPage() {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error("Auth sync failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleEntry = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/auth'); 
      }
    }, 500); 
  };

  return (
    <main className="h-screen bg-black text-white flex flex-col font-sans selection:bg-emerald-500 selection:text-black overflow-hidden relative">
      
      {/* BACKGROUND LAYERS */}
      <StarsBackground />
      <ShootingStars />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.04)_0%,transparent_70%)] pointer-events-none" />

      {/* FADE CONTENT WRAPPER */}
      <motion.div 
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col relative z-10"
      >
        {/* MINIMAL TOP BAR */}
        <div className="w-full border-b border-white/5 p-6 flex justify-between items-center backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${session ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-zinc-800'}`} />
            <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-500">
              {session ? "Connection: Encrypted" : "Connection: Standby"}
            </span>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.4em] text-zinc-600">v2.6.0</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          {/* HERO TITLE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-16"
          >
            <h1 className="text-[15vw] font-black tracking-[-0.06em] leading-[0.8] uppercase italic">
              VERITY<span className="text-emerald-500">.</span>
            </h1>
            <p className="text-zinc-500 text-[10px] md:text-xs tracking-[0.6em] uppercase mt-10 font-medium">
              Cultural Intelligence Deployment
            </p>
          </motion.div>

          {/* CLEAN CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button 
              onClick={handleEntry} 
              disabled={isLoading}
              className="group relative block outline-none border-none bg-transparent cursor-pointer disabled:opacity-50"
            >
              <motion.div
                whileHover={{ y: -4, x: -2 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white text-black px-10 py-5 flex items-center gap-10 transition-colors group-hover:bg-emerald-500"
              >
                <span className="text-xl md:text-2xl font-black uppercase tracking-tighter italic">
                  {isLoading ? "Syncing..." : session ? "Enter Dashboard" : "Initialize Session"}
                </span>
                {session ? (
                  <ArrowRight size={28} className="transition-transform group-hover:translate-x-2" />
                ) : (
                  <Lock size={20} className="text-black group-hover:scale-110 transition-transform" />
                )}
              </motion.div>
              
              {/* Outline Offset Effect */}
              <div className="absolute inset-0 border border-white translate-x-2 translate-y-2 -z-10 group-hover:border-emerald-500 transition-colors" />
            </button>
          </motion.div>
        </div>

        {/* MINIMAL FOOTER */}
        <div className="w-full border-t border-white/5 p-8 flex justify-center backdrop-blur-sm">
          <p className="text-[9px] text-zinc-600 uppercase tracking-[0.5em] italic">
            Built for the next generation of cultural strategy
          </p>
        </div>
      </motion.div>

      {/* NOISE OVERLAY */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </main>
  );
}