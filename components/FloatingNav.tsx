"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { HomeIcon, ArchiveBoxIcon, SignalIcon, MagnifyingGlassIcon, PencilSquareIcon, ArrowRightOnRectangleIcon, EyeIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import ProfileSelector from './ProfileSelector';

const navItems = [
    { href: '/dashboard', key: 'home', label: 'Home', icon: HomeIcon, exact: true, color: 'hover:text-white', activeColor: 'text-white', glow: 'shadow-[0_0_15px_rgba(255,255,255,0.3)]' },
    { href: '/dashboard/scanner', key: 'scanner', label: 'Auditor', icon: MagnifyingGlassIcon, color: 'hover:text-emerald-400', activeColor: 'text-emerald-400', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' },
    { href: '/dashboard/orchestrator', key: 'deploy', label: 'Scribe', icon: PencilSquareIcon, color: 'hover:text-cyan-400', activeColor: 'text-cyan-400', glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]' },
    { href: '/dashboard/vision', key: 'vision', label: 'Vision', icon: EyeIcon, color: 'hover:text-orange-400', activeColor: 'text-orange-400', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.3)]' },
    { href: '/dashboard/radar', key: 'radar', label: 'Radar', icon: SignalIcon, color: 'hover:text-purple-400', activeColor: 'text-purple-400', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]' },
];

export default function FloatingNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isVaultActive = pathname.startsWith('/dashboard/brandvault');

    return (
        <>
            <motion.div 
                className="fixed top-4 md:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 md:gap-2"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* VAULT CAPSULE */}
                <Link
                    href="/dashboard/brandvault"
                    className="group flex items-center justify-center w-11 h-11 md:w-14 md:h-14 bg-black/10 border-white/10 border backdrop-blur-3xl rounded-[1.25rem] md:rounded-[1.5rem] transition-all duration-500 hover:scale-110 hover:bg-white/[0.05] hover:border-white/20 relative shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                >
                    {isVaultActive && (
                        <motion.div
                            layoutId="active-nav-indicator"
                            className="absolute -bottom-1 w-6 md:w-8 h-1 bg-zinc-300 rounded-full shadow-[0_0_10px_rgba(212,212,216,0.5)]"
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                    )}
                    <ArchiveBoxIcon className={`w-5 h-5 md:w-6 md:h-6 transition-all duration-300 ${isVaultActive ? 'text-zinc-200 scale-110' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                </Link>

                {/* MAIN NAV */}
                <nav className="flex items-center gap-0.5 md:gap-1 bg-black/10 border border-white/10 backdrop-blur-3xl rounded-[1.75rem] md:rounded-[2rem] p-1.5 md:p-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative">
                    <div className="absolute inset-0 rounded-[1.75rem] md:rounded-[2rem] bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                    
                    {navItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.key}
                                href={item.href}
                                className="group relative flex items-center justify-center w-11 h-10 md:w-14 md:h-12 transition-all duration-500 hover:scale-110"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-nav-indicator"
                                        className={`absolute -bottom-3 w-6 md:w-8 h-1 rounded-full ${item.glow} bg-current ${item.activeColor}`}
                                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                    />
                                )}
                                <div className={`absolute inset-0 rounded-xl md:rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? 'bg-white/10 opacity-100' : ''}`} />
                                <item.icon
                                    className={`w-5 h-5 md:w-6 md:h-6 relative z-10 transition-all duration-300 ${isActive ? `${item.activeColor} scale-110` : `text-zinc-500 ${item.color}`}`}
                                />
                            </Link>
                        );
                    })}
                </nav>

                {/* LOGOUT CAPSULE */}
                <AnimatePresence>
                    {pathname === '/dashboard' && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -20 }}
                            transition={{ duration: 0.4 }}
                            onClick={async () => {
                                await supabase.auth.signOut();
                                router.push('/');
                            }}
                            className="group flex items-center justify-center w-11 h-11 md:w-14 md:h-14 bg-black/10 border-white/10 border backdrop-blur-3xl rounded-[1.25rem] md:rounded-[1.5rem] transition-all duration-500 hover:scale-110 hover:bg-red-500/10 hover:border-red-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                        >
                            <ArrowRightOnRectangleIcon className="w-5 h-5 md:w-6 md:h-6 text-zinc-500 group-hover:text-red-400 transition-colors duration-300" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>
            
            <div className={`fixed bottom-5 right-4 md:bottom-auto md:top-6 md:right-8 z-[100] transition-opacity duration-500 ${scrolled ? 'md:opacity-30 md:hover:opacity-100' : 'opacity-100'}`}>
                <ProfileSelector />
            </div>
        </>
    );
}
