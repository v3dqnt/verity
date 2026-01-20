"use client";
import { motion } from "motion/react";

export default function AuthenticityMeter({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s > 80) return "#ccff00"; // Neon Green
    if (s > 50) return "#8b5cf6"; // Purple
    return "#ef4444"; // Red
  };

  return (
    <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.5, ease: "circOut" }}
        style={{ backgroundColor: getColor(score) }}
        className="h-full shadow-[0_0_20px_rgba(204,255,0,0.3)]"
      />
    </div>
  );
}