"use client";

import { useEffect } from "react";
import RegistrarNotice from "@/components/landing/RegistrarNotice";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingHero from "@/components/landing/LandingHero";
import LandingSections from "@/components/landing/LandingSections";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage({ enhanced, notice }) {
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
    <div className="relative isolate flex min-h-[100dvh] w-full max-w-full flex-col overflow-x-hidden bg-white font-jakarta text-[#1d1d1f] selection:bg-red-100 selection:text-red-900 [--brand-accent:#800000] [--brand-foreground:#fff]">
      <LandingNavbar classic={!enhanced} />
      <main className="relative z-0 flex-1 w-full max-w-full overflow-hidden">
        {notice && <RegistrarNotice {...notice} className="mt-[45px]" />}
        <LandingHero classic={!enhanced} hasNotice={Boolean(notice)} />
        <LandingSections classic={!enhanced} />
      </main>
      <LandingFooter classic={!enhanced} />
    </div>
  );
}
