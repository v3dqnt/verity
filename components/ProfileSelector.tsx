"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, User } from 'lucide-react';
import { useActiveBrand } from '@/hooks/useActiveBrand';

export default function ProfileSelector() {
  const { brands, activeBrand, selectBrand, loading } = useActiveBrand();
  const [isOpen, setIsOpen] = useState(false);

  if (loading && brands.length === 0) {
    return (
        <div className="relative z-50">
            <div className="flex items-center gap-3 px-6 py-2 bg-black/10 border border-white/10 backdrop-blur-3xl rounded-[2rem] h-14 animate-pulse shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <div className="h-8 w-8 rounded-full bg-white/10" />
                <div className="flex flex-col gap-2">
                    <div className="h-2 w-12 bg-white/10 rounded-full" />
                    <div className="h-3 w-20 bg-white/10 rounded-full" />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex items-center gap-3 px-4 py-2 bg-black/10 border border-white/10 backdrop-blur-3xl rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 hover:bg-white/5 hover:border-white/20 h-14 relative"
      >
        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
        <div className={`h-8 w-8 rounded-full overflow-hidden flex items-center justify-center bg-white/5 border border-white/10 ${activeBrand?.entity_type === 'brand' ? 'text-emerald-500' : 'text-violet-400'}`}>
          {activeBrand?.logo_url ? (
            <img src={activeBrand.logo_url} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            activeBrand?.entity_type === 'brand' ? <Globe size={14} /> : <User size={14} />
          )}
        </div>
        <div className="flex flex-col items-start pr-2">
          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">Active Profile</span>
          <span className="text-sm font-black italic tracking-tighter text-white uppercase line-clamp-1 max-w-[120px]">
            {activeBrand ? activeBrand.company_name : "Select Brand"}
          </span>
        </div>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 bottom-full mb-4 md:bottom-auto md:top-full md:mt-4 w-64 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-2 z-50 origin-bottom-right md:origin-top-right overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]"
            >
              <div className="max-h-64 overflow-y-auto pr-1">
                 <div className="px-3 pb-2 pt-1">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Your Profiles</span>
                 </div>
                {brands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      selectBrand(brand.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                        activeBrand?.id === brand.id 
                            ? 'bg-white/10' 
                            : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`h-10 w-10 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center bg-white/5 border border-white/10 ${brand.entity_type === 'brand' ? 'text-emerald-500' : 'text-violet-400'}`}>
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        brand.entity_type === 'brand' ? <Globe size={16} /> : <User size={16} />
                      )}
                    </div>
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-sm font-bold text-white truncate w-full text-left">{brand.company_name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono uppercase truncate w-full text-left tracking-widest">{brand.industry}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
