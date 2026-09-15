"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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



export default function LandingBento() {
  const router = useRouter();
  const [bento, setBento] = useState(DEFAULT_BENTO_CONTENT);

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

  return (
    <section id="about" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-20 w-full font-inter select-none">
      
      {/* =========================================================================
          ASYMMETRIC EDITORIAL HEADER (Slide from Left to Right Entrance)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-center mb-6 sm:mb-8 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, x: -70, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-70px" }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7"
        >

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
          <p className="text-base sm:text-lg text-zinc-600  leading-relaxed font-normal max-w-lg">
            {bento.description}
          </p>
        </motion.div>
      </div>

      {/* =========================================================================
          BENTO CONTAINER
          Contains 2 Rows:
          - Row 1: 2 Equal Large Cards (50/50 Split)
          - Row 2: 3 Equal Medium Cards (3-Column Split)
          ========================================================================= */}
      <div className="w-full flex flex-col gap-4 sm:gap-5">
        
        {/* -----------------------------------------------------------------------
            ROW 1: TWO LARGE CARDS
            Card 1: Request Online in Minutes
            Card 2: Know When It's Ready
            ----------------------------------------------------------------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          
          {/* CARD 1: Request Online in Minutes */}
          <motion.div 
            initial={{ opacity: 0, y: 36, scale: 0.96, filter: "blur(6px)" }}
            whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}

            className="rounded-[2rem] bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f5f5f7] p-6 border-none min-h-[220px] flex flex-col justify-center items-center relative overflow-hidden">
              {/* Connecting line behind steps */}
              <div className="absolute left-[calc(50%-72px)] top-10 bottom-10 w-0.5 bg-zinc-200/60 z-0"></div>
              
              <div className="relative z-10 w-full max-w-[180px] flex flex-col gap-5">
                {/* Step 1 */}
                <div className="flex items-center gap-4 group/step">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-[#800000] transition-colors border border-black/5 shrink-0">
                    <i className="ph-bold ph-file-text text-base" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 group-hover/step:text-zinc-900 transition-colors">Select Document</span>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-4 group/step">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-[#800000] transition-colors border border-black/5 shrink-0">
                    <i className="ph-bold ph-target text-base" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 group-hover/step:text-zinc-900 transition-colors">Specify Purpose</span>
                </div>
                {/* Step 3 */}
                <div className="flex items-center gap-4 group/step">
                  <div className="w-9 h-9 rounded-full bg-[#800000] shadow-md flex items-center justify-center text-white shrink-0">
                    <i className="ph-bold ph-paper-plane-right text-base" />
                  </div>
                  <span className="text-xs font-semibold text-[#800000]">Submit Online</span>
                </div>
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

            className="rounded-[2rem] bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f5f5f7] p-6 border-none min-h-[220px] flex flex-col justify-center items-center relative overflow-hidden">
              {/* Connecting line behind steps */}
              <div className="absolute left-[calc(50%-78px)] top-10 bottom-10 w-0.5 bg-zinc-200/60 z-0"></div>
              
              <div className="relative z-10 w-full max-w-[190px] flex flex-col gap-4">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5 shrink-0">
                    <i className="ph-bold ph-calendar-check text-base" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-900">Clear Schedule</span>
                    <span className="text-[10px] text-zinc-500">Based on document type</span>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5 shrink-0">
                    <i className="ph-bold ph-bell-ringing text-base" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-900">Live Notifications</span>
                    <span className="text-[10px] text-zinc-500">Track progress instantly</span>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#800000] shadow-md flex items-center justify-center text-white shrink-0">
                    <i className="ph-bold ph-handshake text-base" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#800000]">Visit Counter</span>
                    <span className="text-[10px] text-[#800000]/70">No waiting in lines</span>
                  </div>
                </div>
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

            className="rounded-[2rem] bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area: Flow Diagram */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4 border-none min-h-[180px] flex items-center justify-center relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-4 relative z-10">
                 {/* Online Request */}
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5">
                     <i className="ph-bold ph-laptop text-lg" />
                   </div>
                   <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Online</span>
                 </div>
                 
                 {/* Dashed line */}
                 <div className="w-6 sm:w-8 h-0 border-t-2 border-dashed border-zinc-300"></div>

                 {/* Room 1 */}
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-12 rounded-full bg-[#800000] shadow-md flex items-center justify-center text-white relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#800000] opacity-30" />
                     <i className="ph-bold ph-archive text-xl relative z-10" />
                   </div>
                   <span className="text-[9px] font-bold text-[#800000] uppercase tracking-wider">Room 1</span>
                 </div>
                 
                 {/* Dashed line */}
                 <div className="w-6 sm:w-8 h-0 border-t-2 border-dashed border-zinc-300"></div>

                 {/* Staff */}
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5">
                     <i className="ph-bold ph-users text-lg" />
                   </div>
                   <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Staff</span>
                 </div>
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

            className="rounded-[2rem] bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area: Flow Diagram */}
            <div className="rounded-2xl bg-[#f5f5f7] p-6 border-none min-h-[180px] flex flex-col justify-center items-center relative overflow-hidden gap-5">
              
              <div className="w-full max-w-[190px] flex flex-col gap-4 relative z-10">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0">
                    <i className="ph-bold ph-check text-[14px]" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900">Student Number</span>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0">
                    <i className="ph-bold ph-check text-[14px]" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900">Active Email</span>
                </div>
                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 shadow-sm flex items-center justify-center text-emerald-700 border border-black/5 shrink-0">
                    <i className="ph-bold ph-check text-[14px]" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">Campus Clearance</span>
                </div>
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

            className="rounded-[2rem] bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8 sm:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area: Flow Diagram */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4 border-none min-h-[180px] flex items-center justify-center relative overflow-hidden gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center text-[#800000] border border-black/5 shrink-0 relative">
                 <i className="ph-bold ph-shield-check text-3xl" />
                 <span className="absolute -bottom-2.5 bg-[#800000] text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">RA 11032</span>
              </div>
              
              <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-2">
                   <i className="ph-fill ph-check-circle text-emerald-500 text-sm" />
                   <span className="text-xs font-semibold text-zinc-700">Zero Red Tape</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <i className="ph-fill ph-check-circle text-emerald-500 text-sm" />
                   <span className="text-xs font-semibold text-zinc-700">No Hidden Delays</span>
                 </div>
                 <div className="flex items-center gap-2">
                   <i className="ph-fill ph-check-circle text-emerald-500 text-sm" />
                   <span className="text-xs font-semibold text-zinc-700">Transparent Tracking</span>
                 </div>
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
