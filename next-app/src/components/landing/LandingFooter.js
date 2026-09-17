"use client";
import LucideIcon from "@/components/shared/LucideIcon";
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
        console.error("[LandingFooter] Fetch error:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <footer
      id="office"
      className="bg-zinc-950 text-zinc-400 border-t border-zinc-800/80 pt-10 sm:pt-12 pb-6 text-xs mt-auto font-inter select-none scroll-mt-20 w-full overflow-hidden relative"
    >
      {/* =====================================================================
          TOP SECTION: INSTITUTIONAL CREDENTIALS & DIRECTORY GRID (3-COLUMN)
          ===================================================================== */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 pb-8 sm:pb-10 border-b border-zinc-800/80">
          {/* Column 1: Campus Identity & Physical Archive Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <Image
                  src="/assets/branding/white-icon.png"
                  alt="eManage Logo"
                  width={24}
                  height={24}
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">
                eManage
              </span>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed font-normal">
              {footerData.brandSubtitle}
            </p>

            <div className="pt-2 text-xs space-y-1.5">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                <LucideIcon  className="ph-bold ph-map-pin text-red-400 text-sm" />
                <span>{footerData.locationHall}</span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-[11px] pl-5">
                {footerData.locationAddress}
              </p>
              {footerData.mapsEnabled && (
                <div className="pl-5 pt-1">
                  <a
                    href={
                      footerData.mapsUrl ||
                      "https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline"
                  >
                    <span>{footerData.mapsLabel || "Google Maps Directions"}</span>
                    <LucideIcon  className="ph-bold ph-arrow-square-out text-[10px]" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Registrar Window Hours */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 block">
              {footerData.scheduleEyebrow || "Registrar Schedule"}
            </span>
            <div className="font-bold text-sm text-white">
              {footerData.scheduleHeading || "Regular Office Hours"}
            </div>

            <div className="space-y-2.5 text-xs">
              {(footerData.scheduleItems || []).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between pb-1.5 border-b border-zinc-800"
                >
                  <span className="text-zinc-400">{item.label}</span>
                  <span
                    className={cn(
                      "font-mono",
                      item.status === "closed"
                        ? "font-medium text-rose-400"
                        : item.status === "break"
                        ? "text-zinc-400"
                        : "font-bold text-white"
                    )}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Direct Inquiries & Permanent Personnel Sign In */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 block">
              {footerData.contactsEyebrow || "Official Desk"}
            </span>
            <div className="font-bold text-sm text-white">
              {footerData.contactsHeading || "Direct Contact Channels"}
            </div>

            <div className="space-y-2.5 text-xs">
              {(footerData.contactItems || []).map((contact, idx) => (
                <div key={idx}>
                  <span className="block text-[10px] font-mono text-zinc-500 uppercase">
                    {contact.label}
                  </span>
                  {contact.type === "email" ? (
                    <a
                      href={`mailto:${contact.value}`}
                      className="font-semibold text-red-400 hover:text-red-300 hover:underline break-all"
                    >
                      {contact.value}
                    </a>
                  ) : (
                    <span className="font-mono text-zinc-300">
                      {contact.value}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Permanent Personnel Sign In Link */}
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors group"
              >
                <span>Personnel Sign In</span>
                <LucideIcon  className="ph-bold ph-arrow-right text-[11px] text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          GIANT BRAND WATERMARK: EMANAGE (OVERLAY BELOW THE TEXT)
          Layered in background (z-0), clearly visible, showing top half of letters
          rising from the bottom edge underneath the sub-footer overlay
          ===================================================================== */}
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

      {/* =====================================================================
          BOTTOM SUB-FOOTER: COPYRIGHT & BACK TO TOP (RELATIVE Z-10)
          Streamlined single-row layout with Back to Top button
          ===================================================================== */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left text-zinc-400">
          <span>{footerData.copyrightText}</span>
        </div>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-zinc-400 select-none group"
        >
          <span>Back to Top</span>
          <LucideIcon  className="ph-bold ph-arrow-up text-[10px] group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </footer>
  );
}
