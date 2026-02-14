"use client";
import React, { useState, useEffect, useRef, memo } from 'react';
import { VibeScanner } from '@/components/VibeScanner';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";


// --- BACKGROUND COMPONENT (From Radar) ---
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

export default function ScannerPage() {
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  const navigateWithFade = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsExiting(true);
    setTimeout(() => router.push(href), 500);
  };

  return (
    <main className="min-h-screen bg-[#020202] text-white pt-32 p-6 md:p-12 relative overflow-x-hidden font-sans selection:bg-emerald-500 selection:text-black">
      <Stars />
      <div className="max-w-7xl mx-auto relative z-10">

        {/* NAVIGATION */}


        {/* HEADER */}
        <header className="mt-32 mb-20">
          <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
            Auditor
          </h1>
          <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mt-4">Resonance Audit</p>
        </header>

        {/* CONTENT AREA */}
        <div className="w-full">
          <div className="liquid-glass p-1 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="relative z-10 p-10 md:p-16">
              <VibeScanner />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}