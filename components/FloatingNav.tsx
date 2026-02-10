"use client";
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Vault, Radar, ScanLine, Wand2 } from 'lucide-react';

const navItems = [
    { href: '/dashboard', key: 'home', label: 'Home', icon: Home },
    { href: '/dashboard/brandvault', key: 'vault', label: 'Vault', icon: Vault },
    { href: '/dashboard/radar', key: 'radar', label: 'Radar', icon: Radar },
    { href: '/dashboard/scanner', key: 'scanner', label: 'Scanner', icon: ScanLine },
    { href: '/dashboard/orchestrator', key: 'deploy', label: 'Deploy', icon: Wand2 },
];

interface FloatingNavProps {
    activePage: 'home' | 'vault' | 'radar' | 'scanner' | 'deploy';
}

export default function FloatingNav({ activePage }: FloatingNavProps) {
    const router = useRouter();

    return (
        <>
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl rounded-[2.5rem] px-2 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)]">
                {navItems.map((item) => {
                    const isActive = item.key === activePage;
                    return (
                        <Link
                            key={item.key}
                            href={item.href}
                            className="group relative flex flex-col items-center gap-1 px-6 py-3 transition-all duration-300"
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
                                    size={18}
                                    className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'
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
            <div className="h-24" /> {/* Spacer for fixed nav */}
        </>
    );
}
