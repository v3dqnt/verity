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
    Upload,
    Video,
    Users,
    Clapperboard,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Shield,
    Lock as LucideLock
} from 'lucide-react';

interface BrandOnboardingProps {
    onClose: () => void;
    onComplete: (data: any) => void;
    initialData?: any;
}

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const itemSlide = {
    hidden: { opacity: 0, y: 15 },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 15
        }
    }
};

export default function BrandOnboarding({ onClose, onComplete, initialData }: BrandOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [analyzingURL, setAnalyzingURL] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analyzingProduct, setAnalyzingProduct] = useState(false);
    const [pendingCompetitor, setPendingCompetitor] = useState('');

    const [formData, setFormData] = useState({
        entity_type: 'brand' as 'brand' | 'creator',
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
        tone_voice: '',
        tone_extra_instructions: '',
        title: '', // Strategy Label
        logo_url: '',
        product_analysis: [] as any[],

        // ADVANCED FIELDS
        tagline: '',
        vision: '',
        values: [] as string[],
        personality: [] as string[],
        archetype: '',
        positioning: '',

        voice_traits: [] as string[],
        do_say: [] as string[],
        dont_say: [] as string[],
        humor_style: '',
        slang_level: 3,
        emoji_usage: 2,

        legal_constraints: [] as string[],
        sensitive_topics: [] as string[],
        banned_topics: [] as string[],
        brand_summary: '',

        // CREATOR SPECIFIC (Expansion)
        creator_stage: '', // Beginner, Growth, Established
        goals: [] as string[],
        catchphrases: [] as string[],
        persona_name: '',
        pain_points: [] as string[],
        awareness_level: '',
        language_style: '',
        objections: [] as string[],
        content_they_skip: [] as string[],
        content_pillars: [] as any[], // {name, objective, examples}
        offers: [] as any[], // {name, type, value_prop, price_tier}
        on_screen_presence: '',
        visual_refs: [] as string[],
        no_go_visuals: [] as string[],
        preferred_brand_types: [] as string[],
        personal_boundaries: [] as string[]
    });

    const [isFinalizing, setIsFinalizing] = useState(false);

    const themeColor = formData.entity_type === 'brand' ? 'emerald' : 'violet';
    const themeBg = formData.entity_type === 'brand' ? 'bg-emerald-500' : 'bg-violet-500';
    const themeText = formData.entity_type === 'brand' ? 'text-emerald-500' : 'text-violet-500';
    const themeBorder = formData.entity_type === 'brand' ? 'border-emerald-500' : 'border-violet-500';

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                ...initialData,
                social_links: { ...prev.social_links, ...(initialData.social_links || {}) }
            }));
            // Skip entity_type selection (step 1) when editing — it's already set
            setCurrentStep(2);
        }
    }, [initialData]);

    const TOTAL_STEPS = 18;

    const handleNext = () => {
        if (currentStep === 16 && formData.entity_type === 'brand') {
            setCurrentStep(18);
        } else if (currentStep === 3) {
            setCurrentStep(5); // Skip step 4 (Strategy Label — removed)
        } else {
            setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
        }
    };

    const handleBack = () => {
        if (currentStep === 18 && formData.entity_type === 'brand') {
            setCurrentStep(16);
        } else if (currentStep === 5) {
            setCurrentStep(3); // Skip step 4 (Strategy Label — removed)
        } else {
            setCurrentStep(prev => Math.max(prev - 1, 1));
        }
    };

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
        const hasLink = formData.social_links.website ||
            formData.social_links.instagram ||
            formData.social_links.tiktok ||
            formData.social_links.twitter;

        if (!hasLink) return;
        setAnalyzingURL(true);
        try {
            const res = await fetch('/api/ai/brand-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: formData.social_links.website,
                    social_links: formData.social_links,
                    entity_type: formData.entity_type
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setFormData(prev => {
                const sanitizedName = data.company_name
                    ? data.company_name.replace(/https?:\/\/\S+/g, '').replace(/\[\d+\]/g, '').replace(/\[.*?\]/g, '').trim()
                    : prev.company_name;

                return {
                    ...prev,
                    company_name: sanitizedName,
                    industry: data.industry || prev.industry,
                    mission_brief: data.mission_brief || prev.mission_brief,
                    tone_voice: data.tone_voice || prev.tone_voice,
                    visual_aesthetic: data.visual_aesthetic || prev.visual_aesthetic,
                    competitors: data.competitors ? [...new Set([...prev.competitors, ...data.competitors])] : prev.competitors,
                    // Creator Mapping
                    creator_stage: data.creator_stage || prev.creator_stage,
                    goals: data.goals || prev.goals,
                    humor_style: data.humor_style || prev.humor_style,
                    on_screen_presence: data.on_screen_presence || prev.on_screen_presence,
                    personality: data.personality || prev.personality
                };
            });
            handleNext();
        } catch (err) {
            console.error("Analysis failed:", err);
        } finally {
            setAnalyzingURL(false);
        }
    };

    const handleFinish = async () => {
        setIsFinalizing(true);
        try {
            await onComplete(formData);
        } catch (err) {
            console.error("Finalization failed:", err);
            setIsFinalizing(false);
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
            const reader = new FileReader();
            const base64Promise = new Promise((resolve) => {
                reader.onload = () => resolve(reader.result?.toString().split(',')[1]);
                reader.readAsDataURL(file);
            });
            const imageBase64 = await base64Promise;

            const res = await fetch('/api/ai/product-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageBase64, mimeType: file.type })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const analysis = data;
            setFormData(prev => ({
                ...prev,
                product_analysis: [...prev.product_analysis, { ...analysis, id: Date.now() }]
            }));

            if (!formData.industry || !formData.visual_aesthetic) {
                setFormData(prev => ({
                    ...prev,
                    visual_aesthetic: prev.visual_aesthetic || (analysis.visual_dna ? analysis.visual_dna[0] : ''),
                    tone_voice: prev.tone_voice === '' ? (analysis.brand_vibe || prev.tone_voice) : prev.tone_voice
                }));
            }
        } catch (err) {
            console.error("Vision analysis failed:", err);
        } finally {
            setAnalyzingProduct(false);
        }
    };

    const renderQuestion = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-12">
                        <motion.h2 variants={itemSlide} className="text-6xl font-black italic uppercase tracking-tighter text-white">
                            First, who are you?
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Select your path. Are you building a corporate identity or a personal creative brand?
                        </motion.p>
                        <motion.div variants={itemSlide} className="flex gap-8 justify-center">
                            <button
                                onClick={() => { setFormData({ ...formData, entity_type: 'brand' }); handleNext(); }}
                                className={`group relative w-72 p-12 rounded-[3.5rem] border transition-all duration-500 ${formData.entity_type === 'brand' ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/10 hover:border-emerald-500 hover:bg-emerald-500/10'}`}
                            >
                                <Building2 size={56} className={`mx-auto mb-6 transition-colors ${formData.entity_type === 'brand' ? 'text-emerald-500' : 'text-zinc-500 group-hover:text-emerald-500'}`} />
                                <span className={`block font-black italic uppercase tracking-tighter text-2xl ${formData.entity_type === 'brand' ? 'text-emerald-500' : 'text-white group-hover:text-emerald-500'}`}>I am a Brand</span>
                            </button>
                            <button
                                onClick={() => { setFormData({ ...formData, entity_type: 'creator' }); handleNext(); }}
                                className={`group relative w-72 p-12 rounded-[3.5rem] border transition-all duration-500 ${formData.entity_type === 'creator' ? 'bg-violet-500/10 border-violet-500' : 'bg-white/5 border-white/10 hover:border-violet-500 hover:bg-violet-500/10'}`}
                            >
                                <User size={56} className={`mx-auto mb-6 transition-colors ${formData.entity_type === 'creator' ? 'text-violet-500' : 'text-zinc-500 group-hover:text-violet-500'}`} />
                                <span className={`block font-black italic uppercase tracking-tighter text-2xl ${formData.entity_type === 'creator' ? 'text-violet-500' : 'text-white group-hover:text-violet-500'}`}>I am a Creator</span>
                            </button>
                        </motion.div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            Digital Presence Hub
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Enter your digital headquarters. Providing a link allows our AI to automatically sync your brand's core data.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-2xl mx-auto space-y-6">
                            <div className="relative group">
                                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={24} />
                                <input
                                    autoFocus
                                    type="text"
                                    className={`w-full bg-white/5 border border-white/10 rounded-full py-6 pl-16 pr-40 text-lg text-white outline-none focus:${themeBorder} transition-all shadow-2xl`}
                                    placeholder="Website / Link-in-bio URL..."
                                    value={formData.social_links.website}
                                    onChange={e => updateNestedSocial('website', e.target.value)}
                                />
                                <button
                                    onClick={handleAnalyzeURL}
                                    disabled={analyzingURL || !(formData.social_links.website || formData.social_links.instagram || formData.social_links.tiktok || formData.social_links.twitter)}
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${themeBg} text-black px-8 py-3 rounded-full font-black uppercase italic text-[11px] tracking-widest disabled:opacity-50 flex items-center gap-2`}
                                >
                                    {analyzingURL ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                    AI Sync
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="relative">
                                    <Instagram className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                                    <input
                                        type="text"
                                        className={`w-full bg-white/5 border border-white/10 rounded-full py-5 pl-14 pr-4 text-white outline-none focus:${themeBorder} transition-all text-sm`}
                                        placeholder="Instagram"
                                        value={formData.social_links.instagram}
                                        onChange={e => updateNestedSocial('instagram', e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <Video className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                                    <input
                                        type="text"
                                        className={`w-full bg-white/5 border border-white/10 rounded-full py-5 pl-14 pr-4 text-white outline-none focus:${themeBorder} transition-all text-sm`}
                                        placeholder="TikTok"
                                        value={formData.social_links.tiktok}
                                        onChange={e => updateNestedSocial('tiktok', e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <Twitter className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                                    <input
                                        type="text"
                                        className={`w-full bg-white/5 border border-white/10 rounded-full py-5 pl-14 pr-4 text-white outline-none focus:${themeBorder} transition-all text-sm`}
                                        placeholder="Twitter"
                                        value={formData.social_links.twitter}
                                        onChange={e => updateNestedSocial('twitter', e.target.value)}
                                    />
                                </div>
                            </div>
                        </motion.div>
                        <motion.button onClick={handleNext} className="mt-4 px-8 py-3 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:border-white/30 hover:bg-white/10 hover:text-white transition-all">Skip and Manual Entry</motion.button>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            {formData.entity_type === 'brand' ? "What's the brand name?" : "What's your creator handle?"}
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            {formData.entity_type === 'brand'
                                ? "What is the official name of this entity? This will be used in all generated strategies."
                                : "How are you known online? This handle will be the face of your strategic fingerprint."
                            }
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-md mx-auto">
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-transparent border-none text-4xl font-black italic uppercase tracking-tighter text-center text-white outline-none placeholder:text-zinc-600 placeholder:text-xl"
                                placeholder="Type here..."
                                value={formData.company_name}
                                onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && formData.company_name && handleNext()}
                            />
                        </motion.div>
                        {formData.company_name && (
                            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter flex items-center gap-2 mx-auto`}>
                                Continue <ArrowRight size={18} />
                            </motion.button>
                        )}
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            Strategy Label?
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Create a memorable tag for this strategy profile to help you organize different campaign directions.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-md mx-auto">
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-transparent border-none text-4xl font-black italic uppercase tracking-tighter text-center text-white outline-none placeholder:text-zinc-600 placeholder:text-xl"
                                placeholder="e.g. 2026 Core"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && formData.title && handleNext()}
                            />
                        </motion.div>
                        <p className="text-[10px] font-mono uppercase text-zinc-500">Internal name for this profile</p>
                        {formData.title && (
                            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter flex items-center gap-2 mx-auto`}>
                                Continue <ArrowRight size={18} />
                            </motion.button>
                        )}
                    </motion.div>
                );
            case 5:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            {formData.entity_type === 'brand' ? "Industry / Niche?" : "Niche Territory?"}
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            {formData.entity_type === 'brand'
                                ? "Define your market territory. This narrowed focus helps our AI understand your specific competitive landscape."
                                : "What do you talk about? AI Tools, Fitness, Travel? This defines your authority zone."
                            }
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-4xl mx-auto px-6">
                            <div className="relative group">
                                <div className={`absolute -inset-1 bg-gradient-to-r ${formData.entity_type === 'brand' ? 'from-emerald-500/20 to-teal-500/20' : 'from-violet-500/20 to-purple-500/20'} rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200`}></div>
                                <textarea
                                    autoFocus
                                    rows={2}
                                    className={`relative w-full bg-white/5 border border-white/10 rounded-[3rem] p-12 text-3xl font-black italic uppercase tracking-tighter text-center text-white outline-none focus:${themeBorder} transition-all placeholder:text-zinc-600 placeholder:text-xs placeholder:font-mono placeholder:uppercase placeholder:tracking-[0.3em] placeholder:not-italic resize-none overflow-hidden leading-tight shadow-2xl backdrop-blur-3xl`}
                                    placeholder="Niche Identity"
                                    value={formData.industry}
                                    onChange={e => setFormData({ ...formData, industry: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (formData.industry) handleNext();
                                        }
                                    }}
                                />
                            </div>
                        </motion.div>
                        {formData.industry && (
                            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter flex items-center gap-2 mx-auto`}>
                                Continue <ArrowRight size={18} />
                            </motion.button>
                        )}
                    </motion.div>
                );
            case 6:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            {formData.entity_type === 'brand' ? "Competitors?" : "Inspirations?"}
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Who else is in the room? Adding competitors or inspirations allows the Forge to map your unique positioning.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-md mx-auto">
                            <div className="flex flex-wrap gap-2 justify-center mb-6">
                                {formData.competitors.map(c => (
                                    <span key={c} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white text-[10px] uppercase font-mono flex items-center gap-2">
                                        {c}
                                        <X size={12} className="cursor-pointer text-zinc-500 hover:text-red-500" onClick={() => setFormData({ ...formData, competitors: formData.competitors.filter(x => x !== c) })} />
                                    </span>
                                ))}
                            </div>
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-transparent border-none text-2xl font-black italic uppercase tracking-tighter text-center text-white outline-none placeholder:text-zinc-800"
                                placeholder="Type & Press Enter..."
                                value={pendingCompetitor}
                                onChange={e => setPendingCompetitor(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && pendingCompetitor.trim()) {
                                        setFormData({ ...formData, competitors: [...formData.competitors, pendingCompetitor.trim()] });
                                        setPendingCompetitor('');
                                    } else if (e.key === 'Enter' && !pendingCompetitor) {
                                        handleNext();
                                    }
                                }}
                            />
                        </motion.div>
                        <motion.button onClick={handleNext} className="mt-4 px-8 py-3 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:border-white/30 hover:bg-white/10 hover:text-white transition-all">Skip / Done</motion.button>
                    </motion.div>
                );
            case 7:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            Target Audience?
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Who are we talking to? Select the primary generational groups that represent your core community.
                        </motion.p>
                        <motion.div variants={itemSlide} className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                            {['Generation Alpha', 'Early Gen Z', 'Late Gen Z / Zillennial', 'Millennial Core'].map(age => (
                                <button
                                    key={age}
                                    onClick={() => toggleAgeGroup(age)}
                                    className={`p-6 rounded-[2rem] border transition-all ${formData.target_age_groups.includes(age) ? `${themeBg} text-black font-black scale-[0.98]` : 'bg-white/5 border-white/10 text-zinc-500'}`}
                                >
                                    <span className="text-[11px] font-mono uppercase tracking-widest">{age}</span>
                                </button>
                            ))}
                        </motion.div>
                        <button onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter mx-auto`}>Continue</button>
                    </motion.div>
                );
            case 8:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            What's the vibe?
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Select the emotional resonance of your brand. This dictates the personality of all generated content.
                        </motion.p>
                        <motion.div variants={itemSlide} className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                            {['Authentic & Bold', 'Sophisticated & Minimal', 'High-Energy & Chaotic', 'Dark & Cinematic'].map(tone => (
                                <button
                                    key={tone}
                                    onClick={() => setFormData({ ...formData, tone_voice: tone })}
                                    className={`p-6 rounded-[2rem] border transition-all ${formData.tone_voice === tone ? `${themeBg} text-black font-black scale-[0.98]` : 'bg-white/5 border-white/10 text-zinc-500'}`}
                                >
                                    <span className="text-[11px] font-mono uppercase tracking-widest">{tone}</span>
                                </button>
                            ))}
                        </motion.div>

                        <motion.div variants={itemSlide} className="max-w-xl mx-auto mt-8">
                            <input
                                type="text"
                                className={`w-full bg-white/5 border border-white/10 rounded-full py-5 px-10 text-white outline-none focus:${themeBorder} transition-all text-center`}
                                placeholder="Any specific instructions for the vibe? (Optional)"
                                value={formData.tone_extra_instructions}
                                onChange={e => setFormData({ ...formData, tone_extra_instructions: e.target.value })}
                            />
                        </motion.div>

                        {formData.tone_voice && (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                onClick={handleNext}
                                className={`mt-8 px-12 py-5 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter flex items-center gap-2 mx-auto shadow-2xl hover:scale-105 transition-transform`}
                            >
                                Continue <ArrowRight size={20} />
                            </motion.button>
                        )}
                    </motion.div>
                );
            case 9:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            Mission Philosophy?
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            What is the core reason for your existence? A strong mission brief acts as the North Star for your digital strategy.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-4xl mx-auto px-6">
                            <div className="relative group">
                                <div className={`absolute -inset-2 bg-gradient-to-br ${formData.entity_type === 'brand' ? 'from-emerald-600/10 to-teal-400/10' : 'from-violet-600/10 to-purple-400/10'} rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition duration-1000`}></div>
                                <textarea
                                    autoFocus
                                    rows={6}
                                    className={`relative w-full bg-white/5 border border-white/10 rounded-[3rem] p-12 text-2xl font-black italic uppercase tracking-tighter text-center text-white outline-none focus:${themeBorder} transition-all placeholder:text-zinc-600 placeholder:text-xs placeholder:font-mono placeholder:uppercase placeholder:tracking-[0.3em] placeholder:not-italic resize-none overflow-hidden leading-tight shadow-2xl backdrop-blur-3xl`}
                                    placeholder="Mission Philosophy"
                                    value={formData.mission_brief}
                                    onChange={e => setFormData({ ...formData, mission_brief: e.target.value })}
                                />
                            </div>
                        </motion.div>
                        <button onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter mx-auto`}>Continue</button>
                    </motion.div>
                );
            case 10:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            {formData.entity_type === 'brand' ? "Visual Aesthetic?" : "Visual Identity?"}
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            {formData.entity_type === 'brand'
                                ? "Define the visual soul of your brand in a few keywords. Think of this as your aesthetic mood board."
                                : "How do you present on-screen? Minimal, Chaotic, Cinematic? This defines your presence."
                            }
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-4xl mx-auto px-6">
                            <div className="relative group">
                                <div className={`absolute -inset-2 bg-gradient-to-br ${formData.entity_type === 'brand' ? 'from-emerald-600/10 to-teal-400/10' : 'from-violet-600/10 to-purple-400/10'} rounded-[3rem] blur-3xl opacity-0 group-hover:opacity-100 transition duration-1000`}></div>
                                <textarea
                                    autoFocus
                                    rows={4}
                                    className={`relative w-full bg-white/5 border border-white/10 rounded-[3rem] p-12 text-3xl font-black italic uppercase tracking-tighter text-center text-white outline-none focus:${themeBorder} transition-all placeholder:text-zinc-600 placeholder:text-xs placeholder:font-mono placeholder:uppercase placeholder:tracking-[0.3em] placeholder:not-italic resize-none overflow-hidden leading-tight shadow-2xl backdrop-blur-3xl`}
                                    placeholder="Visual Aesthetic"
                                    value={formData.visual_aesthetic}
                                    onChange={e => setFormData({ ...formData, visual_aesthetic: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (formData.visual_aesthetic) handleNext();
                                        }
                                    }}
                                />
                            </div>
                        </motion.div>
                        <p className="text-[10px] font-mono uppercase text-zinc-500 hover:text-white transition-colors">Describe the look</p>
                        {formData.visual_aesthetic && (
                            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter flex items-center gap-2 mx-auto`}>
                                Continue <ArrowRight size={18} />
                            </motion.button>
                        )}
                    </motion.div>
                );
            case 11:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-12">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            Identify Your Mark
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            A visual anchor for your profile. Upload your logo to brand your personalized dashboard and reports.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-xl mx-auto">
                            <label className="relative group cursor-pointer block">
                                <div className={`h-64 rounded-[3rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden hover:bg-white/10 hover:${themeBorder} transition-all duration-500`}>
                                    {uploading ? (
                                        <Loader2 className={`animate-spin ${themeText}`} size={48} />
                                    ) : formData.logo_url ? (
                                        <img src={formData.logo_url} className="w-full h-full object-contain p-8" alt="Logo" />
                                    ) : (
                                        <>
                                            <Upload className="text-zinc-500 mb-4" size={48} />
                                            <span className="font-black italic uppercase tracking-tighter text-xl text-white">Upload Logo</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                            </label>
                        </motion.div>
                        <button onClick={handleNext} className={`px-12 py-5 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter mx-auto`}>Continue</button>
                    </motion.div>
                );
            case 12:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-12">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            Aesthetic DNA Scan
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            The final scan. Upload a reference image—product, content, or mood board—to extract deep visual DNA.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-xl mx-auto">
                            <label className="relative group cursor-pointer block">
                                <div className={`h-64 rounded-[3rem] bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden hover:bg-white/10 hover:${themeBorder} transition-all duration-500`}>
                                    {analyzingProduct ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className={`animate-spin ${themeText}`} size={48} />
                                            <span className="text-[10px] font-mono text-white animate-pulse uppercase tracking-widest">DNA Scanning...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="text-zinc-500 mb-4" size={48} />
                                            <span className="font-black italic uppercase tracking-tighter text-xl text-white">Upload Ref Image</span>
                                        </>
                                    )}
                                </div>
                                <input type="file" className="hidden" accept="image/*" onChange={handleProductVision} disabled={analyzingProduct} />
                            </label>
                        </motion.div>
                        <button
                            onClick={handleNext}
                            className={`mt-8 px-12 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter text-xl shadow-xl flex items-center gap-4 mx-auto hover:scale-105 transition-all active:scale-95`}
                        >
                            Review DNA <ArrowRight size={20} />
                        </button>
                    </motion.div>
                );
            case 13:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-8">
                        <div className="text-center space-y-2">
                            <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                                Intelligence Briefing
                            </motion.h2>
                            <motion.p variants={itemSlide} className="text-zinc-500 text-xs font-medium lowercase tracking-widest italic">
                                basics are locked. how the forge perceives you:
                            </motion.p>
                        </div>

                        <motion.div variants={itemSlide} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                            {/* Summary Card */}
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl space-y-6 text-left relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 w-48 h-48 ${formData.entity_type === 'brand' ? 'bg-emerald-500/10' : 'bg-violet-500/10'} blur-[80px] -mr-24 -mt-24`} />

                                <div className="space-y-4 relative z-10">
                                    <div>
                                        <label className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Identity</label>
                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-tight">{formData.company_name}</h3>
                                        <p className="text-zinc-400 text-xs italic">{formData.tagline || 'Strategic Identity Established'}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Territory</label>
                                            <p className={`text-[11px] font-bold uppercase ${themeText}`}>{formData.industry}</p>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Vibe</label>
                                            <p className="text-[11px] font-bold uppercase text-white">{formData.tone_voice}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Philosophy</label>
                                        <p className="text-zinc-500 text-[11px] leading-relaxed mt-1 line-clamp-2 italic">"{formData.mission_brief}"</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Area */}
                            <div className="space-y-4 flex flex-col justify-center">
                                <button
                                    onClick={handleFinish}
                                    disabled={isFinalizing}
                                    className={`group w-full p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left flex items-center justify-between ${isFinalizing ? 'opacity-50 cursor-wait' : ''}`}
                                >
                                    <div>
                                        <span className="block font-black italic uppercase tracking-tighter text-xl text-white">
                                            {isFinalizing ? 'Encrypting DNA...' : 'Commit to Vault'}
                                        </span>
                                        <span className="text-[9px] font-mono text-zinc-600 block mt-0.5 uppercase">Basics are enough for now</span>
                                    </div>
                                    {isFinalizing ? (
                                        <Loader2 size={24} className="animate-spin text-white" />
                                    ) : (
                                        <CheckCircle2 size={24} className="text-zinc-700 group-hover:text-white transition-colors" />
                                    )}
                                </button>

                                <button
                                    onClick={handleNext}
                                    className={`group w-full p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:${themeBorder} hover:${formData.entity_type === 'brand' ? 'bg-emerald-500/10' : 'bg-violet-500/10'} transition-all text-left flex items-center justify-between border-dashed`}
                                >
                                    <div>
                                        <span className={`block font-black italic uppercase tracking-tighter text-3xl text-white group-hover:${themeText}`}>Advanced Forge</span>
                                        <span className="text-[9px] font-mono text-zinc-500 block mt-1 uppercase italic tracking-widest">Deep Archetypes & Voice Rails</span>
                                    </div>
                                    <Sparkles size={36} className={`text-zinc-700 group-hover:${themeText} transition-colors`} />
                                </button>
                            </div>
                        </motion.div>

                        <p className="text-[9px] font-mono text-zinc-800 uppercase tracking-[0.3em] text-center italic">
                            // deep processing optimization active
                        </p>
                    </motion.div>
                );
            case 14:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            The Identity Layer
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Refine the vision and market archetype. This is the strategic foundation of your brand.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-4xl mx-auto grid grid-cols-2 gap-6 text-left">
                            <div className="space-y-4">
                                <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">
                                    {formData.entity_type === 'brand' ? 'Brand Archetype' : 'Creator Archetype'}
                                </label>
                                <input
                                    type="text"
                                    className={`w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 text-white outline-none focus:${themeBorder} transition-all`}
                                    placeholder={formData.entity_type === 'brand' ? "e.g. The Outlaw" : "e.g. The Teacher"}
                                    value={formData.archetype}
                                    onChange={e => setFormData({ ...formData, archetype: e.target.value })}
                                />
                                {formData.entity_type === 'brand' ? (
                                    <>
                                        <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Core Values</label>
                                        <input
                                            type="text"
                                            className={`w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 text-white outline-none focus:${themeBorder} transition-all`}
                                            placeholder="Split by commas (e.g. Bold, Fast, Fair)"
                                            value={formData.values?.join(', ')}
                                            onChange={e => setFormData({ ...formData, values: e.target.value.split(',').map(v => v.trim()) })}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Creator Stage</label>
                                        <select
                                            className={`w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 text-white outline-none focus:${themeBorder} transition-all appearance-none cursor-pointer`}
                                            value={formData.creator_stage}
                                            onChange={e => setFormData({ ...formData, creator_stage: e.target.value })}
                                        >
                                            <option value="" disabled className="bg-zinc-900">Select Stage</option>
                                            <option value="Beginner" className="bg-zinc-900">Beginner (Starting Discovery)</option>
                                            <option value="Growth" className="bg-zinc-900">Growth (Expanding Audience)</option>
                                            <option value="Established" className="bg-zinc-900">Established (Market Authority)</option>
                                        </select>
                                    </>
                                )}
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">
                                    {formData.entity_type === 'brand' ? 'Brand Vision' : 'Primary Goals'}
                                </label>
                                <textarea
                                    className={`w-full bg-white/5 border border-white/10 rounded-[2rem] py-4 px-8 text-white outline-none focus:${themeBorder} transition-all h-32 resize-none`}
                                    placeholder={formData.entity_type === 'brand' ? "The long-term goal..." : "What are you building toward? (e.g. Launching a course, 50k Subs)"}
                                    value={formData.entity_type === 'brand' ? formData.vision : formData.goals?.join('\n')}
                                    onChange={e => {
                                        if (formData.entity_type === 'brand') {
                                            setFormData({ ...formData, vision: e.target.value });
                                        } else {
                                            setFormData({ ...formData, goals: e.target.value.split('\n').filter(g => g.trim()) });
                                        }
                                    }}
                                />
                            </div>
                        </motion.div>
                        <button onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter mx-auto flex items-center gap-2`}>
                            Next Layer <ArrowRight size={18} />
                        </button>
                    </motion.div>
                );
            case 15:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            The Voice Nuance
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            How do you sound in a crowd? Define the specifics of your communication style.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-4xl mx-auto grid grid-cols-2 gap-6 text-left">
                            <div className="space-y-4">
                                <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Vocabulary (Do Say)</label>
                                <input
                                    type="text"
                                    className={`w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 text-white outline-none focus:${themeBorder} transition-all`}
                                    placeholder="Keywords you love"
                                    value={formData.do_say?.join(', ')}
                                    onChange={e => setFormData({ ...formData, do_say: e.target.value.split(',').map(v => v.trim()) })}
                                />
                                {formData.entity_type === 'creator' && (
                                    <>
                                        <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Humor Style</label>
                                        <input
                                            type="text"
                                            className={`w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 text-white outline-none focus:${themeBorder} transition-all`}
                                            placeholder="e.g. Dry, Self-aware, Chaotic"
                                            value={formData.humor_style}
                                            onChange={e => setFormData({ ...formData, humor_style: e.target.value })}
                                        />
                                    </>
                                )}
                                <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Banned Words (Don't Say)</label>
                                <input
                                    type="text"
                                    className={`w-full bg-white/5 border border-white/10 rounded-full py-4 px-8 text-white outline-none focus:${themeBorder} transition-all`}
                                    placeholder="Words you hate"
                                    value={formData.dont_say?.join(', ')}
                                    onChange={e => setFormData({ ...formData, dont_say: e.target.value.split(',').map(v => v.trim()) })}
                                />
                            </div>
                            <div className="space-y-6 flex flex-col justify-center bg-white/5 rounded-[2rem] p-8 border border-white/10">
                                <div>
                                    <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-400 mb-2 px-2">
                                        <span>Formal</span>
                                        <span>Slang Level</span>
                                        <span>Meme-Genius</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="1"
                                        className={`w-full accent-${themeColor}-500`}
                                        value={formData.slang_level}
                                        onChange={e => setFormData({ ...formData, slang_level: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-400 mb-2 px-2">
                                        <span>Professional</span>
                                        <span>Emoji Usage</span>
                                        <span>Gen Z Chaos</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="3"
                                        step="1"
                                        className={`w-full accent-${themeColor}-500`}
                                        value={formData.emoji_usage}
                                        onChange={e => setFormData({ ...formData, emoji_usage: parseInt(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </motion.div>
                        <button onClick={handleNext} className={`mt-8 px-10 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter mx-auto flex items-center gap-2`}>
                            Final Constraints <ArrowRight size={18} />
                        </button>
                    </motion.div>
                );
            case 16:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            The Strategic Vault
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Define your red lines. This ensures the AI never crosses your ethical or legal boundaries.
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-4xl mx-auto space-y-6 text-left">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">
                                        {formData.entity_type === 'brand' ? 'Sensitive Topics' : 'Personal Boundaries'}
                                    </label>
                                    <textarea
                                        className={`w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-white outline-none focus:${themeBorder} transition-all h-40 resize-none italic`}
                                        placeholder={formData.entity_type === 'brand' ? "Topics that require a careful tone..." : "What will you NOT share about your life?"}
                                        value={formData.entity_type === 'brand' ? formData.sensitive_topics?.join(', ') : formData.personal_boundaries?.join(', ')}
                                        onChange={e => {
                                            if (formData.entity_type === 'brand') {
                                                setFormData({ ...formData, sensitive_topics: e.target.value.split(',').map(v => v.trim()) });
                                            } else {
                                                setFormData({ ...formData, personal_boundaries: e.target.value.split(',').map(v => v.trim()) });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Banned Topics / Claims</label>
                                    <textarea
                                        className={`w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-white outline-none focus:${themeBorder} transition-all h-40 resize-none italic`}
                                        placeholder="Non-negotiable red lines..."
                                        value={formData.banned_topics?.join(', ')}
                                        onChange={e => setFormData({ ...formData, banned_topics: e.target.value.split(',').map(v => v.trim()) })}
                                    />
                                </div>
                            </div>
                        </motion.div>
                        <button
                            onClick={handleNext}
                            className={`mt-12 px-12 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter text-xl shadow-xl flex items-center gap-4 mx-auto hover:scale-105 transition-all active:scale-95`}
                        >
                            {formData.entity_type === 'brand' ? 'Review Master DNA' : 'Monetization Layer'} <ArrowRight size={20} />
                        </button>
                    </motion.div>
                );
            case 17:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-8">
                        <motion.h2 variants={itemSlide} className="text-4xl font-black italic uppercase tracking-tighter text-white">
                            Monetization & Pillars
                        </motion.h2>
                        <motion.p variants={itemSlide} className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                            Define your output and IP. How do you provide value and how is it structured?
                        </motion.p>
                        <motion.div variants={itemSlide} className="max-w-4xl mx-auto grid grid-cols-2 gap-6 text-left">
                            <div className="space-y-4">
                                <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Content Pillars</label>
                                <textarea
                                    className={`w-full bg-white/5 border border-white/10 rounded-[2rem] py-4 px-8 text-white outline-none focus:${themeBorder} transition-all h-32 resize-none`}
                                    placeholder="Tutorials, BTS, Opinions..."
                                    value={formData.content_pillars?.join('\n')}
                                    onChange={e => setFormData({ ...formData, content_pillars: e.target.value.split('\n').filter(p => p.trim()) })}
                                />
                                <span className="text-[9px] font-mono text-zinc-600 block px-4 uppercase tracking-widest">Entry per line. These define your authority zones.</span>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-mono uppercase text-zinc-600 ml-4 tracking-widest">Active Offers / IP</label>
                                <textarea
                                    className={`w-full bg-white/5 border border-white/10 rounded-[2rem] py-4 px-8 text-white outline-none focus:${themeBorder} transition-all h-32 resize-none`}
                                    placeholder="e.g., Notion Template, 1:1 Coaching..."
                                    value={formData.offers?.join('\n')}
                                    onChange={e => setFormData({ ...formData, offers: e.target.value.split('\n').filter(o => o.trim()) })}
                                />
                                <span className="text-[9px] font-mono text-zinc-600 block px-4 uppercase tracking-widest">List your products or services.</span>
                            </div>
                        </motion.div>
                        <button
                            onClick={handleNext}
                            className={`mt-12 px-12 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter text-xl shadow-xl flex items-center gap-4 mx-auto hover:scale-105 transition-all active:scale-95`}
                        >
                            Review Master DNA <ArrowRight size={20} />
                        </button>
                    </motion.div>
                );
            case 18:
                return (
                    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-10 pb-20 pt-24 text-center">
                        <div className="space-y-4">
                            <motion.h2 variants={itemSlide} className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
                                Master DNA Locked
                            </motion.h2>
                            <motion.p variants={itemSlide} className="text-zinc-500 text-[10px] md:text-sm max-w-lg mx-auto font-medium lowercase tracking-[0.2em] italic">
                                strategy is refined. the forge is synchronized with your soul.
                            </motion.p>
                        </div>

                        <motion.div variants={itemSlide} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Layer 1: Core */}
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 text-left relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><Shield size={32} /></div>
                                <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Strategic Core</label>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[9px] font-mono text-zinc-500 uppercase">Archetype</p>
                                        <p className={`text-xl font-black italic uppercase ${themeText}`}>{formData.archetype || 'The Creator'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-mono text-zinc-500 uppercase">Mission</p>
                                        <p className="text-white text-[11px] leading-relaxed italic line-clamp-3">"{formData.mission_brief}"</p>
                                    </div>
                                    <div className="pt-2">
                                        <div className="flex flex-wrap gap-1">
                                            {formData.values?.map((v, i) => (
                                                <span key={i} className="text-[8px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5 text-zinc-400">{v}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Layer 2: Voice */}
                            <div className={`bg-white/5 border ${formData.entity_type === 'brand' ? 'border-emerald-500/30' : 'border-violet-500/30'} rounded-[2.5rem] p-8 space-y-6 text-left relative overflow-hidden group`}>
                                <div className="absolute top-0 right-0 p-4 opacity-20"><Zap size={32} className={themeText} /></div>
                                <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Linguistic DNA</label>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[9px] font-mono text-zinc-500 uppercase">Tone</p>
                                            <p className="text-white text-lg font-black uppercase italic">{formData.tone_voice}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-mono text-zinc-500 uppercase">Profile</p>
                                            <p className="text-zinc-400 text-[10px] font-mono leading-none">L{formData.slang_level} E{formData.emoji_usage}</p>
                                        </div>
                                    </div>
                                    {formData.entity_type === 'creator' && (
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                <p className="text-[9px] font-mono text-zinc-500 uppercase">Humor</p>
                                                <p className="text-white text-[10px] font-bold uppercase">{formData.humor_style || 'Authentic'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-mono text-zinc-500 uppercase">Presence</p>
                                                <p className="text-white text-[10px] font-bold uppercase">{formData.on_screen_presence || 'Talking Head'}</p>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[9px] font-mono text-emerald-500/50 uppercase tracking-widest">Vocabulary (Do)</p>
                                        <p className="text-white text-[10px] font-medium leading-tight italic">{formData.do_say?.join(', ')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-mono text-red-500/50 uppercase tracking-widest">Avoid (Don't)</p>
                                        <p className="text-zinc-500 text-[10px] font-medium leading-tight line-through opacity-50">{formData.dont_say?.join(', ')}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Layer 3: Protocol */}
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 text-left relative overflow-hidden group hover:border-white/20 transition-all">
                                <div className="absolute top-0 right-0 p-4 opacity-10"><LucideLock size={32} /></div>
                                <label className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Safety Protocol</label>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Red Lines</p>
                                        <p className="text-red-400/70 text-[10px] leading-relaxed italic mt-1 line-clamp-4">
                                            {formData.banned_topics?.length > 0 ? formData.banned_topics.join(', ') : 'Exhaustive strategic boundaries active.'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Territory</p>
                                        <p className="text-white text-xs font-bold uppercase tracking-[0.2em] mt-1">{formData.industry}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <div className="pt-4">
                            <motion.button
                                variants={itemSlide}
                                onClick={handleFinish}
                                disabled={isFinalizing}
                                className={`px-12 py-4 rounded-full ${themeBg} text-black font-black italic uppercase tracking-tighter text-xl shadow-xl flex items-center gap-4 mx-auto hover:scale-105 transition-all active:scale-95 ${isFinalizing ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isFinalizing ? (
                                    <>Finalizing Vault <Loader2 size={24} className="animate-spin" /></>
                                ) : (
                                    <>Initialize Vault <CheckCircle2 size={24} /></>
                                )}
                            </motion.button>

                            <p className="text-[9px] font-mono text-zinc-700 uppercase tracking-[0.5em] mt-8 animate-pulse">
                                // protocol initialized. trend engine online.
                            </p>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[100px] overflow-hidden p-6">
            <div className={`absolute top-0 left-0 w-full h-full pointer-events-none opacity-20`}>
                <div className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] ${formData.entity_type === 'brand' ? 'bg-emerald-500/10' : 'bg-violet-500/10'} blur-[200px] rounded-full animate-pulse`} />
                <div className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] ${formData.entity_type === 'brand' ? 'bg-emerald-500/5' : 'bg-violet-500/5'} blur-[200px] rounded-full animate-pulse`} style={{ animationDelay: '2s' }} />
            </div>

            <button onClick={onClose} className="absolute top-12 right-12 text-zinc-500 hover:text-white transition-colors z-[110]">
                <X size={32} />
            </button>

            {currentStep > 1 && (
                <button
                    onClick={handleBack}
                    className="absolute bottom-12 left-12 p-4 text-zinc-500 hover:text-white transition-all flex items-center gap-2 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[11px] font-mono uppercase tracking-widest">Back</span>
                </button>
            )}

            <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-2">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 transition-all duration-700 rounded-full ${i + 1 <= currentStep ? (formData.entity_type === 'brand' ? 'bg-emerald-500' : 'bg-violet-400') : 'bg-white/10'} ${i + 1 === currentStep ? 'w-12' : 'w-4'}`}
                    />
                ))}
            </div>

            <div className="relative z-10 w-full max-w-5xl mx-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(20px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -30, scale: 1.05, filter: 'blur(20px)' }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full"
                    >
                        {renderQuestion()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
