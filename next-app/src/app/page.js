"use client";

import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingBento from "@/components/landing/LandingBento";
import DocumentCatalog from "@/components/landing/DocumentCatalog";
import ProcessWorkflow from "@/components/landing/ProcessWorkflow";
import FAQSection from "@/components/landing/FAQSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="relative min-h-[100dvh] w-full max-w-full flex flex-col bg-zinc-950 dark:bg-zinc-950 text-[#1D1D1F] dark:text-zinc-50 selection:bg-red-100 selection:text-red-900 font-inter overflow-x-hidden">
      
      {/* Subdued ambient liquid background */}
      <div className="liquid-container opacity-30">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      {/* Floating Apple Navbar */}
      <LandingNavbar />

      {/* Main Page Layout */}
      <main className="relative z-10 flex-1 w-full max-w-full overflow-hidden">
        <div className="w-full bg-zinc-950">
          <LandingHero />
        </div>
        <div className="w-full bg-white dark:bg-zinc-950">
          <LandingBento />
          <ProcessWorkflow />
          <DocumentCatalog />
          <FAQSection />
        </div>
      </main>

      {/* Apple Clean Footer */}
      <LandingFooter />

    </div>
  );
}

