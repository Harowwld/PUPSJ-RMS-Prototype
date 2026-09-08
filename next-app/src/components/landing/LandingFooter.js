"use client";

import Link from "next/link";
import Image from "next/image";

export default function LandingFooter() {
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
              Polytechnic University of the Philippines — San Juan Campus Records Keeping &amp; Online Document Request Platform.
            </p>

            <div className="pt-2 text-xs space-y-1.5">
              <div className="font-bold text-zinc-200 flex items-center gap-1.5">
                <i className="ph-bold ph-map-pin text-red-400 text-sm" />
                <span>Ground Floor, Admin &amp; Records Hall</span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-[11px] pl-5">
                223 Ortega Street, cor. A. Mabini Street, Barangay Addition Hills, San Juan City, Metro Manila 1500
              </p>
              <div className="pl-5 pt-1">
                <a
                  href="https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 hover:underline"
                >
                  <span>Google Maps Directions</span>
                  <i className="ph-bold ph-arrow-square-out text-[10px]" />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Registrar Window Hours */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 block">
              Registrar Schedule
            </span>
            <div className="font-bold text-sm text-white">
              Regular Office Hours
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Monday – Friday</span>
                <span className="font-mono font-bold text-white">8:00 AM – 5:00 PM</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Noon Break Shift</span>
                <span className="font-mono text-zinc-400">12:00 PM – 1:00 PM</span>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800">
                <span className="text-zinc-400">Weekends &amp; Holidays</span>
                <span className="font-medium text-rose-400">Closed</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-white/[0.06] text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-zinc-200">3:00 PM Cut-off:</strong> Same-day evaluation filings close at 3:00 PM on campus working days.
            </div>
          </div>

          {/* Column 3: Direct Inquiries & Personnel Sign In */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 block">
              Official Desk
            </span>
            <div className="font-bold text-sm text-white">
              Direct Contact Channels
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="block text-[10px] font-mono text-zinc-500 uppercase">Registrar Inquiries</span>
                <a 
                  href="mailto:registrar.sanjuan@pup.edu.ph" 
                  className="font-semibold text-red-400 hover:text-red-300 hover:underline break-all"
                >
                  registrar.sanjuan@pup.edu.ph
                </a>
              </div>

              <div>
                <span className="block text-[10px] font-mono text-zinc-500 uppercase">Student Affairs (OSAS)</span>
                <a 
                  href="mailto:osas.sanjuan@pup.edu.ph" 
                  className="font-medium text-zinc-300 hover:text-white hover:underline break-all"
                >
                  osas.sanjuan@pup.edu.ph
                </a>
              </div>

              <div>
                <span className="block text-[10px] font-mono text-zinc-500 uppercase">Campus Trunklines</span>
                <span className="font-mono text-zinc-300">
                  (02) 8724-4112 / (02) 8724-4113
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-semibold transition-colors"
              >
                <span>Personnel Sign In</span>
                <i className="ph-bold ph-arrow-right text-[11px]" />
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
      <div className="absolute inset-x-0 bottom-0 pointer-events-none select-none overflow-hidden flex justify-center items-end z-0">
        <span 
          className="block w-full text-center font-black uppercase tracking-tighter leading-none text-white/[0.08] sm:text-white/[0.09] select-none pointer-events-none whitespace-nowrap translate-y-[45%]"
          style={{
            fontSize: "clamp(4.5rem, 18vw, 17rem)",
            fontWeight: 900,
            letterSpacing: "-0.05em",
          }}
        >
          EMANAGE
        </span>
      </div>

      {/* =====================================================================
          BOTTOM SUB-FOOTER: COPYRIGHT & COMPLIANCE (RELATIVE Z-10)
          ===================================================================== */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
        
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left text-zinc-400">
          <span>© 2026 PUP San Juan Campus · All rights reserved.</span>
          <span className="hidden sm:inline text-zinc-700">·</span>
          <span className="text-[11px] font-mono text-zinc-400">RA 11032 ARTA Compliant</span>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-xs text-zinc-300">
          <a href="#catalog" className="hover:text-white transition-colors">
            Services
          </a>
          <a href="#workflow" className="hover:text-white transition-colors">
            Workflow
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
          <button 
            type="button" 
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>Back to Top</span>
            <i className="ph-bold ph-arrow-up text-[10px]" />
          </button>
        </div>

      </div>

    </footer>
  );
}

