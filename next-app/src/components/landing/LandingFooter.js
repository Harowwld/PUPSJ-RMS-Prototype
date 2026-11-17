"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowUp01Icon, LinkSquare01Icon, Location01Icon } from "hugeicons-react";


const DEFAULT_FOOTER = {
  brandName: "eManage",
  brandSubtitle:
    "Polytechnic University of the Philippines, San Juan Campus Records Keeping & Online Document Request Platform.",
  locationHall: "Ground Floor, Admin & Records Hall",
  locationAddress:
    "223 Ortega Street, cor. A. Mabini Street, Barangay Addition Hills, San Juan City, Metro Manila 1500",
  mapsEnabled: true,
  mapsUrl:
    "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus",

  scheduleEyebrow: "Registrar Schedule",
  scheduleItems: [
    { label: "Monday – Friday", value: "8:00 AM – 5:00 PM", status: "open" },
    { label: "Noon Break Shift", value: "12:00 PM – 1:00 PM", status: "break" },
    { label: "Weekends & Holidays", value: "Closed", status: "closed" },
  ],

  contactsEyebrow: "Official Desk",
  contactItems: [
    {
      label: "Registrar Inquiries",
      value: "registrar.sanjuan@pup.edu.ph",
      type: "email",
    },
    {
      label: "Student Affairs (OSAS)",
      value: "osas.sanjuan@pup.edu.ph",
      type: "email",
    },
    {
      label: "Campus Trunklines",
      value: "(02) 8724-4112 / (02) 8724-4113",
      type: "phone",
    },
  ],

  watermarkEnabled: true,
  watermarkText: "EMANAGE",

  copyrightText: "© 2026 PUP San Juan Campus · All rights reserved.",
};

export default function LandingFooter({ classic, previewContent }) {
  const [publishedContent, setFooterData] = useState(DEFAULT_FOOTER);

  const footerData = previewContent ?? publishedContent;

  useEffect(() => {
    if (previewContent) return;
    let isMounted = true;
    fetch("/api/landing/footer", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          setFooterData(json.data);
        }
      })
      .catch((err) => {
        console.warn("[LandingFooter] Fetch error:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [previewContent]);


  const getEmbedUrl = (mapsUrl) => {
    try {
      const url = new URL(mapsUrl || "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus");
      const q = url.searchParams.get("q") || "Polytechnic University of the Philippines San Juan Campus";
      return `https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;
    } catch {
      return `https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${encodeURIComponent("Polytechnic University of the Philippines San Juan Campus")}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;
    }
  };

  return (
    <footer
      id="office"
      data-classic={classic || undefined}
      className={`group relative z-0 [--footer-heading:#1d1d1f] [--footer-copy:#707070] [--footer-accent:#800000] [--footer-divider:#d6d6d6] data-classic:[--footer-heading:#fafafa] data-classic:[--footer-copy:#a1a1aa] data-classic:[--footer-accent:#f87171] data-classic:[--footer-divider:#ffffff1a] mt-auto w-full scroll-mt-20 overflow-hidden border-t pb-6 text-xs font-jakarta ${classic ? "bg-zinc-950 text-zinc-400 border-zinc-800 pt-10 sm:pt-12" : "bg-[#f5f5f7] text-[#707070] border-[#e6e6e8] pt-12 sm:pt-16"}`}
    >
      {/* =====================================================================
          TOP SECTION: INSTITUTIONAL CREDENTIALS & DIRECTORY GRID (3-COLUMN)
          ===================================================================== */}
      
      {/* =====================================================================
          BENTO FOOTER: INSTITUTIONAL CREDENTIALS & DIRECTORY GRID (4-PANEL)
          ===================================================================== */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 pb-12 sm:pb-16 z-10 relative">
          
          {/* Left Box */}
          <div className={classic ? "lg:col-span-5 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 p-8 shadow-xl sm:p-12 flex flex-col justify-between" : "lg:col-span-5 flex flex-col justify-between"}>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Image src={classic ? "/assets/branding/white-icon.png" : "/assets/branding/black-icon.png"} alt="eManage Logo" width={32} height={32} className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-2xl text-[color:var(--footer-heading)] tracking-tight">
                  eManage
                </span>
              </div>
              <p className="text-[13px] text-[color:var(--footer-copy)] leading-relaxed font-normal mb-8 max-w-sm">
                {footerData.brandSubtitle}
              </p>
            </div>
            
            <div className="pt-6 border-t border-[color:var(--footer-divider)]">
              <div className="font-bold text-[color:var(--footer-heading)] flex items-center gap-2 mb-2 text-sm">
                <Location01Icon size={16} className="text-[color:var(--footer-accent)]" />
                <span>{footerData.locationHall}</span>
              </div>
              <p className="text-[color:var(--footer-copy)] leading-relaxed text-[12px] pl-6 mb-5">
                {footerData.locationAddress}
              </p>
              {footerData.mapsEnabled && (
                <div className="mt-6 w-full h-[160px] sm:h-[200px] rounded-[28px] overflow-hidden bg-[#e6e6e8] relative group">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    title="PUP San Juan Campus map"
                    loading="lazy" 
                    allowFullScreen 
                    referrerPolicy="no-referrer-when-downgrade" 
                    src={getEmbedUrl(footerData.mapsUrl)}
                  ></iframe>
                  <a 
                    href={footerData.mapsUrl || "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-black p-2.5 rounded-xl focus-visible:outline-2 hover:bg-white flex items-center justify-center cursor-pointer"
                    title="Open in Google Maps"
                  >
                    <LinkSquare01Icon size="1em" className="text-[15px]" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Middle Box */}
          <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-6">
            <div className={classic ? "flex-1 grid grid-cols-1 gap-8 rounded-[2.5rem] border border-white/5 bg-zinc-900/40 p-8 shadow-xl sm:grid-cols-2 sm:p-10" : "flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8"}>
              {/* Registrar Schedule */}
              <div>
                <h4 className="text-[11px] uppercase font-sans tabular-nums font-bold text-[color:var(--footer-accent)] tracking-wider mb-4">
                  {footerData.scheduleEyebrow || "Registrar Schedule"}
                </h4>
                <div className="space-y-2.5">
                  {(footerData.scheduleItems || []).map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-2.5 border-b border-[color:var(--footer-divider)] last:border-0 last:pb-0">
                      <span className="text-[11px] text-[color:var(--footer-copy)] font-medium">{item.label}</span>
                      <span className={cn("text-[13px] font-sans tabular-nums", item.status === "closed" ? "text-[color:var(--footer-accent)]" : item.status === "break" ? "text-[color:var(--footer-copy)]" : "text-[color:var(--footer-heading)] font-medium")}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Direct Contact Channels */}
              <div>
                <h4 className="text-[11px] uppercase font-sans tabular-nums font-bold text-[color:var(--footer-accent)] tracking-wider mb-4">
                  {footerData.contactsEyebrow || "Official Desk"}
                </h4>
                <div className="space-y-2.5">
                  {(footerData.contactItems || []).map((contact, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-2.5 border-b border-[color:var(--footer-divider)] last:border-0 last:pb-0">
                      <span className="text-[11px] font-sans tabular-nums text-[color:var(--footer-copy)] uppercase font-medium">{contact.label}</span>
                      {contact.type === "email" ? (
                        <a href={`mailto:${contact.value}`} className="break-all text-[13px] font-medium text-[color:var(--footer-accent)] hover:underline transition-colors">{contact.value}</a>
                      ) : (
                        <span className="text-[13px] font-sans tabular-nums text-[color:var(--footer-heading)]">{contact.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sub-footer Links */}
            <div className={classic ? "rounded-3xl border border-white/5 bg-zinc-900/40 px-8 py-5 shadow-xl flex flex-wrap items-center justify-between gap-4" : "border-t border-[color:var(--footer-divider)] py-5 flex flex-wrap items-center justify-between gap-4"}>
              <span className="text-[11px] font-sans tabular-nums text-[color:var(--footer-copy)]">{footerData.copyrightText}</span>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} title="Scroll to Top" className="text-[11px] font-sans tabular-nums font-medium text-[color:var(--footer-copy)] hover:underline flex items-center gap-1 transition-colors group">
                Top
                <ArrowUp01Icon size="1em" className="text-[10px] group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {footerData.watermarkEnabled && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none select-none overflow-hidden flex justify-center items-end z-0">
          <span
            className="block w-full text-center font-black uppercase tracking-tighter leading-none text-black/[0.05] group-data-classic:text-white/[0.08] select-none pointer-events-none whitespace-nowrap translate-y-[45%]"
            style={{
              fontSize: "clamp(4.5rem, 18vw, 17rem)",
              fontWeight: 900,
              letterSpacing: "-0.05em",
            }}
          >
            {footerData.watermarkText || "EMANAGE"}
          </span>
        </div>
      )}

      </footer>
  );
}
