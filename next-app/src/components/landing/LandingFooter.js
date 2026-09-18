"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

const DEFAULT_FOOTER = {
  brandName: "eManage",
  brandSubtitle:
    "Polytechnic University of the Philippines — San Juan Campus Records Keeping & Online Document Request Platform.",
  locationHall: "Ground Floor, Admin & Records Hall",
  locationAddress:
    "223 Ortega Street, cor. A. Mabini Street, Barangay Addition Hills, San Juan City, Metro Manila 1500",
  mapsEnabled: true,
  mapsLabel: "Google Maps Directions",
  mapsUrl:
    "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus",

  scheduleEyebrow: "Registrar Schedule",
  scheduleHeading: "Regular Office Hours",
  scheduleItems: [
    { label: "Monday – Friday", value: "8:00 AM – 5:00 PM", status: "open" },
    { label: "Noon Break Shift", value: "12:00 PM – 1:00 PM", status: "break" },
    { label: "Weekends & Holidays", value: "Closed", status: "closed" },
  ],

  contactsEyebrow: "Official Desk",
  contactsHeading: "Direct Contact Channels",
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

export default function LandingFooter() {
  const [footerData, setFooterData] = useState(DEFAULT_FOOTER);

  useEffect(() => {
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
  }, []);


  const getEmbedUrl = (mapsUrl) => {
    try {
      const url = new URL(mapsUrl || "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus");
      const q = url.searchParams.get("q") || "Polytechnic University of the Philippines San Juan Campus";
      return `https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${encodeURIComponent(q)}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;
    } catch (e) {
      return `https://maps.google.com/maps?width=100%25&height=600&hl=en&q=${encodeURIComponent("Polytechnic University of the Philippines San Juan Campus")}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;
    }
  };

  return (
    <footer
      id="office"
      className="bg-zinc-950 text-zinc-400 border-t border-zinc-800/80 pt-10 sm:pt-12 pb-6 text-xs mt-auto font-jakarta select-none scroll-mt-20 w-full overflow-hidden relative"
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
          <div className="lg:col-span-5 bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 sm:p-12 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Image src="/assets/branding/white-icon.png" alt="eManage Logo" width={32} height={32} className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-2xl text-white tracking-tight">
                  eManage
                </span>
              </div>
              <p className="text-[13px] text-zinc-400 leading-relaxed font-normal mb-8 max-w-sm">
                {footerData.brandSubtitle}
              </p>
            </div>
            
            <div className="pt-6 border-t border-white/5">
              <div className="font-bold text-zinc-200 flex items-center gap-2 mb-2 text-sm">
                <HugeIcon className="ph-bold ph-map-pin text-red-400" />
                <span>{footerData.locationHall}</span>
              </div>
              <p className="text-zinc-500 leading-relaxed text-[12px] pl-6 mb-5">
                {footerData.locationAddress}
              </p>
              {footerData.mapsEnabled && (
                <div className="mt-6 w-full h-[160px] sm:h-[200px] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 relative group">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    loading="lazy" 
                    allowFullScreen 
                    referrerPolicy="no-referrer-when-downgrade" 
                    src={getEmbedUrl(footerData.mapsUrl)}
                  ></iframe>
                  <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-2xl"></div>
                  <a 
                    href={footerData.mapsUrl || "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md text-black p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white shadow-xl flex items-center justify-center cursor-pointer"
                    title="Open in Google Maps"
                  >
                    <HugeIcon className="ph-bold ph-arrow-square-out text-[15px]" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Middle Box */}
          <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-6">
            <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-[2.5rem] p-8 sm:p-10 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 shadow-xl">
              {/* Registrar Schedule */}
              <div>
                <h4 className="text-[11px] uppercase font-mono font-bold text-red-400 tracking-wider mb-4">
                  {footerData.scheduleEyebrow || "Registrar Schedule"}
                </h4>
                <div className="space-y-2.5">
                  {(footerData.scheduleItems || []).map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-2.5 border-b border-white/5 last:border-0 last:pb-0">
                      <span className="text-[11px] text-zinc-500 font-medium">{item.label}</span>
                      <span className={cn("text-[13px] font-mono", item.status === "closed" ? "text-rose-400" : item.status === "break" ? "text-zinc-400" : "text-white font-medium")}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Direct Contact Channels */}
              <div>
                <h4 className="text-[11px] uppercase font-mono font-bold text-red-400 tracking-wider mb-4">
                  {footerData.contactsEyebrow || "Official Desk"}
                </h4>
                <div className="space-y-2.5">
                  {(footerData.contactItems || []).map((contact, idx) => (
                    <div key={idx} className="flex flex-col gap-1 pb-2.5 border-b border-white/5 last:border-0 last:pb-0">
                      <span className="text-[11px] font-mono text-zinc-500 uppercase font-medium">{contact.label}</span>
                      {contact.type === "email" ? (
                        <a href={`mailto:${contact.value}`} className="text-[13px] font-medium text-zinc-200 hover:text-white transition-colors">{contact.value}</a>
                      ) : (
                        <span className="text-[13px] font-mono text-zinc-300">{contact.value}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sub-footer Links */}
            <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-[1.5rem] px-8 sm:px-10 py-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <span className="text-[11px] font-mono text-zinc-500">{footerData.copyrightText}</span>
              <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-[11px] font-mono font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group">
                Back to Top
                <HugeIcon className="ph-bold ph-arrow-up text-[10px] group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {footerData.watermarkEnabled && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none select-none overflow-hidden flex justify-center items-end z-0">
          <span
            className="block w-full text-center font-black uppercase tracking-tighter leading-none text-white/[0.08] sm:text-white/[0.09] select-none pointer-events-none whitespace-nowrap translate-y-[45%]"
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
