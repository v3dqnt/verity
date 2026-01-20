// components/trends/TrendCard.tsx
"use client";
import { motion } from "motion/react";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface TrendProps {
  trend: {
    name: string;
    saturation: number;
    decay: number;
    eta: string;
    description: string;
  };
}

export default function TrendCard({ trend }: TrendProps) {
  const isHighSaturation = trend.saturation > 70;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      className="p-5 rounded-3xl bg-[#151515] border border-white/10 hover:border-purple-500/50 transition-colors shadow-2xl"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <TrendingUp size={20} className="text-purple-400" />
        </div>
        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
          isHighSaturation ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {isHighSaturation && <AlertTriangle size={12} />}
          {trend.saturation}% Saturation
        </span>
      </div>

      <h3 className="text-lg font-bold text-white mb-2">#{trend.name}</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-6">{trend.description}</p>
      
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-bold">
          <span>Decay Risk</span>
          <span>{trend.decay}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${trend.decay}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full ${trend.decay > 50 ? 'bg-orange-500' : 'bg-purple-500'}`}
          />
        </div>
        <p className="text-[10px] text-gray-600 mt-2">Vibe shift expected in: **{trend.eta}**</p>
      </div>
    </motion.div>
  );
}