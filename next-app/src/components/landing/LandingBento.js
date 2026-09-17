"use client";
import LucideIcon from "@/components/shared/LucideIcon";
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
    <section id="about" className="scroll-mt-24 max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-20 w-full font-jakarta select-none">
      
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
      <div className="w-screen relative left-[50%] right-[50%] -ml-[50vw] -mr-[50vw] bg-[#f5f5f7] py-10 sm:py-16 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex flex-col gap-4 sm:gap-5">
        
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

            className="rounded-3xl bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 sm:p-8 lg:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4 sm:p-6 border-none min-h-[220px] flex flex-col justify-center items-center relative overflow-hidden">
              
              {/* Full-Card Success Overlay */}
              <div className="absolute inset-0 bg-emerald-500/85 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-white opacity-0 pointer-events-none" style={{ animation: 'submitOverlay 6s infinite 0s' }}>
                <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center mb-3">
                  <LucideIcon  className="ph-bold ph-check text-2xl drop-shadow-sm" />
                </div>
                <span className="font-bold text-sm tracking-wide drop-shadow-sm">Submitted!</span>
              </div>

              <div className="relative z-10 w-full max-w-[180px] flex flex-col gap-5">
                {/* Connecting line between Step 1 and Step 2 */}
                <div className="absolute left-[17px] top-[18px] h-[56px] w-0.5 bg-zinc-200/60 z-[-1]">
                  <div className="absolute top-0 left-0 w-full bg-emerald-500" style={{ animation: 'stepLineFill 6s infinite 0s', height: '0%' }}></div>
                </div>
                
                <CursorOverlay animationName="cursorCard1" delay="0s" />
                {/* Step 1 */}
                <div className="flex items-center gap-4 group/step">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-[#800000] transition-all border border-black/5 shrink-0" style={{ animation: 'objInteract1 6s infinite 0s, step1GreenCircle 6s infinite 0s' }}>
                    <LucideIcon  className="ph-bold ph-file-text text-base" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 transition-colors" style={{ animation: 'step1GreenText 6s infinite 0s' }}>Select Document</span>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-4 group/step">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-zinc-400 group-hover/step:text-[#800000] transition-all border border-black/5 shrink-0" style={{ animation: 'objInteract2 6s infinite 0s, step2GreenCircle 6s infinite 0s' }}>
                    <LucideIcon  className="ph-bold ph-target text-base" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600 transition-colors" style={{ animation: 'step2GreenText 6s infinite 0s' }}>Specify Purpose</span>
                </div>
                {/* Step 3 */}
                <button className="relative px-5 py-2.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 w-[120px] transition-all mx-auto" style={{ animation: 'objInteract3 6s infinite 0s, submitButtonEnable 6s infinite 0s' }}>
                  Submit
                  <LucideIcon  className="ph-bold ph-paper-plane-right text-base" />
                </button>
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

            className="rounded-3xl bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 sm:p-8 lg:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4 sm:p-6 border-none min-h-[220px] flex flex-col justify-center items-center relative overflow-hidden">
              <CursorOverlay animationName="cursorCard2" delay="1s" />
              {/* Connecting line behind steps */}
              <div className="absolute left-[calc(50%-78px)] top-10 bottom-10 w-0.5 bg-zinc-200/60 z-0"></div>
              
              <div className="relative z-10 w-full max-w-[190px] flex flex-col gap-4">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract1 6s infinite 1s' }}>
                    <LucideIcon  className="ph-bold ph-calendar-check text-base" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-900">Clear Schedule</span>
                    <span className="text-[10px] text-zinc-500">Based on document type</span>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract2 6s infinite 1s' }}>
                    <LucideIcon  className="ph-bold ph-bell-ringing text-base" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-900">Live Notifications</span>
                    <span className="text-[10px] text-zinc-500">Track progress instantly</span>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-[#800000] shadow-md flex items-center justify-center text-white shrink-0 transition-all" style={{ animation: 'objInteract3 6s infinite 1s' }}>
                    <LucideIcon  className="ph-bold ph-handshake text-base" />
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

            className="rounded-3xl bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 sm:p-8 lg:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area: Flow Diagram */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4 border-none min-h-[180px] flex items-center justify-center relative overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-4 relative z-10">
                 <CursorOverlay animationName="cursorCard3" delay="2s" />
                 {/* Online Request */}
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5 transition-all" style={{ animation: 'objInteract1 6s infinite 2s' }}>
                     <LucideIcon  className="ph-bold ph-laptop text-lg" />
                   </div>
                   <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Request</span>
                 </div>
                 
                 {/* Dashed line 1 */}
                 <div className="w-6 sm:w-8 h-0 border-t-2 border-dashed border-zinc-300 relative -translate-y-[10px]">
                   <div className="absolute top-[-2px] left-0 h-0 border-t-2 border-solid border-blue-500" style={{ animation: 'lineFill1 6s infinite 2s', width: '0%' }}></div>
                 </div>

                 {/* Room 1 */}
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-12 h-12 rounded-full bg-[#800000] shadow-md flex items-center justify-center text-white relative transition-all" style={{ animation: 'objInteract3 6s infinite 2s, room1CircleReveal 6s infinite 2s' }}>
                     <LucideIcon  className="ph-bold ph-archive text-xl relative z-10" />
                   </div>
                   <span className="text-[9px] font-bold text-[#800000] uppercase tracking-wider" style={{ animation: 'room1TextReveal 6s infinite 2s' }}>Room 1</span>
                 </div>
                 
                 {/* Dashed line 2 */}
                 <div className="w-6 sm:w-8 h-0 border-t-2 border-dashed border-zinc-300 relative -translate-y-[10px]">
                   <div className="absolute top-[-2px] right-0 h-0 border-t-2 border-solid border-blue-500" style={{ animation: 'lineFill2 6s infinite 2s', width: '0%' }}></div>
                 </div>

                 {/* Staff */}
                 <div className="flex flex-col items-center gap-2">
                   <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-[#800000] border border-black/5 transition-all" style={{ animation: 'objInteract2 6s infinite 2s' }}>
                     <LucideIcon  className="ph-bold ph-users text-lg" />
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

            className="rounded-3xl bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 sm:p-8 lg:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area: Flow Diagram */}
            <div className="rounded-2xl bg-[#f5f5f7] p-6 border-none min-h-[180px] flex flex-col justify-center items-center relative overflow-hidden gap-5">
              <CursorOverlay animationName="cursorCard4" delay="3s" />
              <div className="w-full max-w-[190px] flex flex-col gap-4 relative z-10">
                {/* Step 1 */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract1 6s infinite 3s' }}>
                    <LucideIcon  className="ph-bold ph-check text-[14px] opacity-0" style={{ animation: 'checkReveal1 6s infinite 3s' }} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900">Student Number</span>
                </div>
                {/* Step 2 */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract2 6s infinite 3s' }}>
                    <LucideIcon  className="ph-bold ph-check text-[14px] opacity-0" style={{ animation: 'checkReveal2 6s infinite 3s' }} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900">Active Email</span>
                </div>
                {/* Step 3 */}
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract3 6s infinite 3s' }}>
                    <LucideIcon  className="ph-bold ph-check text-[14px] opacity-0" style={{ animation: 'checkReveal3 6s infinite 3s' }} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-900">Campus Clearance</span>
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

            className="rounded-3xl bg-white border border-black/[0.04] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 sm:p-8 lg:p-10 flex flex-col justify-between transition-all duration-300 group"
          >
            {/* Simulated UI Area: Flow Diagram */}
            <div className="rounded-2xl bg-[#f5f5f7] p-4 border-none min-h-[180px] flex items-center justify-center relative overflow-hidden gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex flex-col items-center justify-center text-[#800000] border border-black/5 shrink-0 relative">
                 <LucideIcon  className="ph-bold ph-shield-check text-3xl" />
                 <span className="absolute -bottom-2.5 bg-[#800000] text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">RA 11032</span>
              </div>
              
              <div className="flex flex-col gap-4 relative">
                 <CursorOverlay animationName="cursorCard5" delay="4s" />
                 <div className="flex items-center gap-4">
                   <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract1 6s infinite 4s' }}>
                     <LucideIcon  className="ph-bold ph-check text-[14px] opacity-0" style={{ animation: 'checkReveal1 6s infinite 4s' }} />
                   </div>
                   <span className="text-xs font-semibold text-zinc-700">Zero Red Tape</span>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract2 6s infinite 4s' }}>
                     <LucideIcon  className="ph-bold ph-check text-[14px] opacity-0" style={{ animation: 'checkReveal2 6s infinite 4s' }} />
                   </div>
                   <span className="text-xs font-semibold text-zinc-700">No Hidden Delays</span>
                 </div>
                 <div className="flex items-center gap-4">
                   <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-emerald-600 border border-black/5 shrink-0 transition-all" style={{ animation: 'objInteract3 6s infinite 4s' }}>
                     <LucideIcon  className="ph-bold ph-check text-[14px] opacity-0" style={{ animation: 'checkReveal3 6s infinite 4s' }} />
                   </div>
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
      </div>
    </section>
  );
}

const CursorOverlay = ({ animationName, delay = "0s" }) => (
  <div 
    className="absolute z-50 pointer-events-none"
    style={{ animation: `${animationName} 6s infinite ${delay}`, left: '50%', top: '80%', opacity: 0 }}
  >
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-md text-black"
      style={{ animation: `cursorClick 6s infinite ${delay}` }}
    >
      <path 
        d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.42c.45 0 .67-.54.35-.85L6.35 3.35a.5.5 0 0 0-.85.35Z" 
        fill="currentColor" 
        stroke="white" 
        strokeWidth="1.5"
      />
    </svg>
    <div className="absolute top-0 left-0 w-6 h-6 rounded-full border-2 border-[#800000] opacity-0 -translate-x-1.5 -translate-y-1.5" style={{ animation: `cursorRipple 6s infinite ${delay}` }}></div>
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes cursorCard1 {
        0%, 100% { left: 18px; top: 180px; opacity: 0; }
        10% { opacity: 1; }
        15%, 25% { left: 18px; top: 18px; opacity: 1; }
        40%, 50% { left: 18px; top: 74px; opacity: 1; }
        65%, 75% { left: 60px; top: 130px; opacity: 1; }
        90% { opacity: 0; }
      }
      @keyframes cursorCard2 {
        0%, 100% { left: 50%; top: 80%; opacity: 0; }
        10% { opacity: 1; }
        15%, 25% { left: calc(50% - 78px); top: calc(50% - 52px); opacity: 1; }
        40%, 50% { left: calc(50% - 78px); top: 50%; opacity: 1; }
        65%, 75% { left: calc(50% - 78px); top: calc(50% + 52px); opacity: 1; }
        90% { opacity: 0; }
      }
      @keyframes cursorCard3 {
        0%, 100% { left: 50%; top: 150px; opacity: 0; }
        10% { opacity: 1; }
        15%, 25% { left: 20px; top: 24px; opacity: 1; }
        40%, 50% { left: calc(100% - 20px); top: 24px; opacity: 1; }
        65%, 75% { left: 50%; top: 24px; opacity: 1; }
        90% { opacity: 0; }
      }
      @keyframes cursorCard4 {
        0%, 100% { left: 50%; top: 80%; opacity: 0; }
        10% { opacity: 1; }
        15%, 25% { left: calc(50% - 79px); top: calc(50% - 48px); opacity: 1; }
        40%, 50% { left: calc(50% - 79px); top: 50%; opacity: 1; }
        65%, 75% { left: calc(50% - 79px); top: calc(50% + 48px); opacity: 1; }
        90% { opacity: 0; }
      }
      @keyframes cursorCard5 {
        0%, 100% { left: 16px; top: 160px; opacity: 0; }
        10% { opacity: 1; }
        15%, 25% { left: 16px; top: 16px; opacity: 1; }
        40%, 50% { left: 16px; top: 64px; opacity: 1; }
        65%, 75% { left: 16px; top: 112px; opacity: 1; }
        90% { opacity: 0; }
      }
      @keyframes cursorClick {
        0%, 18%, 24%, 43%, 49%, 68%, 74%, 100% { transform: scale(1); }
        20%, 22%, 45%, 47%, 70%, 72% { transform: scale(0.85); }
      }
      @keyframes cursorRipple {
        0%, 19%, 23%, 44%, 48%, 69%, 73%, 100% { transform: scale(0.5); opacity: 0; }
        20%, 45%, 70% { transform: scale(2); opacity: 0.8; }
        22%, 47%, 72% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes objInteract1 {
        0%, 18%, 24%, 100% { transform: scale(1); filter: brightness(1); box-shadow: 0 0 0 0px rgba(128,0,0,0); }
        20%, 22% { transform: scale(0.9); filter: brightness(0.85); box-shadow: 0 0 0 4px rgba(128,0,0,0.15); }
      }
      @keyframes objInteract2 {
        0%, 43%, 49%, 100% { transform: scale(1); filter: brightness(1); box-shadow: 0 0 0 0px rgba(128,0,0,0); }
        45%, 47% { transform: scale(0.9); filter: brightness(0.85); box-shadow: 0 0 0 4px rgba(128,0,0,0.15); }
      }
      @keyframes objInteract3 {
        0%, 68%, 74%, 100% { transform: scale(1); filter: brightness(1); box-shadow: 0 0 0 0px rgba(128,0,0,0); }
        70%, 72% { transform: scale(0.9); filter: brightness(0.85); box-shadow: 0 0 0 4px rgba(128,0,0,0.15); }
      }
      @keyframes checkReveal1 {
        0%, 21.99% { opacity: 0; transform: scale(0.5); }
        22%, 95% { opacity: 1; transform: scale(1); }
        96%, 100% { opacity: 0; transform: scale(0.5); }
      }
      @keyframes checkReveal2 {
        0%, 46.99% { opacity: 0; transform: scale(0.5); }
        47%, 95% { opacity: 1; transform: scale(1); }
        96%, 100% { opacity: 0; transform: scale(0.5); }
      }
      @keyframes checkReveal3 {
        0%, 71.99% { opacity: 0; transform: scale(0.5); }
        72%, 95% { opacity: 1; transform: scale(1); }
        96%, 100% { opacity: 0; transform: scale(0.5); }
      }
      @keyframes lineFill1 {
        0%, 21.99% { width: 0%; }
        30%, 95% { width: 100%; }
        96%, 100% { width: 0%; }
      }
      @keyframes lineFill2 {
        0%, 46.99% { width: 0%; }
        55%, 95% { width: 100%; }
        96%, 100% { width: 0%; }
      }
      @keyframes room1CircleReveal {
        0%, 71.99% { background-color: #e4e4e7; color: #a1a1aa; }
        72%, 95% { background-color: #800000; color: #ffffff; }
        96%, 100% { background-color: #e4e4e7; color: #a1a1aa; }
      }
      @keyframes room1TextReveal {
        0%, 71.99% { color: #a1a1aa; }
        72%, 95% { color: #800000; }
        96%, 100% { color: #a1a1aa; }
      }
      @keyframes submitOverlay {
        0%, 71.99% { opacity: 0; transform: scale(0.95); }
        76%, 92% { opacity: 1; transform: scale(1); }
        96%, 100% { opacity: 0; transform: scale(1.05); }
      }
      @keyframes step1GreenCircle {
        0%, 21.99% { background-color: white; color: #a1a1aa; border-color: rgba(0,0,0,0.05); }
        22%, 95% { background-color: #10b981; color: white; border-color: transparent; }
        96%, 100% { background-color: white; color: #a1a1aa; border-color: rgba(0,0,0,0.05); }
      }
      @keyframes step1GreenText {
        0%, 21.99% { color: #52525b; }
        22%, 95% { color: #10b981; }
        96%, 100% { color: #52525b; }
      }
      @keyframes stepLineFill {
        0%, 21.99% { height: 0%; }
        35%, 95% { height: 100%; }
        96%, 100% { height: 0%; }
      }
      @keyframes step2GreenCircle {
        0%, 46.99% { background-color: white; color: #a1a1aa; border-color: rgba(0,0,0,0.05); }
        47%, 95% { background-color: #10b981; color: white; border-color: transparent; }
        96%, 100% { background-color: white; color: #a1a1aa; border-color: rgba(0,0,0,0.05); }
      }
      @keyframes step2GreenText {
        0%, 46.99% { color: #52525b; }
        47%, 95% { color: #10b981; }
        96%, 100% { color: #52525b; }
      }
      @keyframes submitButtonEnable {
        0%, 47% { background-color: #e4e4e7; color: #a1a1aa; box-shadow: none; }
        51%, 95% { background-color: #800000; color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        96%, 100% { background-color: #e4e4e7; color: #a1a1aa; box-shadow: none; }
      }
    `}} />
  </div>
);
