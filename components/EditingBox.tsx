import React from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';

interface Improvement {
    original: string;
    tweak: string;
    reasoning: string;
}

interface EditingBoxProps {
    improvements: Improvement[];
    finalScript: any[];
}

export const EditingBox: React.FC<EditingBoxProps> = ({ improvements, finalScript }) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {/* IMPROVEMENT BREAKDOWN */}
            <div className="liquid-glass rounded-[2.5rem] p-8 md:p-10 backdrop-blur-md">
                <div className="flex items-center gap-4 mb-8">
                    <Sparkles size={20} className="text-emerald-500" />
                    <h3 className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">Viral Optimization Tweak-log</h3>
                </div>

                <div className="space-y-6">
                    {improvements.map((item, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group bg-white/[0.02] border border-white/5 rounded-3xl p-6 hover:border-emerald-500/20 transition-all"
                        >
                            <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-full">
                                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-2 block">Original Draft</span>
                                        <p className="text-xs text-zinc-500 line-through decoration-zinc-700 italic">{item.original}</p>
                                    </div>
                                    <div className="mt-6">
                                        <ArrowRight size={14} className="text-emerald-500/40" />
                                    </div>
                                    <div className="w-full">
                                        <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest mb-2 block">Viral Pivot</span>
                                        <p className="text-sm text-zinc-200 font-medium italic">"{item.tweak}"</p>
                                    </div>
                                </div>

                                <div className="mt-2 pt-4 border-t border-white/5 flex items-start gap-3">
                                    <MessageSquare size={12} className="text-emerald-500 mt-0.5" />
                                    <p className="text-[10px] font-mono text-zinc-400 leading-relaxed italic">{item.reasoning}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* FINAL MASTER SCRIPT */}
            <div className="liquid-glass rounded-[2.5rem] p-8 md:p-10 backdrop-blur-md">
                <div className="flex items-center gap-4 mb-10">
                    <BadgeCheck size={20} className="text-emerald-500" />
                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.4em]">Optimized Master Script</span>
                </div>

                <div className="space-y-8">
                    {finalScript.map((step: any, idx: number) => (
                        <div key={idx} className="relative pl-10 border-l border-white/5 group">
                            <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
                                <span className="text-[10px] font-mono text-emerald-500/60 uppercase">{step?.timestamp}</span>
                                <span className="text-[10px] font-black text-zinc-400 uppercase italic tracking-widest">{step?.speaker}</span>
                                {step?.action && (
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        {step.action}
                                    </span>
                                )}
                            </div>
                            <div className="bg-white/[0.02] border border-white/10 p-6 rounded-[2rem] group-hover:border-emerald-500/20 transition-colors">
                                <p className="text-base md:text-lg font-medium text-zinc-200 italic leading-relaxed">"{step?.dialogue || "..."}"</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
