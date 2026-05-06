"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  ArrowUpTrayIcon, 
  FilmIcon, 
  MusicalNoteIcon, 
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import FloatingNav from '@/components/FloatingNav';

type JobStatus = 'idle' | 'pending' | 'extracting' | 'analyzing' | 'planning' | 'rendering' | 'done' | 'failed';

const STATUS_MESSAGES: Record<JobStatus, string> = {
  idle: 'Waiting for input...',
  pending: 'Uploading clips to neural storage...',
  extracting: 'Extracting keyframes & metadata...',
  analyzing: 'Gemini Vision analyzing frames...',
  planning: 'Claude constructing edit plan...',
  rendering: 'FFmpeg rendering final output...',
  done: 'Render complete.',
  failed: 'Processing failed.',
};

export default function EditorPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [clips, setClips] = useState<File[]>([]);
  const [music, setMusic] = useState<File | null>(null);
  const [brief, setBrief] = useState('');
  
  const [status, setStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/auth');
      else setSession(session);
      setLoading(false);
    };
    getSession();
  }, [router]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  // Poll status when jobId exists and we are not done or failed
  useEffect(() => {
    if (!jobId || status === 'done' || status === 'failed' || status === 'idle') return;

    const pollInterval = setInterval(async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/editor/status/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status as JobStatus);
          
          if (data.status === 'done') {
            setOutputUrl(data.output_url);
            clearInterval(pollInterval);
          } else if (data.status === 'failed') {
            setErrorMsg(data.error || 'Unknown error occurred.');
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [jobId, status]);

  const handleClipSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setClips(prev => [...prev, ...selected]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMusicSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setMusic(e.target.files[0]);
    }
  };

  const removeClip = (index: number) => {
    setClips(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (clips.length === 0) {
      setErrorMsg("Please upload at least one clip.");
      return;
    }
    if (!brief.trim()) {
      setErrorMsg("Please provide a creative brief.");
      return;
    }

    try {
      setErrorMsg(null);
      setStatus('pending');
      const token = await getToken();

      const formData = new FormData();
      formData.append('brief', brief);
      clips.forEach((clip, i) => formData.append(`clip_${i}`, clip));
      if (music) {
        formData.append('music', music);
      }

      // 1. Create Job & Upload
      const createRes = await fetch('/api/editor/create-job', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create job');
      }

      const newJobId = createData.jobId;
      setJobId(newJobId);
      
      // 2. Fire and forget the process route
      fetch(`/api/editor/process/${newJobId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(err => console.error("Process error:", err));

    } catch (err: any) {
      console.error(err);
      setStatus('failed');
      setErrorMsg(err.message || 'Something went wrong.');
    }
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
    <div className="min-h-screen bg-[#020202] text-white relative font-sans selection:bg-emerald-500/30">
      <FloatingNav />
      
      <div className="pt-32 pb-20 px-4 md:px-8 max-w-5xl mx-auto">
        
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">
            Neural Editor
          </h1>
          <p className="text-zinc-400 max-w-2xl text-lg">
            Upload raw clips, describe your vision, and let the AI stack edit, color grade, and pace your video.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: INPUT FORM */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Brief */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-xl">
              <label className="block text-sm font-semibold text-emerald-400 mb-3 uppercase tracking-wider">
                Creative Brief
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g., Make a 30s high-energy reel with fast cuts and a cinematic color grade..."
                className="w-full h-32 bg-black/50 border border-zinc-800 rounded-xl p-4 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"
                disabled={status !== 'idle' && status !== 'failed'}
              />
            </div>

            {/* Media Uploads */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-xl space-y-6">
              
              {/* Clips */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                    Raw Clips
                  </label>
                  <span className="text-xs text-zinc-500">{clips.length} selected</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                  {clips.map((clip, i) => (
                    <div key={i} className="relative group bg-black/40 border border-zinc-800 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                      <FilmIcon className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-cyan-500 transition-colors" />
                      <span className="text-xs text-zinc-400 truncate w-full px-2">{clip.name}</span>
                      {status === 'idle' || status === 'failed' ? (
                        <button 
                          onClick={() => removeClip(i)}
                          className="absolute -top-2 -right-2 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                  
                  {(status === 'idle' || status === 'failed') && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-500/5 rounded-xl p-4 flex flex-col items-center justify-center text-zinc-500 hover:text-cyan-400 transition-all min-h-[100px]"
                    >
                      <ArrowUpTrayIcon className="w-6 h-6 mb-2" />
                      <span className="text-xs font-medium">Add Clips</span>
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleClipSelect} 
                  multiple 
                  accept="video/*" 
                  className="hidden" 
                />
              </div>

              {/* Music */}
              <div className="pt-4 border-t border-zinc-800/50">
                <label className="block text-sm font-semibold text-purple-400 mb-3 uppercase tracking-wider">
                  Background Music (Optional)
                </label>
                
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => musicInputRef.current?.click()}
                    disabled={status !== 'idle' && status !== 'failed'}
                    className="flex items-center gap-2 px-4 py-2 bg-black/50 border border-zinc-800 hover:border-purple-500/50 rounded-lg text-sm font-medium text-zinc-300 hover:text-purple-400 transition-all disabled:opacity-50"
                  >
                    <MusicalNoteIcon className="w-4 h-4" />
                    {music ? 'Change Track' : 'Select Audio'}
                  </button>
                  
                  {music && (
                    <div className="flex items-center gap-2 text-sm text-zinc-400 bg-black/30 px-3 py-1.5 rounded-lg border border-zinc-800/50">
                      <span className="truncate max-w-[200px]">{music.name}</span>
                      {(status === 'idle' || status === 'failed') && (
                        <button onClick={() => setMusic(null)} className="text-zinc-500 hover:text-red-400">
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={musicInputRef} 
                  onChange={handleMusicSelect} 
                  accept="audio/*" 
                  className="hidden" 
                />
              </div>

            </div>

            {/* Action */}
            {(status === 'idle' || status === 'failed') && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_30px_-5px_rgba(16,185,129,0.4)] transition-colors"
              >
                <PlayIcon className="w-6 h-6" />
                Initialize Editor Pipeline
              </motion.button>
            )}

          </div>

          {/* RIGHT: STATUS & OUTPUT */}
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-xl sticky top-24">
              <h3 className="text-lg font-bold mb-6 text-zinc-100 flex items-center gap-2">
                <ArrowPathIcon className={`w-5 h-5 ${status !== 'idle' && status !== 'done' && status !== 'failed' ? 'animate-spin text-emerald-400' : 'text-zinc-600'}`} />
                Pipeline Status
              </h3>
              
              <div className="space-y-4">
                {[
                  { id: 'pending', label: 'Upload to Storage' },
                  { id: 'extracting', label: 'Keyframe Extraction' },
                  { id: 'analyzing', label: 'Gemini Vision Analysis' },
                  { id: 'planning', label: 'GPT-4o Edit Planning' },
                  { id: 'rendering', label: 'FFmpeg Compositing' },
                ].map((step, idx) => {
                  
                  const states = ['idle', 'pending', 'extracting', 'analyzing', 'planning', 'rendering', 'done', 'failed'];
                  const currentIndex = states.indexOf(status);
                  const stepIndex = states.indexOf(step.id);
                  
                  let state: 'waiting' | 'active' | 'done' = 'waiting';
                  if (status === 'failed') state = stepIndex <= currentIndex ? 'done' : 'waiting'; // simplistic
                  else if (currentIndex > stepIndex) state = 'done';
                  else if (currentIndex === stepIndex) state = 'active';

                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                        state === 'done' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 
                        state === 'active' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 animate-pulse' : 
                        'bg-zinc-900 border-zinc-800 text-zinc-700'
                      }`}>
                        {state === 'done' ? <CheckCircleIcon className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <span className={`text-sm font-medium ${
                        state === 'done' ? 'text-zinc-300' : 
                        state === 'active' ? 'text-cyan-400' : 
                        'text-zinc-600'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Message / Error */}
              <div className="mt-8 pt-6 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-400 mb-2">Current Activity:</p>
                <div className={`p-3 rounded-lg border ${
                  status === 'failed' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  'bg-black/50 border-zinc-800 text-cyan-400 font-mono text-xs'
                }`}>
                  {errorMsg || STATUS_MESSAGES[status]}
                </div>
              </div>

              {/* Output */}
              <AnimatePresence>
                {status === 'done' && outputUrl && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-6 overflow-hidden rounded-xl border border-emerald-500/30 bg-black"
                  >
                    <video 
                      src={outputUrl} 
                      controls 
                      className="w-full aspect-video object-contain"
                    />
                    <div className="p-3 bg-zinc-950 flex justify-center">
                      <a 
                        href={outputUrl} 
                        download="verity-edit.mp4"
                        className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                      >
                        Download Render
                      </a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
