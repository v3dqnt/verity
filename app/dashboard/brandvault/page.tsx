"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit3, Save, Globe, X, Upload, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from "next/navigation";
import { supabase } from '@/lib/supabase';
import BrandOnboarding from '@/components/BrandOnboarding';


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
    tone_extra_instructions: "",
    mission_brief: "",
    logo_url: "",
    entity_type: 'brand',
    target_age_groups: [],
    competitors: [],
    social_links: {
      website: '',
      instagram: '',
      tiktok: '',
      twitter: ''
    },
    visual_aesthetic: '',
    content_samples: [],
    product_analysis: [],
    // Advanced fields
    tagline: "",
    vision: "",
    values: [],
    personality: [],
    archetype: "",
    positioning: "",
    voice_traits: [],
    do_say: [],
    dont_say: [],
    humor_style: "",
    slang_level: 3,
    emoji_usage: 2,
    legal_constraints: [],
    sensitive_topics: [],
    banned_topics: [],
    brand_summary: "",
    // Creator specific
    creator_stage: "",
    goals: [],
    catchphrases: [],
    persona_name: "",
    pain_points: [],
    awareness_level: "",
    language_style: "",
    objections: [],
    content_they_skip: [],
    content_pillars: [],
    offers: [],
    on_screen_presence: "",
    visual_refs: [],
    no_go_visuals: [],
    preferred_brand_types: [],
    personal_boundaries: []
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
      tone_extra_instructions: brand.tone_extra_instructions || "",
      mission_brief: brand.mission_brief,
      logo_url: brand.logo_url || "",
      entity_type: brand.entity_type || 'brand',
      target_age_groups: brand.target_age_groups || [],
      competitors: brand.competitors || [],
      social_links: brand.social_links || { website: '', instagram: '', tiktok: '', twitter: '' },
      visual_aesthetic: brand.visual_aesthetic || '',
      content_samples: brand.content_samples || [],
      product_analysis: brand.product_analysis || [],
      // Advanced fields
      tagline: brand.tagline || "",
      vision: brand.vision || "",
      values: brand.values || [],
      personality: brand.personality || [],
      archetype: brand.archetype || "",
      positioning: brand.positioning || "",
      voice_traits: brand.voice_traits || [],
      do_say: brand.do_say || [],
      dont_say: brand.dont_say || [],
      humor_style: brand.humor_style || "",
      slang_level: brand.slang_level || 3,
      emoji_usage: brand.emoji_usage || 2,
      legal_constraints: brand.legal_constraints || [],
      sensitive_topics: brand.sensitive_topics || [],
      banned_topics: brand.banned_topics || [],
      brand_summary: brand.brand_summary || "",
      // Creator specific
      creator_stage: brand.creator_stage || "",
      goals: brand.goals || [],
      catchphrases: brand.catchphrases || [],
      persona_name: brand.persona_name || "",
      pain_points: brand.pain_points || [],
      awareness_level: brand.awareness_level || "",
      language_style: brand.language_style || "",
      objections: brand.objections || [],
      content_they_skip: brand.content_they_skip || [],
      content_pillars: brand.content_pillars || [],
      offers: brand.offers || [],
      on_screen_presence: brand.on_screen_presence || "",
      visual_refs: brand.visual_refs || [],
      no_go_visuals: brand.no_go_visuals || [],
      preferred_brand_types: brand.preferred_brand_types || [],
      personal_boundaries: brand.personal_boundaries || []
    });
    setEditingId(brand.id);
    setModalMode('edit');
  };

  const handleOnboardingComplete = async (data: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      setLoading(true); // Re-use loading or add specific summarizing state

      // 1. Generate AI Intelligence Summary
      const summaryRes = await fetch('/api/ai/brand-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandData: data })
      });
      const summaryData = await summaryRes.json();
      const finalData = { ...data, brand_summary: summaryData.summary || '' };

      // 2. Save to Supabase
      if (modalMode === 'create') {
        const { error } = await supabase.from('briefs').insert([{ ...finalData, user_id: session.user.id }]);
        if (error) {
          console.error("Insert Error:", error);
          alert(`Failed to save: ${error.message}`);
        } else {
          closeAndRefresh();
        }
      } else if (modalMode === 'edit' && editingId) {
        const { error } = await supabase.from('briefs').update(finalData).eq('id', editingId);
        if (error) {
          console.error("Update Error:", error);
          alert(`Failed to update: ${error.message}`);
        } else {
          closeAndRefresh();
        }
      }
    } catch (err) {
      console.error("Finalization failed:", err);
      alert("Failed to finalize brand intelligence.");
    } finally {
      setLoading(false);
    }
  };

  const closeAndRefresh = () => {
    setModalMode(null);
    setEditingId(null);
    setFormData({
      title: "",
      company_name: "",
      industry: "",
      target_audience: "",
      tone_voice: "Authentic & Bold",
      tone_extra_instructions: "",
      mission_brief: "",
      logo_url: "",
      entity_type: 'brand',
      target_age_groups: [],
      competitors: [],
      social_links: { website: '', instagram: '', tiktok: '', twitter: '' },
      visual_aesthetic: '',
      content_samples: [],
      product_analysis: [],
      // Advanced fields
      tagline: "",
      vision: "",
      values: [],
      personality: [],
      archetype: "",
      positioning: "",
      voice_traits: [],
      do_say: [],
      dont_say: [],
      humor_style: "",
      slang_level: 3,
      emoji_usage: 2,
      legal_constraints: [],
      sensitive_topics: [],
      banned_topics: [],
      brand_summary: "",
      // Creator specific
      creator_stage: "",
      goals: [],
      catchphrases: [],
      persona_name: "",
      pain_points: [],
      awareness_level: "",
      language_style: "",
      objections: [],
      content_they_skip: [],
      content_pillars: [],
      offers: [],
      on_screen_presence: "",
      visual_refs: [],
      no_go_visuals: [],
      preferred_brand_types: [],
      personal_boundaries: []
    });
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: isExiting ? 0 : 1 }} transition={{ duration: 0.5 }} className="relative min-h-screen flex flex-col items-center pt-32 px-6 md:px-12">
        <StarsBackground />
        <ShootingStars />

        <div className="max-w-7xl w-full z-10">


          <div className="pb-6" /> {/* Top spacer */}

          <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-20">
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
                className="group relative liquid-glass p-10 rounded-[3rem] transition-all duration-500 ease-out
                  hover:shadow-[0_8px_32px_0_rgba(16,185,129,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]
                  shadow-2xl overflow-hidden flex flex-col justify-between"
              >
                {/* Inner glow layer */}
                <div className={`absolute inset-0 rounded-[3.5rem] bg-[radial-gradient(circle_at_30%_20%,${brand.entity_type === 'brand' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)'},transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`h-12 w-12 rounded-2xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 ${brand.entity_type === 'brand' ? 'text-emerald-500' : 'text-violet-400'} overflow-hidden shadow-inner`}>
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        brand.entity_type === 'brand' ? <Globe size={20} /> : <User size={20} />
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
                    <p className={`${brand.entity_type === 'brand' ? 'text-emerald-400' : 'text-violet-400'} text-[10px] font-mono uppercase tracking-[0.3em]`}>{brand.industry}</p>
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <span className="flex items-center justify-between bg-black/40 border border-white/10 backdrop-blur-md text-zinc-100 px-4 py-2 rounded-2xl shadow-sm">
                      <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-500">Tone</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-200">{brand.tone_voice}</span>
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {modalMode && (
            <BrandOnboarding
              onClose={() => setModalMode(null)}
              onComplete={handleOnboardingComplete}
              initialData={modalMode === 'edit' ? formData : null}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}