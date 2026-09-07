"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LandingBento() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("charter");

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 w-full font-inter select-none">
      
      {/* =========================================================================
          ASYMMETRIC EDITORIAL HEADER (Simple, Relatable & Clear)
          ========================================================================= */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-12 sm:mb-16"
      >
        <div className="lg:col-span-7">
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#800000] dark:text-red-400 block mb-3">
            Student &amp; Alumni Services
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1d1d1f] dark:text-white tracking-tight leading-[1.06]">
            Request, track, and<br />
            <span className="text-zinc-400 dark:text-zinc-500">claim your documents</span>
          </h2>
        </div>

        <div className="lg:col-span-5">
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-normal max-w-lg">
            Submit your request online, track its progress in real time, and pick up your official stamped documents at the Registrar counter without waiting in long lines.
          </p>
        </div>
      </motion.div>

      {/* =========================================================================
          BENTO CONTAINER (Reduced Padding Frame)
          Contains 2 Rows:
          - Row 1: 2 Equal Large Cards (50/50 Split)
          - Row 2: 3 Equal Medium Cards (3-Column Split)
          ========================================================================= */}
      <div className="rounded-[2.25rem] bg-[#f4f5f7]/70 dark:bg-zinc-900/40 p-3 sm:p-4 lg:p-5 border border-black/[0.04] dark:border-white/[0.06]">
        
        {/* -----------------------------------------------------------------------
            ROW 1: TWO LARGE CARDS
            Card 1: Request Online in Minutes
            Card 2: Know When It's Ready
            ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
          
          {/* CARD 1: Request Online in Minutes */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-5 border border-black/[0.03] dark:border-white/[0.04] min-h-[220px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  <span>Online Request Portal</span>
                  <span className="text-zinc-500">PUP San Juan</span>
                </div>

                {/* Dropdown: Campus */}
                <div className="p-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold text-[#1d1d1f] dark:text-zinc-200 mb-2 shadow-xs">
                  <span>PUP San Juan Campus</span>
                  <i className="ph-bold ph-caret-down text-zinc-400 text-xs" />
                </div>

                {/* Expanded Accordion: Document & Purpose */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.05] dark:border-white/[0.06] shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-[#800000] dark:text-red-400 mb-2">
                    <span>Choose Document &amp; Purpose</span>
                    <i className="ph-bold ph-caret-up text-xs" />
                  </div>

                  {/* Clean Form Selection Lines */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                        Transcript of Records (TOR)
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 ml-auto">Selected</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-4.5">
                      Purpose: Employment / Job Application
                    </div>
                  </div>
                </div>
              </div>

              {/* Status footer pill */}
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-black/[0.03] dark:border-white/[0.04]">
                <span>Student: 2022-04912-SJ-0</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Verified Student</span>
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white tracking-tight group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors">
                Request Online in Minutes
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-normal">
                Select the document you need, specify your purpose, and submit your request straight from your phone or computer.
              </p>
            </div>
          </motion.div>

          {/* CARD 2: Know When It's Ready */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-5 border border-black/[0.03] dark:border-white/[0.04] min-h-[220px] flex flex-col justify-between">
              <div>
                {/* Header Row */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#800000] to-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    <i className="ph-bold ph-clock text-xs" />
                  </div>
                  <span className="text-xs font-bold text-[#1d1d1f] dark:text-white">
                    Clear Pick-Up Schedule
                  </span>
                </div>

                {/* Subtitle hint */}
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mb-3 font-mono">
                  <i className="ph-bold ph-caret-down text-[10px]" />
                  <span>Counted in working days once cleared</span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-snug mb-3">
                  Processing times depend on the type of document you requested:
                </p>

                {/* Simulated Input Search Box */}
                <div className="p-2.5 px-3 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center gap-2 mb-2.5">
                  <i className="ph-bold ph-magnifying-glass text-zinc-400 text-xs" />
                  <span className="text-xs text-zinc-700 dark:text-zinc-200 font-mono">
                    Tracking #2026-SJ · Clearance Verified
                  </span>
                </div>

                {/* 3 Simple Pick-Up Chips */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="p-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                    <div className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">3 Days</div>
                    <div className="text-[9px] text-emerald-600/80 dark:text-emerald-400 truncate">Grades &amp; Reg.</div>
                  </div>
                  <div className="p-1.5 px-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-center">
                    <div className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">7 Days</div>
                    <div className="text-[9px] text-amber-600/80 dark:text-amber-400 truncate">Clearances</div>
                  </div>
                  <div className="p-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40 text-center">
                    <div className="text-[10px] font-mono font-bold text-red-700 dark:text-red-300">20 Days</div>
                    <div className="text-[9px] text-red-600/80 dark:text-red-400 truncate">Transcripts</div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-2 border-t border-black/[0.03] dark:border-white/[0.04]">
                Stamped with the official university dry seal
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f] dark:text-white tracking-tight group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors">
                Know Exactly When It&apos;s Ready
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-normal">
                Every document follows a clear schedule so you know exactly when to visit the Registrar counter.
              </p>
            </div>
          </motion.div>

        </div>

        {/* -----------------------------------------------------------------------
            ROW 2: THREE MEDIUM CARDS (Simple Terms)
            Card 3: Direct from Campus Archives
            Card 4: What You Need to Prepare
            Card 5: Protected by Law (RA 11032)
            ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          
          {/* CARD 3: Direct from Campus Archives */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area: Archive Node Map */}
            <div className="rounded-2xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-4 border border-black/[0.03] dark:border-white/[0.04] min-h-[180px] flex items-center justify-center relative overflow-hidden">
              {/* Central Node */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#800000] to-red-800 text-white flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-800">
                  <i className="ph-bold ph-archive text-xl" />
                </div>
              </div>

              {/* Orbiting Physical Archive Nodes */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Node Top: Room 1 */}
                <div className="absolute top-3 w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-[10px] font-mono font-bold">
                  R1
                </div>

                {/* Node Left: Cabinet A */}
                <div className="absolute left-4 w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-[10px] font-mono font-bold">
                  C-A
                </div>

                {/* Node Right: Drawer 2 */}
                <div className="absolute right-4 w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-center text-zinc-600 dark:text-zinc-300 text-[10px] font-mono font-bold">
                  D-2
                </div>

                {/* Node Bottom: Dry Seal */}
                <div className="absolute bottom-3 w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs">
                  <i className="ph-bold ph-stamp" />
                </div>

                {/* Circular subtle dashed orbit */}
                <div className="w-36 h-36 rounded-full border border-dashed border-zinc-300 dark:border-zinc-700/60" />
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-5">
              <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors">
                Direct from Campus Archives
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-normal">
                Your online request connects directly to Room 1 archive cabinets, so staff can retrieve your folder faster.
              </p>
            </div>
          </motion.div>

          {/* CARD 4: What You Need to Prepare */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area: Checklist Stack */}
            <div className="rounded-2xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-4 border border-black/[0.03] dark:border-white/[0.04] min-h-[180px] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  Checklist
                </span>

                {/* Primary Checklist Item */}
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.05] dark:border-white/[0.06] shadow-xs">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[10px]">
                      <i className="ph-bold ph-check" />
                    </div>
                    <span className="text-xs font-bold text-[#1d1d1f] dark:text-white">Student Number &amp; Email</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Your official student number and an active email for notifications.
                  </p>
                </div>

                {/* Secondary Layer */}
                <div className="mt-2 p-2 px-3 rounded-xl bg-white/60 dark:bg-zinc-800/60 border border-black/[0.03] dark:border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span>Campus Clearance Stub</span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Required for TOR</span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-1">
                Bring a valid ID when picking up
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-5">
              <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors">
                What You Need to Prepare
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-normal">
                Have your student number, email, and signed clearance ready so your request is evaluated right away.
              </p>
            </div>
          </motion.div>

          {/* CARD 5: Protected by Law (RA 11032) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area: Tabs + Safeguard Cards */}
            <div className="rounded-2xl bg-[#f8f9fa] dark:bg-zinc-800/40 p-4 border border-black/[0.03] dark:border-white/[0.04] min-h-[180px] flex flex-col justify-between">
              <div>
                {/* Simple Segmented Tab Bar */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.05] dark:border-white/[0.06] mb-3 shadow-2xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab("charter");
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      activeTab === "charter"
                        ? "bg-[#800000] text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Promise
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab("arta");
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center justify-center gap-1 ${
                      activeTab === "arta"
                        ? "bg-[#800000] text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    <i className="ph-bold ph-scales text-[10px]" />
                    <span>RA 11032</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab("audit");
                    }}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                      activeTab === "audit"
                        ? "bg-[#800000] text-white shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                    }`}
                  >
                    Tracking
                  </button>
                </div>

                {/* Visual Status Cards */}
                <div className="space-y-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-2.5 shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-[#800000] text-white flex items-center justify-center text-xs shrink-0 font-bold">
                      <i className="ph-bold ph-shield-check" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1d1d1f] dark:text-white">No Unrecorded Delays</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Timestamped upon receipt</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-2.5 shadow-xs">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center text-xs shrink-0 font-bold">
                      <i className="ph-bold ph-clock" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#1d1d1f] dark:text-white">Clear Deadlines</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Always on schedule</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-1">
                Fair, transparent university service
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-5">
              <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f] dark:text-white tracking-tight group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors">
                Protected by Law (RA 11032)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed font-normal">
                Backed by the Ease of Doing Business Act. Transparent tracking with zero hidden delays.
              </p>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
