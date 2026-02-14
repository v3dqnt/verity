import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verity | AI Ad Manager",
  description: "Next-gen AI asset generation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased" style={{ fontFamily: 'Satoshi, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}