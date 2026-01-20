"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Supabase handles the session creation automatically
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          }
        })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      if (isSignUp) {
        setMessage("Link sent. Verify your email to initialize.");
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    }

    
  };

  return (
    <main className="h-screen bg-black text-white flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-sm bg-zinc-900/20 border border-white/5 p-12 rounded-[2rem] relative z-10 backdrop-blur-sm"
      >
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Shield className="text-emerald-500 opacity-50" size={24} />
          </div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">
            {isSignUp ? "Register" : "Authorize"}
          </h2>
          <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em] mt-2 italic">
            User Identity Protocol
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-8">
          {/* EMAIL FIELD */}
          <div className="space-y-2">
            <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" 
              required
              className="w-full bg-transparent border-b border-white/10 px-0 py-2 outline-none focus:border-emerald-500 transition-all text-sm italic placeholder:text-zinc-800"
              placeholder="name@network.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD FIELD */}
          <div className="space-y-2">
            <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest ml-1">Secure Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-transparent border-b border-white/10 px-0 py-2 outline-none focus:border-emerald-500 transition-all text-sm italic placeholder:text-zinc-800"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black py-5 font-black uppercase tracking-widest text-[10px] hover:bg-emerald-500 transition-all mt-4 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? "Processing..." : isSignUp ? "Create Account" : "Verify Identity"}
          </button>
        </form>

        {message && (
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="mt-6 text-center text-[9px] font-mono text-emerald-500 uppercase italic tracking-widest bg-emerald-500/5 py-2 rounded-lg border border-emerald-500/10"
          >
            {message}
          </motion.p>
        )}

        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage('');
          }}
          className="w-full mt-8 text-[9px] font-mono text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.2em]"
        >
          {isSignUp ? "Already recognized? Log In" : "New identity? Sign Up"}
        </button>
      </motion.div>

      <button 
        onClick={() => router.push('/')} 
        className="mt-12 text-[9px] font-mono text-zinc-800 hover:text-zinc-400 uppercase tracking-widest transition-colors z-10 flex items-center gap-2"
      >
        <ArrowLeft size={12} /> System Reset
      </button>

      {/* Grain Overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </main>
  );
}