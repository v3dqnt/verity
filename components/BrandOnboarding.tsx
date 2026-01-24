"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
    Building2,
    User,
    Target,
    Globe,
    Instagram,
    Twitter,
    Search,
    Sparkles,
    ChevronRight,
    ChevronLeft,
    X,
    Plus,
    Trash2,
    Loader2,
    Zap,
    Upload
} from 'lucide-react';

interface BrandOnboardingProps {
    onClose: () => void;
    onComplete: (data: any) => void;
    initialData?: any;
}

const STEPS = [
    { id: 1, title: 'Profile Type', icon: Building2 },
    { id: 2, title: 'Market Niche', icon: Target },
    { id: 3, title: 'Target Audience', icon: User },
    { id: 4, title: 'Digital Presence', icon: Globe },
    { id: 5, title: 'Product Vision', icon: Sparkles },
];

export default function BrandOnboarding({ onClose, onComplete, initialData }: BrandOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [analyzingURL, setAnalyzingURL] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzingProduct, setAnalyzingProduct] = useState(false);
    const [pendingCompetitor, setPendingCompetitor] = useState('');

    const [formData, setFormData] = useState({
        entity_type: 'brand',
        company_name: '',
        industry: '',
        mission_brief: '',
        target_age_groups: [] as string[],
        competitors: [] as string[],
        social_links: {
            website: '',
            instagram: '',
            tiktok: '',
            twitter: ''
        },
        visual_aesthetic: '',
        content_samples: [] as string[],
        tone_voice: 'Authentic & Bold',
        title: '', // Strategy Label
        logo_url: '',
        product_analysis: [] as any[]
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                social_links: { ...prev.social_links, ...(initialData.social_links || {}) }
            }));
        }
    }, [initialData]);

    const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const updateNestedSocial = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            social_links: { ...prev.social_links, [field]: value }
        }));
    };

    const toggleAgeGroup = (age: string) => {
        setFormData(prev => ({
            ...prev,
            target_age_groups: prev.target_age_groups.includes(age)
                ? prev.target_age_groups.filter(a => a !== age)
                : [...prev.target_age_groups, age]
        }));
    };

    const handleAnalyzeURL = async () => {
        if (!formData.social_links.website) return;
        setAnalyzingURL(true);
        try {
            const res = await fetch('/api/ai/brand-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: formData.social_links.website })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setFormData(prev => ({
                ...prev,
                company_name: data.company_name || prev.company_name,
                industry: data.industry || prev.industry,
                mission_brief: data.mission_brief || prev.mission_brief,
                tone_voice: data.tone_voice || prev.tone_voice,
                visual_aesthetic: data.visual_aesthetic || prev.visual_aesthetic,
                competitors: data.competitors ? [...new Set([...prev.competitors, ...data.competitors])] : prev.competitors
            }));
        } catch (err) {
            console.error("Analysis failed:", err);
        } finally {
            setAnalyzingURL(false);
        }
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
            setFormData(prev => ({ ...prev, logo_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading logo:', error);
            alert('Logo upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const handleProductVision = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setAnalyzingProduct(true);
        try {
            // 1. Convert to Base64
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onload = () => resolve(reader.result?.toString().split(',')[1]);
                reader.readAsDataURL(file);
            });
            const imageBase64 = await base64Promise;

            // 2. Analyze using Multimodal API
            const res = await fetch('/api/ai/product-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64, mimeType: file.type })
            });

            const analysis = await res.json();
            if (!res.ok) throw new Error(analysis.error);

            // 3. Add to product_analysis state
            setFormData(prev => ({
                ...prev,
                product_analysis: [...prev.product_analysis, { ...analysis, id: Date.now() }]
            }));

            // Proactively update other fields if they are empty
            if (!formData.industry || !formData.visual_aesthetic) {
                setFormData(prev => ({
                    ...prev,
                    visual_aesthetic: prev.visual_aesthetic || (analysis.visual_dna ? analysis.visual_dna[0] : ''),
                    tone_voice: prev.tone_voice === 'Authentic & Bold' ? (analysis.brand_vibe || prev.tone_voice) : prev.tone_voice
                }));
            }

        } catch (err) {
            console.error("Vision analysis failed:", err);
            alert("Failed to analyze product image.");
        } finally {
            setAnalyzingProduct(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="flex gap-4">
                            <button
                                onClick={() => setFormData({ ...formData, entity_type: 'brand' })}
                                className={`flex-1 p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 ${formData.entity_type === 'brand' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10'}`}
                            >
                                <div className="relative group/logo">
                                    <div className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${formData.entity_type === 'brand' ? 'border-emerald-500/50' : 'border-white/10'}`}>
                                        {uploading ? (
                                            <Loader2 className="animate-spin text-emerald-500" size={24} />
                                        ) : formData.logo_url ? (
                                            <img src={formData.logo_url} className="w-full h-full object-cover" alt="Logo" />
                                        ) : (
                                            <Building2 size={32} className={formData.entity_type === 'brand' ? 'text-emerald-500' : 'text-zinc-500'} />
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoUpload} />
                                    </div>
                                    {!formData.logo_url && !uploading && (
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black p-1.5 rounded-lg shadow-lg opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                            <Plus size={12} />
                                        </div>
                                    )}
                                </div>
                                <span className="font-black italic uppercase tracking-tighter">I am a Brand</span>
                            </button>
                            <button
                                onClick={() => setFormData({ ...formData, entity_type: 'person' })}
                                className={`flex-1 p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-4 ${formData.entity_type === 'person' ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'bg-white/5 border-white/10'}`}
                            >
                                <div className="relative group/logo">
                                    <div className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${formData.entity_type === 'person' ? 'border-emerald-500/50' : 'border-white/10'}`}>
                                        {uploading ? (
                                            <Loader2 className="animate-spin text-emerald-500" size={24} />
                                        ) : formData.logo_url ? (
                                            <img src={formData.logo_url} className="w-full h-full object-cover" alt="Logo" />
                                        ) : (
                                            <User size={32} className={formData.entity_type === 'person' ? 'text-emerald-500' : 'text-zinc-500'} />
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleLogoUpload} />
                                    </div>
                                    {!formData.logo_url && !uploading && (
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-black p-1.5 rounded-lg shadow-lg opacity-0 group-hover/logo:opacity-100 transition-opacity">
                                            <Plus size={12} />
                                        </div>
                                    )}
                                </div>
                                <span className="font-black italic uppercase tracking-tighter">I am a Creator</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Brand / Channel Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-emerald-500 transition-all font-sans"
                                    placeholder="Enter name..."
                                    value={formData.company_name}
                                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Strategy Label</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-emerald-500 transition-all font-sans"
                                    placeholder="e.g. Q1 Marketing, 2026 Vibe..."
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Industry Segment</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-emerald-500 transition-all"
                                placeholder="e.g. Streetwear, Tech, Well-being..."
                                value={formData.industry}
                                onChange={e => setFormData({ ...formData, industry: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Competitors (Press Enter or click +)</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-emerald-500 transition-all pr-16"
                                    placeholder="Add competitor name..."
                                    value={pendingCompetitor}
                                    onChange={e => setPendingCompetitor(e.target.value)}
                                    onBlur={() => {
                                        const val = pendingCompetitor.trim();
                                        if (val && !formData.competitors.includes(val)) {
                                            setFormData({ ...formData, competitors: [...formData.competitors, val] });
                                            setPendingCompetitor('');
                                        }
                                    }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const val = pendingCompetitor.trim();
                                            if (val && !formData.competitors.includes(val)) {
                                                setFormData({ ...formData, competitors: [...formData.competitors, val] });
                                                setPendingCompetitor('');
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        const val = pendingCompetitor.trim();
                                        if (val && !formData.competitors.includes(val)) {
                                            setFormData({ ...formData, competitors: [...formData.competitors, val] });
                                            setPendingCompetitor('');
                                        }
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black p-2 rounded-xl transition-all"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4 ml-4">
                                {formData.competitors.map(c => (
                                    <span key={c} className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[10px] font-mono uppercase flex items-center gap-2 group">
                                        {c}
                                        <X size={12} className="cursor-pointer hover:text-red-500 transition-colors" onClick={() => setFormData({ ...formData, competitors: formData.competitors.filter(x => x !== c) })} />
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="space-y-4">
                            <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest text-center block">Target Generation</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Generation Alpha', 'Early Gen Z', 'Late Gen Z / Zillennial'].map(age => (
                                    <button
                                        key={age}
                                        onClick={() => toggleAgeGroup(age)}
                                        className={`p-4 rounded-2xl border text-[10px] font-mono uppercase transition-all ${formData.target_age_groups.includes(age) ? 'bg-emerald-500 text-black border-emerald-500 font-bold' : 'bg-white/5 border-white/10 text-zinc-500 hover:border-white/20'}`}
                                    >
                                        {age}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Voice Archetype</label>
                            <div className="grid grid-cols-2 gap-3">
                                {['Authentic & Bold', 'Sophisticated & Minimal', 'High-Energy & Chaotic', 'Dark & Cinematic'].map(tone => (
                                    <button
                                        key={tone}
                                        onClick={() => setFormData({ ...formData, tone_voice: tone })}
                                        className={`p-4 rounded-2xl border text-[10px] font-mono uppercase transition-all ${formData.tone_voice === tone ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-white/5 border-white/10 text-zinc-500'}`}
                                    >
                                        {tone}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest">Vision / Mission</label>
                            <textarea
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 text-sm outline-none focus:border-emerald-500 transition-all resize-none italic"
                                placeholder="What is your brand's core mission?..."
                                value={formData.mission_brief}
                                onChange={e => setFormData({ ...formData, mission_brief: e.target.value })}
                            />
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-6"
                    >
                        <div className="relative group">
                            <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-hover:text-emerald-500" size={18} />
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-28 text-sm outline-none focus:border-emerald-500 transition-all"
                                placeholder="Primary Website URL..."
                                value={formData.social_links.website}
                                onChange={e => updateNestedSocial('website', e.target.value)}
                            />
                            <button
                                onClick={handleAnalyzeURL}
                                disabled={analyzingURL || !formData.social_links.website}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-black px-4 py-2.5 rounded-xl text-[9px] font-black uppercase italic tracking-tighter hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {analyzingURL ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                Auto-Analyze
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-emerald-500 transition-all font-mono placeholder:font-sans"
                                    placeholder="@handle"
                                    value={formData.social_links.instagram}
                                    onChange={e => updateNestedSocial('instagram', e.target.value)}
                                />
                            </div>
                            <div className="relative">
                                <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-emerald-500 transition-all font-mono placeholder:font-sans"
                                    placeholder="@handle"
                                    value={formData.social_links.twitter}
                                    onChange={e => updateNestedSocial('twitter', e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-zinc-500 ml-4 tracking-widest text-center block">Visual Aesthetic Core</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-emerald-500 transition-all text-center italic"
                                placeholder="e.g. Y2K Cyberpunk, Lux-Minimalist..."
                                value={formData.visual_aesthetic}
                                onChange={e => setFormData({ ...formData, visual_aesthetic: e.target.value })}
                            />
                        </div>
                    </motion.div>
                );
            case 5:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="space-y-8"
                    >
                        <div className="flex flex-col items-center">
                            <label className="relative group cursor-pointer w-full">
                                <div className="h-48 w-full rounded-[2.5rem] bg-emerald-500/5 border-2 border-dashed border-emerald-500/20 flex flex-col items-center justify-center overflow-hidden group-hover:bg-emerald-500/10 group-hover:border-emerald-500/50 transition-all duration-500">
                                    {analyzingProduct ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-emerald-500" size={40} />
                                            <span className="text-[10px] font-mono uppercase text-emerald-500 animate-pulse tracking-widest">AI Vision Analyzing...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-4 bg-emerald-500/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                                <Plus className="text-emerald-500" size={32} />
                                            </div>
                                            <span className="font-black italic uppercase tracking-tighter text-white">Upload Product Shot</span>
                                            <span className="text-[9px] font-mono uppercase text-zinc-500 mt-2">Gemini will scan aesthetic & vibe</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleProductVision} disabled={analyzingProduct} />
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            {formData.product_analysis.map((prod: any) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={prod.id}
                                    className="bg-white/5 border border-white/10 rounded-3xl p-6 relative group"
                                >
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, product_analysis: prev.product_analysis.filter(p => p.id !== prod.id) }))}
                                        className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="font-black italic uppercase tracking-tighter text-emerald-500">{prod.product_name}</h4>
                                            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-relaxed mt-1">
                                                {prod.brand_vibe}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {prod.visual_dna?.map((dna: string) => (
                                            <span key={dna} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[9px] font-mono uppercase text-zinc-400">
                                                {dna}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-4xl bg-[#080808] border border-white/10 rounded-[4rem] flex flex-col md:flex-row h-[90vh] md:h-[80vh] overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.1)] relative"
            >
                <button onClick={onClose} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors z-[110]">
                    <X size={24} />
                </button>

                {/* Sidebar */}
                <div className="md:w-1/3 bg-zinc-950/50 p-12 border-r border-white/5 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -mr-32 -mt-32" />

                    <div className="relative z-10">
                        <h2 className="text-4xl font-black italic uppercase text-emerald-500 mb-12 tracking-tighter leading-none">
                            Brand <br /> <span className="text-white">Identity</span> <br /> Forge
                        </h2>

                        <div className="space-y-8">
                            {STEPS.map((step) => (
                                <div key={step.id} className="flex items-center gap-4 group">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all duration-500 ${currentStep >= step.id ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 border-white/10 text-zinc-700'}`}>
                                        <step.icon size={18} />
                                    </div>
                                    <div>
                                        <p className={`text-[8px] font-mono uppercase tracking-widest ${currentStep >= step.id ? 'text-emerald-500' : 'text-zinc-700'}`}>Step 0{step.id}</p>
                                        <p className={`text-[11px] font-black uppercase italic ${currentStep >= step.id ? 'text-white' : 'text-zinc-500'}`}>{step.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 pt-12 border-t border-white/5">
                        <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest leading-relaxed italic">
                            "We are building a surgical data layer of your brand identity to hack the culture algorithm."
                        </p>
                    </div>
                </div>

                {/* Form Area */}
                <div className="flex-1 p-12 overflow-y-auto flex flex-col justify-between bg-[radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.05),transparent_60%)]">
                    <div className="max-w-xl mx-auto w-full">
                        <header className="mb-12 text-center md:text-left">
                            <h3 className="text-2xl font-black italic uppercase text-white mb-2 tracking-tighter">
                                {STEPS[currentStep - 1].title}
                            </h3>
                            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
                                Deep Context Protocol {currentStep}/{STEPS.length}
                            </p>
                        </header>

                        <AnimatePresence mode="wait">
                            {renderStep()}
                        </AnimatePresence>
                    </div>

                    <footer className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center max-w-xl mx-auto w-full">
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-all disabled:opacity-0"
                        >
                            <ChevronLeft size={20} />
                            <span className="text-[10px] font-mono uppercase tracking-widest">Back</span>
                        </button>

                        <div className="flex gap-4">
                            {currentStep < STEPS.length ? (
                                <button
                                    onClick={handleNext}
                                    className="bg-emerald-500 text-black px-10 py-5 rounded-2xl flex items-center gap-3 hover:bg-emerald-400 transition-all group"
                                >
                                    <span className="font-black uppercase italic tracking-tighter">Continue Integration</span>
                                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => onComplete(formData)}
                                    className="bg-emerald-500 text-black px-12 py-5 rounded-2xl flex items-center gap-3 hover:bg-emerald-400 transition-all font-black uppercase italic tracking-tighter shadow-[0_10px_30px_rgba(16,185,129,0.3)]"
                                >
                                    Commit Brand to Hub
                                    <Zap size={18} fill="currentColor" />
                                </button>
                            )}
                        </div>
                    </footer>
                </div>
            </motion.div>
        </div>
    );
}
