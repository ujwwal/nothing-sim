import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const inter = Inter({ subsets: ["latin"], weight: ["300","400","500","600","700"] });

export const metadata: Metadata = {
  title: "QuietCost | The Cost of Doing Nothing",
  description: "Understand the long-term fiscal consequences of delaying supportive housing interventions for people experiencing chronic homelessness.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>

        {/* ── Animated background canvas ─────────────────────────────── */}
        <div className="bg-canvas" aria-hidden="true">
          {/* Gradient orbs */}
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
          <div className="orb orb-4" />
          <div className="orb orb-5" />
          {/* Subtle grid */}
          <div className="bg-grid" />
          {/* Noise texture */}
          <div className="bg-noise" />
        </div>

        {/* ── App shell ─────────────────────────────────────────────── */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Navigation />
          <main className="page-content">
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}