"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowLeft, Loader2, Mail, Lock, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const getURL = () => {
    let url =
      process?.env?.NEXT_PUBLIC_SITE_URL ??
      process?.env?.NEXT_PUBLIC_VERCEL_URL ??
      window.location.origin;
    url = url.includes('http') ? url : `https://${url}`;
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
    return url;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${getURL()}auth/callback`,
          }
        })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (isSignUp) {
        setMessage("Check your email to confirm your account!");
      } else {
        router.push('/dashboard');
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage("Please enter your email first.");
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/callback?next=/dashboard/settings`,
      });
      if (error) throw error;
      setMessage("Password reset link sent to your email!");
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 selection:bg-emerald-500 selection:text-black relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md liquid-glass p-8 md:p-12 rounded-[2.5rem] relative z-10 overflow-hidden shadow-2xl"
      >
        {/* Inner Glow Detail */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_60%)] pointer-events-none" />

        <div className="text-center mb-10 relative z-10">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-6 border border-emerald-500/20 shadow-inner"
          >
            {isResetting ? <Key size={32} /> : <Shield size={32} />}
          </motion.div>

          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            {isResetting ? "Reset Access" : isSignUp ? "Get Started" : "Welcome Back"}
          </h2>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.4em] mt-3 font-semibold">
            {isResetting ? "Recovery Portal" : "Creative Console Access"}
          </p>
        </div>

        <form onSubmit={isResetting ? handleResetPassword : handleAuth} className="space-y-6 relative z-10">
          {/* EMAIL FIELD */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Mail size={12} className="text-emerald-500/70" />
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email Address</label>
            </div>
            <input
              type="email"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all text-sm font-medium placeholder:text-zinc-700 backdrop-blur-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* PASSWORD FIELD (Hidden on Reset) */}
          <AnimatePresence mode="wait">
            {!isResetting && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={12} className="text-emerald-500/70" />
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Password</label>
                </div>
                <input
                  type="password"
                  required={!isResetting}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all text-sm font-medium placeholder:text-zinc-700 backdrop-blur-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-4 rounded-xl font-black uppercase tracking-widest text-[12px] transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-3 mt-4"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              isResetting ? "Request Link" : isSignUp ? "Create Account" : "Enter Console"
            )}
          </button>
        </form>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center"
            >
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest italic leading-relaxed">
                {message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex flex-col items-center gap-4 relative z-10 border-t border-white/5 pt-8">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setIsResetting(false);
              setMessage('');
            }}
            className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 transition-colors uppercase tracking-[0.2em]"
          >
            {isSignUp ? "Already have access? Log In" : "New creator? Sign Up"}
          </button>

          {!isResetting && !isSignUp && (
            <button
              onClick={() => {
                setIsResetting(true);
                setMessage('');
              }}
              className="text-[9px] font-bold text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.2em]"
            >
              Forgot your password?
            </button>
          )}

          {isResetting && (
            <button
              onClick={() => {
                setIsResetting(false);
                setMessage('');
              }}
              className="text-[9px] font-bold text-zinc-600 hover:text-white transition-colors uppercase tracking-[0.2em]"
            >
              Back to Log In
            </button>
          )}
        </div>
      </motion.div>

      <button
        onClick={() => router.push('/')}
        className="mt-12 text-[10px] font-bold text-zinc-600 hover:text-emerald-400 uppercase tracking-widest transition-all z-10 flex items-center gap-3 group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        Return to Core
      </button>

      {/* Grain Overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </main>
  );
}
