import type { Metadata } from "next";
import FloatingNav from "@/components/FloatingNav"; // Adjusted import path

export const metadata: Metadata = {
  title: {
    template: '%s | Verity',
    default: 'Verity Dashboard',
  },
  description: "AI Ad Generator & Cultural Intelligence",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#020202]">
      <FloatingNav />
      {children}
    </div>
  );
}