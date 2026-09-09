"use client";

import React from "react";

export default function DocumentCardPreview({ item, isActive = false }) {
  if (!item) return null;

  return (
    <div
      className={`relative w-[300px] sm:w-[330px] h-[400px] sm:h-[430px] rounded-[32px] p-6 sm:p-7 flex flex-col justify-between select-none overflow-hidden transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-b from-[#800000] via-[#700000] to-[#550000] text-white border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_30px_70px_-15px_rgba(128,0,0,0.5),0_0_1px_1px_rgba(255,255,255,0.1)]"
          : "bg-gradient-to-b from-white/90 via-zinc-50/80 to-zinc-100/75 dark:from-zinc-900/90 dark:via-zinc-900/85 dark:to-zinc-950/85 border border-black/[0.08] dark:border-white/[0.12] text-zinc-900 dark:text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_20px_50px_-12px_rgba(0,0,0,0.08),0_0_1px_1px_rgba(0,0,0,0.03)] hover:border-black/25 dark:hover:border-white/30"
      }`}
      style={{
        fontFamily: 'var(--font-geist), Geist, "Geist Fallback", var(--font-inter), Inter, Helvetica, sans-serif',
      }}
    >
      {/* Liquid Glass Refraction Highlight (Apple-style subtle top gradient sheen) */}
      <div
        className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b pointer-events-none rounded-t-[32px] ${
          isActive ? "from-white/20 to-transparent" : "from-white/40 dark:from-white/[0.07] to-transparent"
        }`}
      />

      {/* Subtle University Watermark Seal */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 200 200"
          className={`w-64 h-64 ${
            isActive ? "text-white opacity-[0.07]" : "text-[#800000] opacity-[0.03] dark:opacity-[0.05]"
          }`}
        >
          <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray="6 3" />
          <circle cx="100" cy="100" r="76" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <polygon points="100,22 122,68 172,74 132,110 146,160 100,134 54,160 68,110 28,74 78,68" fill="currentColor" opacity="0.35" />
        </svg>
      </div>

      {/* Top Header Capsule: University Branding & Code Tag */}
      <div className="relative z-10">
        <div
          className={`flex items-center justify-between border-b pb-3 ${
            isActive ? "border-white/15" : "border-black/[0.05] dark:border-white/[0.06]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shadow-xs ring-1 ${
                isActive
                  ? "bg-white text-[#800000] ring-white/60"
                  : "bg-gradient-to-br from-[#800000] to-[#5a0000] text-white ring-white/30"
              }`}
            >
              PUP
            </div>
            <div>
              <div
                className={`text-[9px] font-mono uppercase tracking-widest font-bold leading-none ${
                  isActive ? "text-red-200/90" : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                PUP San Juan
              </div>
              <div
                className={`text-[11px] font-bold leading-tight mt-0.5 tracking-tight ${
                  isActive ? "text-white" : "text-zinc-900 dark:text-white"
                }`}
              >
                Office of the Registrar
              </div>
            </div>
          </div>
        </div>

        {/* Document Title Banner */}
        <div className="mt-3.5">
          <div
            className={`text-[9px] font-mono uppercase tracking-widest font-bold ${
              isActive ? "text-red-200" : "text-[#800000] dark:text-red-400"
            }`}
          >
            {item.category === "transcripts"
              ? "Academic Record"
              : item.category === "certs"
              ? "Official Certification"
              : "Clearance Credential"}
          </div>
          <h4
            className={`text-[16px] font-extrabold tracking-tight leading-snug line-clamp-1 mt-0.5 ${
              isActive ? "text-white" : "text-zinc-950 dark:text-white"
            }`}
          >
            {item.title}
          </h4>
        </div>
      </div>

      {/* Center Body: High-End Apple-Style Credential Content */}
      <div className="relative z-10 my-auto py-2.5">
        {item.id === "tor" && (
          <div className="space-y-2.5">
            <div
              className={`rounded-2xl p-3 border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-white/80 dark:bg-zinc-800/70 border-black/[0.05] dark:border-white/[0.06]"
              }`}
            >
              <div
                className={`flex justify-between text-[9px] font-mono border-b pb-1.5 font-semibold ${
                  isActive
                    ? "text-red-200/80 border-white/10"
                    : "text-zinc-400 dark:text-zinc-500 border-black/[0.04] dark:border-white/[0.05]"
                }`}
              >
                <span>SUBJECT / CODE</span>
                <span>GRADE</span>
              </div>
              <div className="mt-2 space-y-1.5 text-[10px] font-mono">
                <div className={`flex justify-between ${isActive ? "text-white" : "text-zinc-800 dark:text-zinc-200"}`}>
                  <span className="truncate pr-2 font-medium">COMP 20133 Data Struct.</span>
                  <span className={`font-bold ${isActive ? "text-amber-300" : "text-[#800000] dark:text-red-400"}`}>
                    1.25
                  </span>
                </div>
                <div className={`flex justify-between ${isActive ? "text-white" : "text-zinc-800 dark:text-zinc-200"}`}>
                  <span className="truncate pr-2 font-medium">INTE 30013 Database Sys.</span>
                  <span className={`font-bold ${isActive ? "text-amber-300" : "text-[#800000] dark:text-red-400"}`}>
                    1.50
                  </span>
                </div>
                <div className={`flex justify-between ${isActive ? "text-white" : "text-zinc-800 dark:text-zinc-200"}`}>
                  <span className="truncate pr-2 font-medium">MATH 20023 Discrete Math</span>
                  <span className={`font-bold ${isActive ? "text-amber-300" : "text-[#800000] dark:text-red-400"}`}>
                    1.00
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Capsule */}
            <div className="flex items-center justify-between px-1">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold border ${
                  isActive
                    ? "bg-white/15 border-white/25 text-white"
                    : "bg-red-50/80 dark:bg-red-950/40 border-red-200/60 dark:border-red-900/50 text-red-700 dark:text-red-300"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-300 animate-pulse" : "bg-red-600 animate-pulse"}`} />
                <span>REGISTRAR SEAL VERIFIED</span>
              </div>
              <span className={`text-[10px] font-mono font-bold ${isActive ? "text-red-100" : "text-zinc-500 dark:text-zinc-400"}`}>
                GWA 1.25
              </span>
            </div>
          </div>
        )}

        {item.id === "cog" && (
          <div className="space-y-3">
            <div
              className={`p-3.5 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-200/50 dark:border-emerald-800/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isActive ? "text-emerald-300" : "text-emerald-800 dark:text-emerald-400"
                  }`}
                >
                  Semester Evaluation
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <div className={`text-[12px] font-bold mt-1 ${isActive ? "text-white" : "text-zinc-900 dark:text-white"}`}>
                First Semester, A.Y. 2024–2025
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[9px] font-mono">
                <div
                  className={`p-1.5 rounded-xl border ${
                    isActive
                      ? "bg-white/10 border-white/15 text-white"
                      : "bg-white/90 dark:bg-zinc-800/90 border-black/[0.04] dark:border-white/[0.05] text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  STATUS: <strong className={isActive ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"}>REGULAR</strong>
                </div>
                <div
                  className={`p-1.5 rounded-xl border ${
                    isActive
                      ? "bg-white/10 border-white/15 text-white"
                      : "bg-white/90 dark:bg-zinc-800/90 border-black/[0.04] dark:border-white/[0.05] text-zinc-600 dark:text-zinc-300"
                  }`}
                >
                  TOTAL UNITS: <strong>21.0</strong>
                </div>
              </div>
            </div>
            <div
              className={`text-[9px] font-mono flex items-center justify-between px-1 ${
                isActive ? "text-red-200" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <span>PRC & Scholarship Valid</span>
              <span className={`font-bold ${isActive ? "text-emerald-300" : "text-emerald-700 dark:text-emerald-400"}`}>
                Registrar Certified
              </span>
            </div>
          </div>
        )}

        {item.id === "cor" && (
          <div className="space-y-2.5">
            <div
              className={`rounded-2xl p-3.5 border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-zinc-50/80 dark:bg-zinc-800/60 border-black/[0.05] dark:border-white/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono uppercase font-semibold ${
                    isActive ? "text-red-200" : "text-zinc-400"
                  }`}
                >
                  Enrolled Section
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-white text-[#800000]"
                      : "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950"
                  }`}
                >
                  BSIT 3-1
                </span>
              </div>
              <div
                className={`mt-2 pt-2 border-t text-[10px] space-y-1 ${
                  isActive
                    ? "border-white/10 text-red-100"
                    : "border-black/[0.04] dark:border-white/[0.04] text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <div>Matriculation: <strong>Assessed & Cleared</strong></div>
                <div>Campus Branch: <strong>San Juan City</strong></div>
              </div>
            </div>
            <div
              className={`flex items-center justify-center p-2 rounded-xl border text-[9px] font-mono font-bold ${
                isActive
                  ? "bg-white/15 border-white/20 text-white"
                  : "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300"
              }`}
            >
              OFFICIALLY VALIDATED REGISTRATION
            </div>
          </div>
        )}

        {item.id === "diploma" && (
          <div className="space-y-2.5 text-center">
            <div
              className={`p-3.5 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/40"
              }`}
            >
              <div
                className={`text-[9px] font-serif uppercase tracking-widest font-bold ${
                  isActive ? "text-amber-200" : "text-amber-900 dark:text-amber-300"
                }`}
              >
                Republika ng Pilipinas
              </div>
              <div
                className={`text-[14px] font-serif font-black mt-0.5 tracking-tight ${
                  isActive ? "text-white" : "text-zinc-900 dark:text-white"
                }`}
              >
                DIPLOMA
              </div>
              <div
                className={`text-[9px] font-mono mt-1 ${
                  isActive ? "text-red-100" : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                Bachelor of Science in Information Technology
              </div>
            </div>
            <div
              className={`flex items-center justify-center gap-2 text-[9px] font-mono ${
                isActive ? "text-amber-200" : "text-amber-800 dark:text-amber-400"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold">Gold Seal • Board of Regents Certified</span>
            </div>
          </div>
        )}

        {item.id === "moral" && (
          <div className="space-y-2.5">
            <div
              className={`p-3 rounded-2xl border text-center shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-zinc-50/80 dark:bg-zinc-800/60 border-black/[0.05] dark:border-white/[0.06]"
              }`}
            >
              <div
                className={`text-[9px] font-mono uppercase tracking-wider font-semibold ${
                  isActive ? "text-red-200" : "text-zinc-400"
                }`}
              >
                Student Affairs & Services
              </div>
              <div
                className={`text-[12px] font-bold mt-0.5 ${
                  isActive ? "text-white" : "text-zinc-900 dark:text-white"
                }`}
              >
                Certificate of Good Moral
              </div>
              <p
                className={`text-[9px] mt-1 italic ${
                  isActive ? "text-red-100" : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                &ldquo;Zero derogatory records or infractions during academic tenure.&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono px-1">
              <span className={isActive ? "text-red-200/80" : "text-zinc-400"}>Signed: OSAS Director</span>
              <span className={`font-bold ${isActive ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"}`}>
                Cleared
              </span>
            </div>
          </div>
        )}

        {item.id === "cav" && (
          <div className="space-y-2.5">
            <div
              className={`p-3 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-red-50/50 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono font-bold ${
                    isActive ? "text-white" : "text-red-800 dark:text-red-300"
                  }`}
                >
                  DFA / CHED CAV
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[8px] font-mono rounded ${
                    isActive ? "bg-white/20 text-white" : "bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200"
                  }`}
                >
                  Apostille
                </span>
              </div>
              <div
                className={`text-[10px] font-medium mt-1.5 leading-relaxed ${
                  isActive ? "text-red-100" : "text-zinc-700 dark:text-zinc-300"
                }`}
              >
                Authentication & Verification for Overseas Employment & Graduate Studies.
              </div>
            </div>
            <div
              className={`flex items-center justify-between text-[9px] font-mono px-1 ${
                isActive ? "text-red-200" : "text-zinc-500"
              }`}
            >
              <span>Red Ribbon Certified</span>
              <span className={`font-bold ${isActive ? "text-amber-300" : "text-amber-700 dark:text-amber-400"}`}>
                Apostille Cleared
              </span>
            </div>
          </div>
        )}

        {item.id === "ctc" && (
          <div className="space-y-2.5">
            <div
              className={`p-3 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30"
              }`}
            >
              <div
                className={`text-[9px] font-mono uppercase font-bold ${
                  isActive ? "text-amber-300" : "text-amber-800 dark:text-amber-400"
                }`}
              >
                Transfer Release
              </div>
              <div
                className={`text-[12px] font-bold mt-0.5 ${
                  isActive ? "text-white" : "text-zinc-900 dark:text-white"
                }`}
              >
                Honorable Dismissal
              </div>
              <div
                className={`text-[9px] font-mono mt-1 ${
                  isActive ? "text-red-100" : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Official release of credentials for university transfer.
              </div>
            </div>
            <div
              className={`flex items-center justify-between text-[9px] font-mono px-1 ${
                isActive ? "text-red-200" : "text-zinc-400"
              }`}
            >
              <span>Surrender ID Required</span>
              <span className={`font-semibold ${isActive ? "text-amber-300" : "text-amber-700 dark:text-amber-400"}`}>
                Release Approved
              </span>
            </div>
          </div>
        )}

        {item.id === "certified_copy" && (
          <div className="space-y-2.5 relative">
            <div
              className={`p-3 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-zinc-50/80 dark:bg-zinc-800/60 border-black/[0.05] dark:border-white/[0.06]"
              }`}
            >
              <div
                className={`text-[9px] font-mono font-semibold ${
                  isActive ? "text-red-200" : "text-zinc-400"
                }`}
              >
                Document Endorsement
              </div>
              <div
                className={`text-[12px] font-bold mt-0.5 ${
                  isActive ? "text-white" : "text-zinc-900 dark:text-white"
                }`}
              >
                Certified True Copy (CTC)
              </div>
              <div
                className={`text-[9px] font-mono mt-1 ${
                  isActive ? "text-red-100" : "text-zinc-500"
                }`}
              >
                Dry Seal & Registrar signature verification on original reproduction.
              </div>
            </div>
            {/* Rubber Stamp Badge */}
            <div className="flex items-center justify-center">
              <div
                className={`inline-block border-2 border-dashed px-2.5 py-0.5 rounded-lg text-[9px] font-mono font-black tracking-wider rotate-[-3deg] shadow-xs ${
                  isActive
                    ? "border-white/80 text-white bg-white/10"
                    : "border-red-600/80 text-red-600 dark:text-red-400"
                }`}
              >
                CERTIFIED TRUE COPY
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Barcode & Status */}
      <div
        className={`relative z-10 pt-3 border-t flex items-center justify-between text-[9px] font-mono ${
          isActive ? "border-white/15" : "border-black/[0.05] dark:border-white/[0.06]"
        }`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            isActive ? "text-red-200" : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          <svg viewBox="0 0 50 14" className="w-12 h-3.5 fill-current opacity-75">
            <rect x="0" y="0" width="2" height="14" />
            <rect x="4" y="0" width="1" height="14" />
            <rect x="7" y="0" width="3" height="14" />
            <rect x="12" y="0" width="1" height="14" />
            <rect x="15" y="0" width="2" height="14" />
            <rect x="19" y="0" width="4" height="14" />
            <rect x="25" y="0" width="1" height="14" />
            <rect x="28" y="0" width="3" height="14" />
            <rect x="33" y="0" width="2" height="14" />
            <rect x="37" y="0" width="1" height="14" />
            <rect x="40" y="0" width="3" height="14" />
            <rect x="45" y="0" width="2" height="14" />
            <rect x="48" y="0" width="2" height="14" />
          </svg>
          <span className={`text-[8px] font-bold ${isActive ? "text-white" : ""}`}>PUPSJ-RMS</span>
        </div>

        <span
          className={`text-[9px] font-mono font-semibold uppercase tracking-wider ${
            isActive ? "text-red-200" : "text-zinc-400 dark:text-zinc-500"
          }`}
        >
          Official Record
        </span>
      </div>
    </div>
  );
}
