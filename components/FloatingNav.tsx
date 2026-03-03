"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { HomeIcon, ArchiveBoxIcon, SignalIcon, MagnifyingGlassIcon, PencilSquareIcon, ArrowRightOnRectangleIcon, VideoCameraIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';

const navItems = [
    { href: '/dashboard', key: 'home', label: 'Home', icon: HomeIcon, exact: true },
    { href: '/dashboard/radar', key: 'radar', label: 'Radar', icon: SignalIcon },
    { href: '/dashboard/scanner', key: 'scanner', label: 'Auditor', icon: MagnifyingGlassIcon },
    { href: '/dashboard/orchestrator', key: 'deploy', label: 'Scribe', icon: PencilSquareIcon },
    { href: '/dashboard/vision', key: 'vision', label: 'Vision', icon: VideoCameraIcon },
];

export default function FloatingNav() {
    const pathname = usePathname();
    const router = useRouter();

    const isVaultActive = pathname.startsWith('/dashboard/brandvault');

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
            {/* VAULT CAPSULE */}
            <Link
                href="/dashboard/brandvault"
                className="group relative flex flex-col items-center gap-1 px-8 py-2 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 h-[60px] justify-center"
            >
                {isVaultActive && (
                    <motion.div
                        layoutId="active-nav-bg"
                        className="absolute inset-0 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[2rem] z-0"
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                        }}
                    />
                )}
                <div className="relative z-10 flex flex-col items-center gap-1">
                    <ArchiveBoxIcon
                        className={`w-[18px] h-[18px] transition-colors duration-300 ${isVaultActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}
                    />
                    <span
                        className={`text-[8px] font-mono uppercase tracking-[0.2em] transition-colors duration-300 ${isVaultActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}
                    >
                        Vault
                    </span>
                </div>
            </Link>

            {/* MAIN NAV */}
            <nav className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-[2.5rem] px-2 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] h-[60px]">
                {navItems.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className="group relative flex flex-col items-center gap-1 px-6 py-3 transition-all duration-300 h-full justify-center"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-nav-bg"
                                    className="absolute inset-0 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] rounded-[2rem] z-0"
                                    transition={{
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 30
                                    }}
                                />
                            )}
                            <div className="relative z-10 flex flex-col items-center gap-1">
                                <item.icon
                                    className={`w-[18px] h-[18px] transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
                                        }`}
                                />
                                <span
                                    className={`text-[8px] font-mono uppercase tracking-[0.2em] transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'
                                        }`}
                                >
                                    {item.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* LOGOUT CAPSULE */}
            <AnimatePresence>
                {pathname === '/dashboard' && (
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.push('/');
                        }}
                        className="group relative flex flex-col items-center gap-1 px-8 py-2 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 h-[60px] justify-center"
                    >
                        <div className="relative z-10 flex flex-col items-center gap-1">
                            <ArrowRightOnRectangleIcon
                                className="w-[18px] h-[18px] text-zinc-500 group-hover:text-red-400 transition-colors duration-300"
                            />
                            <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-600 group-hover:text-red-400 transition-colors duration-300">
                                Log Out
                            </span>
                        </div>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}
