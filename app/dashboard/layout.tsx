import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css"; // Ensure your global styles are imported

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Verity",
  description: "AI Ad Generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}