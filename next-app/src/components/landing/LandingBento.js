"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_BENTO_CONTENT = {
  eyebrow: "Student & Alumni Services",
  headingLine1: "Request, track, and",
  headingLine2: "claim your documents",
  description:
    "Submit your request online, track its progress in real time, and pick up your official stamped documents at the Registrar counter without waiting in long lines.",
  card1: {
    title: "Request Online in Minutes",
    description:
      "Select the document you need, specify your purpose, and submit your request straight from your phone or computer.",
    portalTag: "Online Request Portal",
    campusLabel: "PUP San Juan Campus",
    accordionTitle: "Choose Document & Purpose",
    documents: [
      {
        name: "Transcript of Records (TOR)",
        purpose: "Employment / Job Application",
        tag: "Selected",
      },
      {
        name: "Certificate of Grades (COG)",
        purpose: "Scholarship & Honor Evaluation",
        tag: "Selected",
      },
      {
        name: "Certificate of Registration",
        purpose: "PRC Licensure Exam Filing",
        tag: "Selected",
      },
      {
        name: "Certified True Copy (CTC)",
        purpose: "Government & Embassy Clearance",
        tag: "Selected",
      },
    ],
    studentStub: "Student: 2022-04912-SJ-0",
    verifiedBadge: "Verified Student",
  },
  card2: {
    title: "Know Exactly When It's Ready",
    description:
      "Every document follows a clear schedule so you know exactly when to visit the Registrar counter.",
    headerText: "Clear Pick-Up Schedule",
    subtitleHint: "Counted in working days once cleared",
    instructionsText: "Processing times depend on the type of document you requested:",
    trackingSample: "Tracking #2026-SJ · Clearance Verified",
    slaChips: [
      { days: "3 Days", label: "Grades & Reg." },
      { days: "7 Days", label: "Clearances" },
      { days: "20 Days", label: "Transcripts" },
    ],
    sealFooter: "Stamped with the official university dry seal",
  },
  card3: {
    title: "Direct from Campus Archives",
    description:
      "Your online request connects directly to Room 1 archive cabinets, so staff can retrieve your folder faster.",
    roomCode: "R1",
    cabinetCode: "C-A",
    drawerCode: "D-2",
  },
  card4: {
    title: "What You Need to Prepare",
    description:
      "Have your student number, email, and signed clearance ready so your request is evaluated right away.",
    checklistHeader: "Checklist",
    primaryItemTitle: "Student Number & Email",
    primaryItemDesc: "Your official student number and an active email for notifications.",
    secondaryItemTitle: "Campus Clearance Stub",
    secondaryItemBadge: "Required for TOR",
    footerNote: "Bring a valid ID when picking up",
  },
  card5: {
    title: "Protected by Law (RA 11032)",
    description:
      "Backed by the Ease of Doing Business Act. Transparent tracking with zero hidden delays.",
    tab1Label: "Promise",
    tab2Label: "RA 11032",
    tab3Label: "Tracking",
    charterItems: [
      { icon: "ph-shield-check", title: "No Unrecorded Delays", desc: "Timestamped upon receipt", bg: "bg-[#800000]" },
      { icon: "ph-clock", title: "Clear Deadlines", desc: "Always on schedule", bg: "bg-zinc-800 " },
    ],
    artaItems: [
      { icon: "ph-scales", title: "Zero Red Tape", desc: "Strict RA 11032 compliance", bg: "bg-[#800000]" },
      { icon: "ph-file-text", title: "Citizen's Charter", desc: "Published university SLA standards", bg: "bg-zinc-800 " },
    ],
    auditItems: [
      { icon: "ph-fingerprint", title: "Tamper-Proof Audit Trail", desc: "Every personnel action logged", bg: "bg-[#800000]" },
      { icon: "ph-check-circle", title: "Live Tracking Updates", desc: "Real-time ticket progression", bg: "bg-zinc-800 " },
    ],
    footerNote: "Fair, transparent university service",
  },
};

const SLA_CHIP_STYLES = [
  {
    bgClass: "bg-emerald-50  border-emerald-200/60  text-emerald-700 ",
    activeRing: "ring-2 ring-emerald-500/50 shadow-sm shadow-emerald-500/10 scale-[1.04]",
  },
  {
    bgClass: "bg-amber-50  border-amber-200/60  text-amber-700 ",
    activeRing: "ring-2 ring-amber-500/50 shadow-sm shadow-amber-500/10 scale-[1.04]",
  },
  {
    bgClass: "bg-red-50  border-red-200/60  text-red-700 ",
    activeRing: "ring-2 ring-red-500/50 shadow-sm shadow-red-500/10 scale-[1.04]",
  },
];

export default function LandingBento() {
  const router = useRouter();
  const [bento, setBento] = useState(DEFAULT_BENTO_CONTENT);
  const [activeTab, setActiveTab] = useState("charter");
  const [docIndex, setDocIndex] = useState(0);
  const [activeChip, setActiveChip] = useState(0);
  const [isHoveredTab, setIsHoveredTab] = useState(false);

  // Fetch dynamic bento configuration
  useEffect(() => {
    let isMounted = true;
    fetch("/api/landing/bento", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          setBento(json.data);
        }
      })
      .catch((err) => {
        console.warn("[LandingBento] Failed to fetch bento config:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const currentDocs = bento.card1?.documents?.length ? bento.card1.documents : DEFAULT_BENTO_CONTENT.card1.documents;
  const currentSlaChips = bento.card2?.slaChips?.length ? bento.card2.slaChips : DEFAULT_BENTO_CONTENT.card2.slaChips;

  // Auto-cycle documents on Card 1 every 3.8 seconds
  useEffect(() => {
    if (!currentDocs.length) return;
    const timer = setInterval(() => {
      setDocIndex((prev) => (prev + 1) % currentDocs.length);
    }, 3800);
    return () => clearInterval(timer);
  }, [currentDocs.length]);

  // Auto-cycle turnaround chips on Card 2 every 2.5 seconds
  useEffect(() => {
    if (!currentSlaChips.length) return;
    const timer = setInterval(() => {
      setActiveChip((prev) => (prev + 1) % currentSlaChips.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [currentSlaChips.length]);

  // Auto-cycle tabs on Card 5 every 3.6 seconds (paused on manual hover)
  useEffect(() => {
    if (isHoveredTab) return;
    const tabs = ["charter", "arta", "audit"];
    const timer = setInterval(() => {
      setActiveTab((prev) => tabs[(tabs.indexOf(prev) + 1) % tabs.length]);
    }, 3600);
    return () => clearInterval(timer);
  }, [isHoveredTab]);

  const activeDoc = currentDocs[docIndex % currentDocs.length] || currentDocs[0];

  const tabData = {
    charter: bento.card5?.charterItems || DEFAULT_BENTO_CONTENT.card5.charterItems,
    arta: bento.card5?.artaItems || DEFAULT_BENTO_CONTENT.card5.artaItems,
    audit: bento.card5?.auditItems || DEFAULT_BENTO_CONTENT.card5.auditItems,
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20 w-full font-inter select-none">
      
      {/* =========================================================================
          ASYMMETRIC EDITORIAL HEADER (Slide from Left to Right Entrance)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-12 sm:mb-16 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: -70, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-70px" }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >
          <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#800000]  block mb-3">
            {bento.eyebrow}
          </span>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#1d1d1f]  tracking-tight leading-[1.06]">
            {bento.headingLine1}<br />
            <span className="text-zinc-400 ">{bento.headingLine2}</span>
          </h2>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -45, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-70px" }}
          transition={{ duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5"
        >
          <p className="text-sm sm:text-base text-zinc-600  leading-relaxed font-normal max-w-lg">
            {bento.description}
          </p>
        </motion.div>
      </div>

      {/* =========================================================================
          BENTO CONTAINER (Reduced Padding Frame)
          Contains 2 Rows:
          - Row 1: 2 Equal Large Cards (50/50 Split)
          - Row 2: 3 Equal Medium Cards (3-Column Split)
          ========================================================================= */}
      <div className="rounded-[2.25rem] bg-[#f4f5f7]/70  p-3 sm:p-4 lg:p-5 border border-black/[0.04] [0.06]">
        
        {/* -----------------------------------------------------------------------
            ROW 1: TWO LARGE CARDS
            Card 1: Request Online in Minutes
            Card 2: Know When It's Ready
            ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-4 sm:mb-5">
          
          {/* CARD 1: Request Online in Minutes */}
          <motion.div 
            initial={{ opacity: 0, y: 36, scale: 0.96, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white  border border-black/[0.06] [0.08] p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f8f9fa]  p-5 border border-black/[0.03] [0.04] min-h-[220px] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  <span>{bento.card1?.portalTag || "Online Request Portal"}</span>
                  <span className="text-zinc-500">PUP San Juan</span>
                </div>

                {/* Dropdown: Campus */}
                <div className="p-2.5 px-3 rounded-xl bg-white  border border-black/[0.05] [0.06] flex items-center justify-between text-xs font-semibold text-[#1d1d1f]  mb-2 shadow-xs">
                  <span>{bento.card1?.campusLabel || "PUP San Juan Campus"}</span>
                  <i className="ph-bold ph-caret-down text-zinc-400 text-xs" />
                </div>

                {/* Expanded Accordion: Document & Purpose */}
                <div className="p-3 rounded-xl bg-white  border border-black/[0.05] [0.06] shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold text-[#800000]  mb-2">
                    <span>{bento.card1?.accordionTitle || "Choose Document & Purpose"}</span>
                    <i className="ph-bold ph-caret-up text-xs" />
                  </div>

                  {/* Clean Form Selection Lines with AnimatePresence crossfade */}
                  <div className="h-[46px] relative overflow-hidden pt-0.5">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={docIndex}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                          <span className="text-xs font-medium text-zinc-800  truncate">
                            {activeDoc?.name || "Official Document"}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400 ml-auto shrink-0">
                            {activeDoc?.tag || "Selected"}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500  pl-4 truncate">
                          Purpose: {activeDoc?.purpose || "General Evaluation"}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Status footer pill with live breathing dot */}
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-black/[0.03] [0.04]">
                <span>{bento.card1?.studentStub || "Student: 2022-04912-SJ-0"}</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600  font-semibold">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  {bento.card1?.verifiedBadge || "Verified Student"}
                </span>
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f]  tracking-tight group-hover:text-[#800000] :text-red-400 transition-colors">
                {bento.card1?.title || "Request Online in Minutes"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500  mt-1.5 leading-relaxed font-normal">
                {bento.card1?.description || "Select the document you need, specify your purpose, and submit your request straight from your phone or computer."}
              </p>
            </div>
          </motion.div>

          {/* CARD 2: Know When It's Ready */}
          <motion.div 
            initial={{ opacity: 0, y: 36, scale: 0.96, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white  border border-black/[0.06] [0.08] p-6 sm:p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f8f9fa]  p-5 border border-black/[0.03] [0.04] min-h-[220px] flex flex-col justify-between">
              <div>
                {/* Header Row with ticking icon */}
                <div className="flex items-center gap-2.5 mb-3">
                  <motion.div 
                    animate={{ rotate: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#800000] to-rose-700 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0"
                  >
                    <i className="ph-bold ph-clock text-xs" />
                  </motion.div>
                  <span className="text-xs font-bold text-[#1d1d1f] ">
                    {bento.card2?.headerText || "Clear Pick-Up Schedule"}
                  </span>
                </div>

                {/* Subtitle hint */}
                <div className="text-[11px] text-zinc-500  flex items-center gap-1.5 mb-3 font-mono">
                  <i className="ph-bold ph-caret-down text-[10px]" />
                  <span>{bento.card2?.subtitleHint || "Counted in working days once cleared"}</span>
                </div>

                <p className="text-xs text-zinc-600  leading-snug mb-3">
                  {bento.card2?.instructionsText || "Processing times depend on the type of document you requested:"}
                </p>

                {/* Simulated Input Search Box with live radar indicator */}
                <div className="p-2.5 px-3 rounded-xl bg-white  border border-black/[0.06] [0.08] shadow-xs flex items-center gap-2 mb-2.5">
                  <i className="ph-bold ph-magnifying-glass text-zinc-400 text-xs" />
                  <span className="text-xs text-zinc-700  font-mono flex items-center justify-between w-full">
                    <span>{bento.card2?.trackingSample || "Tracking #2026-SJ · Clearance Verified"}</span>
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  </span>
                </div>

                {/* 3 Simple Pick-Up Chips with sequential spotlight wave */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {currentSlaChips.map((chip, idx) => {
                    const isActive = activeChip === idx;
                    const style = SLA_CHIP_STYLES[idx % SLA_CHIP_STYLES.length];
                    return (
                      <motion.div
                        key={chip.days + idx}
                        animate={{
                          scale: isActive ? 1.05 : 1,
                        }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className={`p-1.5 px-2 rounded-lg border text-center transition-all duration-300 ${
                          style.bgClass
                        } ${isActive ? style.activeRing : "opacity-80"}`}
                      >
                        <div className="text-[10px] font-mono font-bold">{chip.days}</div>
                        <div className="text-[9px] opacity-80 truncate">{chip.label}</div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-2 border-t border-black/[0.03] [0.04]">
                {bento.card2?.sealFooter || "Stamped with the official university dry seal"}
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-[#1d1d1f]  tracking-tight group-hover:text-[#800000] :text-red-400 transition-colors">
                {bento.card2?.title || "Know Exactly When It's Ready"}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-500  mt-1.5 leading-relaxed font-normal">
                {bento.card2?.description || "Every document follows a clear schedule so you know exactly when to visit the Registrar counter."}
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
            initial={{ opacity: 0, y: 36, scale: 0.96, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white  border border-black/[0.06] [0.08] p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area: Archive Node Map with planetary orbit and pulse waves */}
            <div className="rounded-2xl bg-[#f8f9fa]  p-4 border border-black/[0.03] [0.04] min-h-[180px] flex items-center justify-center relative overflow-hidden">
              
              {/* Concentric Signal Radar Pulses from Central Node */}
              <motion.div
                animate={{ scale: [0.9, 2.3], opacity: [0.55, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeOut" }}
                className="absolute w-12 h-12 rounded-2xl bg-[#800000]/25 pointer-events-none"
              />
              <motion.div
                animate={{ scale: [0.9, 2.8], opacity: [0.35, 0] }}
                transition={{ repeat: Infinity, duration: 2.8, delay: 0.9, ease: "easeOut" }}
                className="absolute w-12 h-12 rounded-2xl bg-[#800000]/15 pointer-events-none"
              />

              {/* Central Node */}
              <div className="relative z-10 flex flex-col items-center">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#800000] to-red-800 text-white flex items-center justify-center shadow-md border-2 border-white "
                >
                  <i className="ph-bold ph-archive text-xl" />
                </motion.div>
              </div>

              {/* Orbiting Physical Archive Nodes */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Node Top: Room 1 (Gentle vertical float) */}
                <motion.div 
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}
                  className="absolute top-3 w-8 h-8 rounded-xl liquid-glass-light flex items-center justify-center text-zinc-600  text-[10px] font-mono font-bold z-10"
                >
                  {bento.card3?.roomCode || "R1"}
                </motion.div>

                {/* Node Left: Cabinet A (Gentle horizontal float) */}
                <motion.div 
                  animate={{ x: [-3, 3, -3] }}
                  transition={{ repeat: Infinity, duration: 4.2, delay: 0.3, ease: "easeInOut" }}
                  className="absolute left-4 w-8 h-8 rounded-xl liquid-glass-light flex items-center justify-center text-zinc-600  text-[10px] font-mono font-bold z-10"
                >
                  {bento.card3?.cabinetCode || "C-A"}
                </motion.div>

                {/* Node Right: Drawer 2 (Gentle horizontal float) */}
                <motion.div 
                  animate={{ x: [3, -3, 3] }}
                  transition={{ repeat: Infinity, duration: 3.8, delay: 0.6, ease: "easeInOut" }}
                  className="absolute right-4 w-8 h-8 rounded-xl liquid-glass-light flex items-center justify-center text-zinc-600  text-[10px] font-mono font-bold z-10"
                >
                  {bento.card3?.drawerCode || "D-2"}
                </motion.div>

                {/* Node Bottom: Dry Seal (Gentle vertical float + stamp pulse) */}
                <motion.div 
                  animate={{ y: [3, -3, 3], scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 4.0, delay: 0.9, ease: "easeInOut" }}
                  className="absolute bottom-3 w-8 h-8 rounded-xl liquid-glass-light flex items-center justify-center text-emerald-600  text-xs z-10"
                >
                  <i className="ph-bold ph-stamp" />
                </motion.div>

                {/* Circular subtle dashed orbit with infinite linear rotation */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
                  className="w-36 h-36 rounded-full border border-dashed border-zinc-300 " 
                />
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-5">
              <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f]  tracking-tight group-hover:text-[#800000] :text-red-400 transition-colors">
                {bento.card3?.title || "Direct from Campus Archives"}
              </h3>
              <p className="text-xs text-zinc-500  mt-1.5 leading-relaxed font-normal">
                {bento.card3?.description || "Your online request connects directly to Room 1 archive cabinets, so staff can retrieve your folder faster."}
              </p>
            </div>
          </motion.div>

          {/* CARD 4: What You Need to Prepare */}
          <motion.div 
            initial={{ opacity: 0, y: 36, scale: 0.96, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white  border border-black/[0.06] [0.08] p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area: Checklist Stack with layered paper float */}
            <div className="rounded-2xl bg-[#f8f9fa]  p-4 border border-black/[0.03] [0.04] min-h-[180px] flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  {bento.card4?.checklistHeader || "Checklist"}
                </span>

                {/* Primary Checklist Item with floating depth */}
                <motion.div 
                  animate={{ y: [0, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                  className="p-3 rounded-xl bg-white  border border-black/[0.05] [0.06] shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <motion.div 
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ repeat: Infinity, duration: 3, repeatDelay: 2, ease: "backOut" }}
                      className="w-5 h-5 rounded-full bg-emerald-100  text-emerald-700  flex items-center justify-center text-[10px]"
                    >
                      <i className="ph-bold ph-check" />
                    </motion.div>
                    <span className="text-xs font-bold text-[#1d1d1f] ">
                      {bento.card4?.primaryItemTitle || "Student Number & Email"}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500  leading-snug">
                    {bento.card4?.primaryItemDesc || "Your official student number and an active email for notifications."}
                  </p>
                </motion.div>

                {/* Secondary Layer with subtle offset float */}
                <motion.div 
                  animate={{ y: [0, 2, 0] }}
                  transition={{ repeat: Infinity, duration: 4.5, delay: 0.4, ease: "easeInOut" }}
                  className="mt-2 p-2 px-3 rounded-xl bg-white/60  border border-black/[0.03] [0.04] flex items-center justify-between text-[11px] text-zinc-500 "
                >
                  <span>{bento.card4?.secondaryItemTitle || "Campus Clearance Stub"}</span>
                  <span className="text-[10px] font-mono text-emerald-600  font-semibold">
                    {bento.card4?.secondaryItemBadge || "Required for TOR"}
                  </span>
                </motion.div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-1">
                {bento.card4?.footerNote || "Bring a valid ID when picking up"}
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-5">
              <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f]  tracking-tight group-hover:text-[#800000] :text-red-400 transition-colors">
                {bento.card4?.title || "What You Need to Prepare"}
              </h3>
              <p className="text-xs text-zinc-500  mt-1.5 leading-relaxed font-normal">
                {bento.card4?.description || "Have your student number, email, and signed clearance ready so your request is evaluated right away."}
              </p>
            </div>
          </motion.div>

          {/* CARD 5: Protected by Law (RA 11032) */}
          <motion.div 
            initial={{ opacity: 0, y: 36, scale: 0.96, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            onClick={() => router.push("/login")}
            className="rounded-[1.75rem] bg-white  border border-black/[0.06] [0.08] p-6 sm:p-7 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer group"
          >
            {/* Simulated UI Area: Tabs + Safeguard Cards with animated layoutId pill */}
            <div 
              onMouseEnter={() => setIsHoveredTab(true)}
              onMouseLeave={() => setIsHoveredTab(false)}
              className="rounded-2xl bg-[#f8f9fa]  p-4 border border-black/[0.03] [0.04] min-h-[180px] flex flex-col justify-between"
            >
              <div>
                {/* Simple Segmented Tab Bar with layoutId animated pill */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white  border border-black/[0.05] [0.06] mb-3 shadow-2xs">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab("charter");
                    }}
                    className={`relative flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors duration-200 ${
                      activeTab === "charter"
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-900 :text-white"
                    }`}
                  >
                    {activeTab === "charter" && (
                      <motion.div
                        layoutId="bentoTabPill"
                        className="absolute inset-0 bg-[#800000] rounded-lg shadow-xs"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{bento.card5?.tab1Label || "Promise"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab("arta");
                    }}
                    className={`relative flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors duration-200 flex items-center justify-center gap-1 ${
                      activeTab === "arta"
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-900 :text-white"
                    }`}
                  >
                    {activeTab === "arta" && (
                      <motion.div
                        layoutId="bentoTabPill"
                        className="absolute inset-0 bg-[#800000] rounded-lg shadow-xs"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1">
                      <i className="ph-bold ph-scales text-[10px]" />
                      <span>{bento.card5?.tab2Label || "RA 11032"}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTab("audit");
                    }}
                    className={`relative flex-1 py-1 rounded-lg text-[10px] font-semibold transition-colors duration-200 ${
                      activeTab === "audit"
                        ? "text-white"
                        : "text-zinc-500 hover:text-zinc-900 :text-white"
                    }`}
                  >
                    {activeTab === "audit" && (
                      <motion.div
                        layoutId="bentoTabPill"
                        className="absolute inset-0 bg-[#800000] rounded-lg shadow-xs"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{bento.card5?.tab3Label || "Tracking"}</span>
                  </button>
                </div>

                {/* Dynamic Visual Status Cards with AnimatePresence */}
                <div className="h-[96px] relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="space-y-2"
                    >
                      {tabData[activeTab]?.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-white  border border-black/[0.04] [0.06] flex items-center gap-2.5 shadow-xs"
                        >
                          <div className={`w-8 h-8 rounded-lg ${item.bg || (idx % 2 === 0 ? "bg-[#800000]" : "bg-zinc-800 ")} text-white flex items-center justify-center text-xs shrink-0 font-bold`}>
                            <i className={`ph-bold ${item.icon}`} />
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-[#1d1d1f]  truncate">
                              {item.title}
                            </div>
                            <div className="text-[10px] text-zinc-500  truncate">
                              {item.desc}
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="text-[10px] font-mono text-zinc-400 pt-1">
                {bento.card5?.footerNote || "Fair, transparent university service"}
              </div>
            </div>

            {/* Typography Section */}
            <div className="mt-5">
              <h3 className="text-base sm:text-lg font-bold text-[#1d1d1f]  tracking-tight group-hover:text-[#800000] :text-red-400 transition-colors">
                {bento.card5?.title || "Protected by Law (RA 11032)"}
              </h3>
              <p className="text-xs text-zinc-500  mt-1.5 leading-relaxed font-normal">
                {bento.card5?.description || "Backed by the Ease of Doing Business Act. Transparent tracking with zero hidden delays."}
              </p>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
