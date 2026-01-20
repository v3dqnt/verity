"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Edit3, Save, Globe, X, Upload, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabase';

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

export default function BrandVault() {
  const [isExiting, setIsExiting] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: "",
    company_name: "",
    industry: "",
    target_audience: "",
    tone_voice: "Authentic & Bold",
    mission_brief: "",
    logo_url: ""
  });

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!error) setBrands(data);
    setLoading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `brand-logos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
      setFormData({ ...formData, logo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Logo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEdit = (brand: any) => {
    setFormData({
      title: brand.title,
      company_name: brand.company_name,
      industry: brand.industry,
      target_audience: brand.target_audience,
      tone_voice: brand.tone_voice,
      mission_brief: brand.mission_brief,
      logo_url: brand.logo_url || ""
    });
    setEditingId(brand.id);
    setModalMode('edit');
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (modalMode === 'create') {
      const { error } = await supabase.from('briefs').insert([{ ...formData, user_id: session?.user.id }]);
      if (!error) closeAndRefresh();
    } else if (modalMode === 'edit' && editingId) {
      const { error } = await supabase.from('briefs').update(formData).eq('id', editingId);
      if (!error) closeAndRefresh();
    }
  };

  const closeAndRefresh = () => {
    setModalMode(null);
    setEditingId(null);
    setFormData({ title: "", company_name: "", industry: "", target_audience: "", tone_voice: "Authentic & Bold", mission_brief: "", logo_url: "" });
    fetchBrands();
  };

  const deleteBrand = async (id: string) => {
    if (confirm("Permanently delete this brand identity?")) {
      const { error } = await supabase.from('briefs').delete().eq('id', id);
      if (!error) fetchBrands();
    }
  };

  return (
    <main className="min-h-screen bg-[#020202] text-white relative overflow-hidden font-sans">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExiting ? 0 : 1 }} transition={{ duration: 0.5 }} className="relative min-h-screen flex flex-col items-center p-6 md:p-12">
        <StarsBackground />
        <ShootingStars />

        <div className="max-w-7xl w-full z-10">
          <nav className="flex justify-between items-center mb-16 border-b border-white/10 pb-8 backdrop-blur-md">
            <Link href="/dashboard" onClick={(e) => { e.preventDefault(); setIsExiting(true); setTimeout(() => router.push("/dashboard"), 500); }} className="group flex items-center gap-3 text-zinc-500 hover:text-emerald-500 transition-all">
              <ArrowLeft size={18} />
              <span className="text-[10px] font-mono uppercase tracking-[0.4em]">Return to Hub</span>
            </Link>

            <Link href="/dashboard/orchestrator" className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-full hover:bg-emerald-500 hover:text-black transition-all group">
              <span className="text-[10px] font-mono uppercase tracking-[0.3em]">Access Orchestrator</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </nav>

          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16">
            <div>
              <h1 className="text-7xl md:text-8xl font-black italic uppercase tracking-tighter leading-none mb-4">
                Brand <span className="text-emerald-500">/</span> Vault
              </h1>
              <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">Proprietary Identity Management</p>
            </div>
            <button onClick={() => setModalMode('create')} className="bg-emerald-500 text-black px-10 py-5 rounded-[2rem] flex items-center gap-4 hover:bg-emerald-400 transition-all group shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <span className="font-black uppercase italic tracking-tighter">Forge New Identity</span>
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {loading ? (
              <div className="col-span-full py-40 text-center"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" /></div>
            ) : brands.map((brand) => (
              <motion.div
                layoutId={brand.id}
                key={brand.id}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="group relative liquid-glass p-8 rounded-[3rem] transition-all duration-500 ease-out
                  hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]
                  shadow-2xl overflow-hidden flex flex-col justify-between"
              >
                {/* Inner glow layer */}
                <div className="absolute inset-0 rounded-[3.5rem] bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.15),transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 text-emerald-500 overflow-hidden shadow-inner">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Globe size={20} />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(brand)} className="p-2 text-zinc-500 hover:text-emerald-500 transition-colors bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => deleteBrand(brand.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-2 text-white drop-shadow-lg">{brand.company_name}</h3>
                    <p className="text-emerald-400 text-[10px] font-mono uppercase tracking-[0.3em]">{brand.industry}</p>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <span className="flex items-center justify-between bg-black/40 border border-white/10 backdrop-blur-md text-zinc-100 px-4 py-2 rounded-2xl shadow-sm">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Tone</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-200">{brand.tone_voice}</span>
                    </span>
                    <span className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md text-emerald-100 px-4 py-2 rounded-2xl shadow-sm">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-400/90">Profile</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-50">{brand.title}</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {modalMode && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.95, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 30 }} className="bg-[#080808] border border-white/10 p-12 rounded-[4rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
                <button onClick={() => setModalMode(null)} className="absolute top-8 right-8 text-zinc-500 hover:text-white"><X size={24} /></button>
                <h2 className="text-5xl font-black italic uppercase tracking-tighter mb-10">
                  {modalMode === 'create' ? 'Forge Identity' : 'Recalibrate Identity'}
                </h2>

                <div className="mb-10 flex flex-col items-center">
                  <label className="relative group cursor-pointer">
                    <div className="h-32 w-32 rounded-[2rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden group-hover:border-emerald-500/50 transition-all">
                      {uploading ? (
                        <Loader2 className="animate-spin text-emerald-500" />
                      ) : formData.logo_url ? (
                        <img src={formData.logo_url} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <>
                          <Upload className="text-zinc-500 group-hover:text-emerald-500 mb-2" size={24} />
                          <span className="text-[8px] font-mono uppercase text-zinc-500 tracking-tighter">Upload Logo</span>
                        </>
                      )}
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Company / Brand Name</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:border-emerald-500 outline-none transition-all" value={formData.company_name} onChange={e => setFormData({ ...formData, company_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Strategy Label</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:border-emerald-500 outline-none transition-all" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Industry Segment</label>
                    <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:border-emerald-500 outline-none transition-all" value={formData.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Voice Archetype</label>
                    <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:border-emerald-500 outline-none transition-all appearance-none" value={formData.tone_voice} onChange={e => setFormData({ ...formData, tone_voice: e.target.value })}>
                      <option>Authentic & Bold</option>
                      <option>Sophisticated & Minimal</option>
                      <option>High-Energy & Chaotic</option>
                      <option>Dark & Cinematic</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 mb-10">
                  <label className="text-[9px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Brand DNA & Context</label>
                  <textarea rows={5} className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-sm focus:border-emerald-500 outline-none transition-all resize-none" value={formData.mission_brief} onChange={e => setFormData({ ...formData, mission_brief: e.target.value })} />
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setModalMode(null)} className="flex-1 border border-white/10 py-5 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-all">Abort</button>
                  <button onClick={handleSubmit} disabled={uploading} className="flex-2 bg-emerald-500 text-black py-5 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-emerald-400 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 disabled:opacity-50">
                    {uploading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                    {modalMode === 'create' ? 'Commit to Vault' : 'Sync Changes'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}