"use client";

import { useEffect } from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingBento from "@/components/landing/LandingBento";
import DocumentCatalog from "@/components/landing/DocumentCatalog";
import ProcessWorkflow from "@/components/landing/ProcessWorkflow";
import FAQSection from "@/components/landing/FAQSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  useEffect(() => {
    const origHtmlBg = document.documentElement.style.backgroundColor;
    const origBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = "#ffffff";
    document.body.style.backgroundColor = "#ffffff";
    return () => {
      document.documentElement.style.backgroundColor = origHtmlBg;
      document.body.style.backgroundColor = origBodyBg;
    };
  }, []);

  return (
    <div className="relative min-h-[100dvh] w-full max-w-full flex flex-col bg-[#ffffff] text-[#1D1D1F] selection:bg-red-100 selection:text-red-900 font-jakarta overflow-x-hidden">
      
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
        <div className="w-full bg-[#ffffff]">
          <LandingHero />
        </div>
        <div className="w-full bg-[#ffffff]">
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

