"use client";

import React from "react";

export default function DocumentCardPreview({ item, isActive = false }) {
  if (!item) return null;
  const style = item.previewStyle || item.id;

  return (
    <div
      className={`relative w-[300px] sm:w-[330px] h-[400px] sm:h-[430px] rounded-[32px] p-6 sm:p-7 flex flex-col justify-between select-none overflow-hidden transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-b from-[#800000] via-[#700000] to-[#550000] text-white border border-white/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_30px_70px_-15px_rgba(128,0,0,0.5),0_0_1px_1px_rgba(255,255,255,0.1)]"
          : "bg-gradient-to-b from-white/90 via-zinc-50/80 to-zinc-100/75    border border-black/[0.08] [0.12] text-zinc-900  shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_20px_50px_-12px_rgba(0,0,0,0.08),0_0_1px_1px_rgba(0,0,0,0.03)] hover:border-black/25 :border-white/30"
      }`}
      style={{
        fontFamily: 'var(--font-jakarta), var(--font-jakarta), Helvetica, sans-serif',
      }}
    >
      {/* Liquid Glass Refraction Highlight (Apple-style subtle top gradient sheen) */}
      <div
        className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b pointer-events-none rounded-t-[32px] ${
          isActive ? "from-white/20 to-transparent" : "from-white/40 [0.07] to-transparent"
        }`}
      />


      {/* Top Header Capsule: University Branding & Code Tag */}
      <div className="relative z-10">
        <div
          className={`flex items-center justify-between border-b pb-3 ${
            isActive ? "border-white/15" : "border-black/[0.05] [0.06]"
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
                  isActive ? "text-red-200/90" : "text-zinc-400 "
                }`}
              >
                PUP San Juan
              </div>
              <div
                className={`text-[11px] font-bold leading-tight mt-0.5 tracking-tight ${
                  isActive ? "text-white" : "text-zinc-900 "
                }`}
              >
                Office of the Registrar
              </div>
            </div>
          </div>

          {item.code && (
            <span
              className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider border ${
                isActive
                  ? "bg-white/15 border-white/25 text-white"
                  : "bg-black/[0.04] [0.06] border-black/[0.06] [0.08] text-zinc-600 "
              }`}
            >
              {item.code}
            </span>
          )}
        </div>

        {/* Document Title Banner */}
        <div className="mt-3.5">
          <div
            className={`text-[9px] font-mono uppercase tracking-widest font-bold ${
              isActive ? "text-red-200" : "text-[#800000] "
            }`}
          >
            {item.category === "transcripts"
              ? "Academic Record"
              : item.category === "certs"
              ? "Official Certification"
              : item.category === "clearances"
              ? "Clearance Credential"
              : item.category || "Official Credential"}
          </div>
          <h4
            className={`text-[16px] font-extrabold tracking-tight leading-snug line-clamp-1 mt-0.5 ${
              isActive ? "text-white" : "text-zinc-950 "
            }`}
          >
            {item.title}
          </h4>
        </div>
      </div>

      {/* Center Body: High-End Apple-Style Credential Content */}
      <div className="relative z-10 my-auto py-2.5">
        {style === "tor" && (
          <div className="space-y-2.5">
            <div
              className={`rounded-2xl p-3 border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-white/80  border-black/[0.05] [0.06]"
              }`}
            >
              <div
                className={`flex justify-between text-[9px] font-mono border-b pb-1.5 font-semibold ${
                  isActive
                    ? "text-red-200/80 border-white/10"
                    : "text-zinc-400  border-black/[0.04] [0.05]"
                }`}
              >
                <span>SUBJECT / CODE</span>
                <span>GRADE</span>
              </div>
              <div className="mt-2 space-y-1.5 text-[10px] font-mono">
                <div className={`flex justify-between ${isActive ? "text-white" : "text-zinc-800 "}`}>
                  <span className="truncate pr-2 font-medium">COMP 20133 Data Struct.</span>
                  <span className={`font-bold ${isActive ? "text-amber-300" : "text-[#800000] "}`}>
                    1.25
                  </span>
                </div>
                <div className={`flex justify-between ${isActive ? "text-white" : "text-zinc-800 "}`}>
                  <span className="truncate pr-2 font-medium">INTE 30013 Database Sys.</span>
                  <span className={`font-bold ${isActive ? "text-amber-300" : "text-[#800000] "}`}>
                    1.50
                  </span>
                </div>
                <div className={`flex justify-between ${isActive ? "text-white" : "text-zinc-800 "}`}>
                  <span className="truncate pr-2 font-medium">MATH 20023 Discrete Math</span>
                  <span className={`font-bold ${isActive ? "text-amber-300" : "text-[#800000] "}`}>
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
                    : "bg-red-50/80  border-red-200/60  text-red-700 "
                }`}
              >
                
                <span>REGISTRAR SEAL VERIFIED</span>
              </div>
              <span className={`text-[10px] font-mono font-bold ${isActive ? "text-red-100" : "text-zinc-500 "}`}>
                GWA 1.25
              </span>
            </div>
          </div>
        )}

        {style === "cog" && (
          <div className="space-y-3">
            <div
              className={`p-3.5 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-emerald-50/50  border-emerald-200/50 "
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isActive ? "text-emerald-300" : "text-emerald-800 "
                  }`}
                >
                  Semester Evaluation
                </span>
                
              </div>
              <div className={`text-[12px] font-bold mt-1 ${isActive ? "text-white" : "text-zinc-900 "}`}>
                First Semester, A.Y. 2024–2025
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 text-[9px] font-mono">
                <div
                  className={`p-1.5 rounded-xl border ${
                    isActive
                      ? "bg-white/10 border-white/15 text-white"
                      : "bg-white/90  border-black/[0.04] [0.05] text-zinc-600 "
                  }`}
                >
                  STATUS: <strong className={isActive ? "text-emerald-300" : "text-emerald-600 "}>REGULAR</strong>
                </div>
                <div
                  className={`p-1.5 rounded-xl border ${
                    isActive
                      ? "bg-white/10 border-white/15 text-white"
                      : "bg-white/90  border-black/[0.04] [0.05] text-zinc-600 "
                  }`}
                >
                  TOTAL UNITS: <strong>21.0</strong>
                </div>
              </div>
            </div>
            <div
              className={`text-[9px] font-mono flex items-center justify-between px-1 ${
                isActive ? "text-red-200" : "text-zinc-500 "
              }`}
            >
              <span>PRC & Scholarship Valid</span>
              <span className={`font-bold ${isActive ? "text-emerald-300" : "text-emerald-700 "}`}>
                Registrar Certified
              </span>
            </div>
          </div>
        )}

        {style === "cor" && (
          <div className="space-y-2.5">
            <div
              className={`rounded-2xl p-3.5 border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-zinc-50/80  border-black/[0.05] [0.06]"
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
                      : "bg-zinc-900 text-white  "
                  }`}
                >
                  BSIT 3-1
                </span>
              </div>
              <div
                className={`mt-2 pt-2 border-t text-[10px] space-y-1 ${
                  isActive
                    ? "border-white/10 text-red-100"
                    : "border-black/[0.04] [0.04] text-zinc-600 "
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
                  : "bg-emerald-50/80  border-emerald-200/60  text-emerald-800 "
              }`}
            >
              OFFICIALLY VALIDATED REGISTRATION
            </div>
          </div>
        )}

        {style === "diploma" && (
          <div className="space-y-2.5 text-center">
            <div
              className={`p-3.5 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-amber-50/50  border-amber-200/60 "
              }`}
            >
              <div
                className={`text-[9px] font-serif uppercase tracking-widest font-bold ${
                  isActive ? "text-amber-200" : "text-amber-900 "
                }`}
              >
                Republika ng Pilipinas
              </div>
              <div
                className={`text-[14px] font-serif font-black mt-0.5 tracking-tight ${
                  isActive ? "text-white" : "text-zinc-900 "
                }`}
              >
                DIPLOMA
              </div>
              <div
                className={`text-[9px] font-mono mt-1 ${
                  isActive ? "text-red-100" : "text-zinc-500 "
                }`}
              >
                Bachelor of Science in Information Technology
              </div>
            </div>
            <div
              className={`flex items-center justify-center gap-2 text-[9px] font-mono ${
                isActive ? "text-amber-200" : "text-amber-800 "
              }`}
            >
              
              <span className="font-semibold">Gold Seal • Board of Regents Certified</span>
            </div>
          </div>
        )}

        {style === "moral" && (
          <div className="space-y-2.5">
            <div
              className={`p-3 rounded-2xl border text-center shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-zinc-50/80  border-black/[0.05] [0.06]"
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
                  isActive ? "text-white" : "text-zinc-900 "
                }`}
              >
                Certificate of Good Moral
              </div>
              <p
                className={`text-[9px] mt-1 italic ${
                  isActive ? "text-red-100" : "text-zinc-500 "
                }`}
              >
                &ldquo;Zero derogatory records or infractions during academic tenure.&rdquo;
              </p>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono px-1">
              <span className={isActive ? "text-red-200/80" : "text-zinc-400"}>Signed: OSAS Director</span>
              <span className={`font-bold ${isActive ? "text-emerald-300" : "text-emerald-600 "}`}>
                Cleared
              </span>
            </div>
          </div>
        )}

        {style === "cav" && (
          <div className="space-y-2.5">
            <div
              className={`p-3 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-red-50/50  border-red-200/60 "
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono font-bold ${
                    isActive ? "text-white" : "text-red-800 "
                  }`}
                >
                  DFA / CHED CAV
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[8px] font-mono rounded ${
                    isActive ? "bg-white/20 text-white" : "bg-red-100  text-red-800 "
                  }`}
                >
                  Apostille
                </span>
              </div>
              <div
                className={`text-[10px] font-medium mt-1.5 leading-relaxed ${
                  isActive ? "text-red-100" : "text-zinc-700 "
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
              <span className={`font-bold ${isActive ? "text-amber-300" : "text-amber-700 "}`}>
                Apostille Cleared
              </span>
            </div>
          </div>
        )}

        {(style === "ctc" || style === "dismissal") && (
          <div className="space-y-2.5">
            <div
              className={`p-3 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-amber-50/50  border-amber-200/50 "
              }`}
            >
              <div
                className={`text-[9px] font-mono uppercase font-bold ${
                  isActive ? "text-amber-300" : "text-amber-800 "
                }`}
              >
                Transfer Release
              </div>
              <div
                className={`text-[12px] font-bold mt-0.5 ${
                  isActive ? "text-white" : "text-zinc-900 "
                }`}
              >
                Honorable Dismissal
              </div>
              <div
                className={`text-[9px] font-mono mt-1 ${
                  isActive ? "text-red-100" : "text-zinc-600 "
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
              <span className={`font-semibold ${isActive ? "text-amber-300" : "text-amber-700 "}`}>
                Release Approved
              </span>
            </div>
          </div>
        )}

        {(style === "certified_copy" || style === "stamp") && (
          <div className="space-y-2.5 relative">
            <div
              className={`p-3 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-zinc-50/80  border-black/[0.05] [0.06]"
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
                  isActive ? "text-white" : "text-zinc-900 "
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
                    : "border-red-600/80 text-red-600 "
                }`}
              >
                CERTIFIED TRUE COPY
              </div>
            </div>
          </div>
        )}

        {!["tor", "cog", "cor", "diploma", "moral", "cav", "ctc", "dismissal", "certified_copy", "stamp"].includes(style) && (
          <div className="space-y-2.5">
            <div
              className={`p-3.5 rounded-2xl border shadow-2xs ${
                isActive
                  ? "bg-black/25 border-white/15 backdrop-blur-sm"
                  : "bg-zinc-50/80  border-black/[0.05] [0.06]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                    isActive ? "text-red-200" : "text-[#800000] "
                  }`}
                >
                  {item.client || "Official Credential"}
                </span>
                
              </div>
              <div
                className={`text-[12px] font-bold mt-1 tracking-tight line-clamp-1 ${
                  isActive ? "text-white" : "text-zinc-900 "
                }`}
              >
                {item.title}
              </div>
              <div
                className={`mt-2 pt-2 border-t text-[9px] font-mono leading-relaxed line-clamp-2 ${
                  isActive
                    ? "border-white/10 text-red-100/90"
                    : "border-black/[0.04] [0.04] text-zinc-600 "
                }`}
              >
                {item.description}
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold border ${
                  isActive
                    ? "bg-white/15 border-white/25 text-white"
                    : "bg-emerald-50/80  border-emerald-200/60  text-emerald-800 "
                }`}
              >
                
                <span>{item.sealTag || "REGISTRAR SEAL VERIFIED"}</span>
              </div>
              <span className={`text-[9px] font-mono font-bold ${isActive ? "text-red-200" : "text-zinc-500 "}`}>
                {item.code || "PUPSJ"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Barcode & Status */}
      <div
        className={`relative z-10 pt-3 border-t flex items-center justify-between text-[9px] font-mono ${
          isActive ? "border-white/15" : "border-black/[0.05] [0.06]"
        }`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            isActive ? "text-red-200" : "text-zinc-400 "
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
            isActive ? "text-red-200" : "text-zinc-400 "
          }`}
        >
          Official Record
        </span>
      </div>
    </div>
  );
}
