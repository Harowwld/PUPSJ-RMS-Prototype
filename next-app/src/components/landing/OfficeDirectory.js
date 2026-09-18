"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function OfficeDirectory() {
  const [copiedKey, setCopiedKey] = useState(null);
  const [manilaInfo, setManilaInfo] = useState({
    timeStr: "",
    isOpen: false,
    statusText: "Checking schedule...",
    statusType: "closed", // "open" | "lunch" | "closed"
  });

  // Calculate live office status based on Philippine Standard Time (PHT / UTC+8)
  useEffect(() => {
    const updateTimeAndStatus = () => {
      try {
        const now = new Date();
        const manilaDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Manila" });
        const pht = new Date(manilaDateStr);

        const day = pht.getDay(); // 0 = Sun, 6 = Sat
        const hour = pht.getHours();
        const minute = pht.getMinutes();
        const timeVal = hour + minute / 60;

        const formattedTime = pht.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        const isWeekday = day >= 1 && day <= 5;
        let isOpen = false;
        let statusText = "Closed (Weekend Break)";
        let statusType = "closed";

        if (isWeekday) {
          if (timeVal >= 8 && timeVal < 12) {
            isOpen = true;
            statusText = "Open Now · Windows 1 & 2 Active";
            statusType = "open";
          } else if (timeVal >= 12 && timeVal < 13) {
            isOpen = true;
            statusText = "Noon Skeletal Coverage · Desk Open";
            statusType = "lunch";
          } else if (timeVal >= 13 && timeVal < 17) {
            isOpen = true;
            statusText = "Open Now · Afternoon Windows Active";
            statusType = "open";
          } else if (timeVal < 8) {
            statusText = "Closed · Opens Today at 8:00 AM";
            statusType = "closed";
          } else {
            statusText = day === 5 ? "Closed · Reopens Monday at 8:00 AM" : "Closed · Reopens Tomorrow at 8:00 AM";
            statusType = "closed";
          }
        } else {
          statusText = "Closed · Reopens Monday at 8:00 AM";
          statusType = "closed";
        }

        setManilaInfo({
          timeStr: `${formattedTime} PHT`,
          isOpen,
          statusText,
          statusType,
        });
      } catch {
        setManilaInfo({
          timeStr: "8:00 AM – 5:00 PM PHT",
          isOpen: true,
          statusText: "Regular Office Hours Active",
          statusType: "open",
        });
      }
    };

    updateTimeAndStatus();
    const interval = setInterval(updateTimeAndStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Tactile copy-to-clipboard handler with sonner toast feedback
  const handleCopy = (text, key, label) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to Clipboard", {
      description: `${label} copied successfully.`,
    });
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  return (
    <section 
      id="office" 
      className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 lg:pt-32 pb-24 sm:pb-32 lg:pb-36 font-jakarta select-none scroll-mt-24"
    >
      {/* Subtle ambient divider & glow between DocumentCatalog and OfficeDirectory */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-px bg-gradient-to-r from-transparent via-gray-300  to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-24 bg-red-900/5  blur-3xl pointer-events-none" />

      {/* =========================================================================
          ASYMMETRIC EDITORIAL HEADER & REAL-TIME DESK STATUS WIDGET
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end mb-12 sm:mb-16">
        
        {/* Left Column: Heading & Contextual Narrative */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#800000] ">
              Campus Archive &amp; Records
            </span>
            
            <span className="text-[11px] font-mono text-zinc-500 ">
              San Juan Campus
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-950  tracking-tight leading-[1.08]">
            Visit the Registrar &amp;<br />
            <span className="text-zinc-400 ">Campus Archive Hall</span>
          </h2>

          <p className="text-xs sm:text-sm text-gray-600  leading-relaxed font-normal max-w-xl pt-1">
            Official document claim windows, physical authentication dry-seal stations, and registrar advisory desks. Located on the ground floor of the Administration &amp; Records Hall.
          </p>
        </motion.div>

        {/* Right Column: Real-Time Operational Status Terminal */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 flex flex-col items-start lg:items-end justify-end"
        >
          <div className="w-full sm:w-auto min-w-[280px] p-4 sm:p-5 rounded-2xl bg-white  border border-black/[0.06] [0.08] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400  font-semibold">
                Desk Operational State
              </span>
              <span className="text-[11px] font-mono font-bold text-gray-900 ">
                {manilaInfo.timeStr || "PST (UTC+8)"}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              
              <span className="text-xs font-bold text-gray-900  tracking-tight">
                {manilaInfo.statusText}
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-gray-100  flex items-center justify-between text-[11px] text-zinc-500 ">
              <span>Same-Day Evaluation Cut-off</span>
              <span className="font-mono font-bold text-[#800000] ">3:00 PM PHT</span>
            </div>
          </div>
        </motion.div>

      </div>

      {/* =========================================================================
          ASYMMETRIC BENTO 2.0 GRID (7:5 SPLIT)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        
        {/* =======================================================================
            LEFT COLUMN (7 COLS): PHYSICAL LOCATION & SERVICE COUNTER WINDOWS
            ======================================================================= */}
        <motion.div 
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.65, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 flex flex-col justify-between rounded-[2.5rem] bg-white  border border-black/[0.06] [0.08] p-7 sm:p-9 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group"
        >
          {/* Subtle decorative watermark icon */}
          <div className="absolute top-6 right-6 pointer-events-none opacity-[0.03] [0.05] text-9xl">
            <HugeIcon  className="ph-bold ph-buildings" />
          </div>

          <div>
            {/* Location Eyebrow & Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50  border border-red-100  text-[11px] font-mono font-semibold text-[#800000] ">
                <HugeIcon  className="ph-bold ph-map-pin text-xs" />
                <span>Physical Campus Archive</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Room 101 · Ground Level
              </span>
            </div>

            {/* Campus Hall Title */}
            <h3 className="text-xl sm:text-2xl font-black text-gray-950  tracking-tight">
              Administration &amp; Records Hall
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-gray-600  mt-1">
              Polytechnic University of the Philippines — San Juan Campus
            </p>

            {/* Complete Physical Address with Copy Action */}
            <div className="mt-4 p-4 rounded-2xl bg-zinc-50  border border-black/[0.04] [0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-gray-700  leading-relaxed font-normal">
                <span className="font-semibold block text-gray-900 ">223 Ortega Street, cor. A. Mabini Street</span>
                <span>Barangay Addition Hills, San Juan City, Metro Manila 1500</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      "223 Ortega Street, corner A. Mabini Street, Barangay Addition Hills, San Juan City, Metro Manila 1500",
                      "address",
                      "Campus Address"
                    )
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-700  bg-white  border border-gray-200  hover:bg-gray-50 :bg-zinc-800 transition-colors flex items-center gap-1.5 active:scale-[0.98] cursor-pointer shadow-2xs"
                  title="Copy physical address"
                >
                  <HugeIcon 
                    className={`ph-bold ${
                      copiedKey === "address" ? "ph-check text-emerald-600" : "ph-copy text-zinc-400"
                    } text-xs`}
                  />
                  <span>{copiedKey === "address" ? "Copied" : "Copy"}</span>
                </button>

                <a
                  href="https://maps.google.com/?q=Polytechnic+University+of+the+Philippines+San+Juan+Campus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#800000]  bg-red-50/80  border border-red-200/60  hover:bg-red-100/70 :bg-red-900/40 transition-colors flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
                >
                  <span>Directions</span>
                  <HugeIcon  className="ph-bold ph-arrow-square-out text-xs" />
                </a>
              </div>
            </div>

            {/* Service Counter Windows Showcase */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <HugeIcon  className="ph-bold ph-users-three text-[#800000]  text-sm" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-900 ">
                  Designated Service Windows
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Window 1 */}
                <div className="p-4 rounded-2xl bg-zinc-50/80  border border-black/[0.04] [0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white   font-mono text-[10px] font-bold tracking-wider">
                        WINDOW 01
                      </span>
                      <span className="text-[10px] font-mono text-emerald-600  font-semibold flex items-center gap-1">
                        
                        Undergrad Desk
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-950  mb-1">
                      Enrolled Student Records
                    </div>
                    <p className="text-[11px] text-gray-500  leading-relaxed">
                      Certificate of Registration (COR), Certified Grade Slips, Assessment validation, and residency verifications.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200/60  text-[10px] font-mono text-zinc-400">
                    SLA: 1 – 3 Working Days
                  </div>
                </div>

                {/* Window 2 */}
                <div className="p-4 rounded-2xl bg-zinc-50/80  border border-black/[0.04] [0.06] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#800000] text-white   font-mono text-[10px] font-bold tracking-wider">
                        WINDOW 02
                      </span>
                      <span className="text-[10px] font-mono text-[#800000]  font-semibold flex items-center gap-1">
                        
                        Alumni Desk
                      </span>
                    </div>
                    <div className="text-xs font-bold text-gray-950  mb-1">
                      Alumni &amp; Credentials
                    </div>
                    <p className="text-[11px] text-gray-500  leading-relaxed">
                      Official Transcript of Records (TOR), Second Diploma copy, CAV (DFA/CHED Apostille), and dry-seal release.
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-200/60  text-[10px] font-mono text-zinc-400">
                    SLA: 7 – 20 Working Days
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transit & Access Advisory Footnote */}
          <div className="mt-6 pt-4 border-t border-gray-100  flex items-center gap-2 text-[11px] text-zinc-500  font-normal">
            <HugeIcon  className="ph-bold ph-info text-[#800000]  shrink-0 text-sm" />
            <span>Accessible via San Juan City Hall jeepney routes. Present valid ID at the university security gatehouse upon campus entry.</span>
          </div>
        </motion.div>


        {/* =======================================================================
            RIGHT COLUMN (5 COLS): OPERATING SCHEDULE & OFFICIAL DESK TERMINAL
            ======================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Card A: Weekly Operating Schedule */}
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[2.5rem] bg-white  border border-black/[0.06] [0.08] p-7 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#800000] ">
                  Operating Calendar
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Academic Year 2025–2026
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-gray-950  mb-1">
                Registrar Working Hours
              </h3>
              <p className="text-xs text-gray-500  mb-5 font-normal">
                Standard Philippine Standard Time (PST) window schedule.
              </p>

              {/* Schedule Table Breakdown */}
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 ">
                  <span className="font-semibold text-gray-700 ">Monday – Friday</span>
                  <span className="font-mono font-bold text-gray-950 ">8:00 AM – 5:00 PM</span>
                </div>
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 ">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-600 ">Noon Break Shift</span>
                    <span className="text-[10px] font-mono text-amber-600 ">(Rotational)</span>
                  </div>
                  <span className="font-mono text-gray-600 ">12:00 PM – 1:00 PM</span>
                </div>
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 ">
                  <span className="font-medium text-gray-600 ">Saturday &amp; Sunday</span>
                  <span className="font-semibold text-rose-600 ">Closed (Archive Rest)</span>
                </div>
              </div>
            </div>

            {/* Cut-off Notification Box */}
            <div className="mt-5 p-3.5 rounded-2xl bg-amber-50/70  border border-amber-200/60  text-xs text-amber-900  leading-relaxed font-normal flex items-start gap-2.5">
              <HugeIcon  className="ph-bold ph-clock text-amber-700  text-sm mt-0.5 shrink-0" />
              <span>
                <strong>3:00 PM Evaluation Cut-off:</strong> Same-day verification filing closes at 3:00 PM. Applications filed thereafter are logged for next working day evaluation.
              </span>
            </div>
          </motion.div>


          {/* Card B: Direct Communications & Official Desks */}
          <motion.div 
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.65, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[2.5rem] bg-white  border border-black/[0.06] [0.08] p-7 sm:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#800000] ">
                  Official Communication
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Institutional Desks
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-gray-950  mb-1">
                Direct Records Support
              </h3>
              <p className="text-xs text-gray-500  mb-5 font-normal">
                Direct lines for evaluation status, credential inquiries, and clearances.
              </p>

              {/* Direct Links Cluster */}
              <div className="space-y-3 text-xs">
                {/* Registrar Email */}
                <div className="p-3 rounded-2xl bg-zinc-50  border border-black/[0.04] [0.06] flex items-center justify-between gap-2">
                  <div className="overflow-hidden">
                    <span className="block text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
                      Registrar Evaluation Desk
                    </span>
                    <a 
                      href="mailto:registrar.sanjuan@pup.edu.ph"
                      className="font-bold text-[#800000]  hover:underline truncate block"
                    >
                      registrar.sanjuan@pup.edu.ph
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy("registrar.sanjuan@pup.edu.ph", "reg-email", "Registrar Email")}
                    className="p-2 rounded-xl text-xs text-zinc-500  hover:bg-white :bg-zinc-700 transition-colors shrink-0 cursor-pointer"
                    title="Copy Registrar email"
                  >
                    <HugeIcon  className={`ph-bold ${copiedKey === "reg-email" ? "ph-check text-emerald-600" : "ph-copy"}`} />
                  </button>
                </div>

                {/* OSAS Email */}
                <div className="p-3 rounded-2xl bg-zinc-50  border border-black/[0.04] [0.06] flex items-center justify-between gap-2">
                  <div className="overflow-hidden">
                    <span className="block text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
                      Student Affairs (OSAS Clearances)
                    </span>
                    <a 
                      href="mailto:osas.sanjuan@pup.edu.ph"
                      className="font-bold text-gray-800  hover:underline truncate block"
                    >
                      osas.sanjuan@pup.edu.ph
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy("osas.sanjuan@pup.edu.ph", "osas-email", "OSAS Email")}
                    className="p-2 rounded-xl text-xs text-zinc-500  hover:bg-white :bg-zinc-700 transition-colors shrink-0 cursor-pointer"
                    title="Copy OSAS email"
                  >
                    <HugeIcon  className={`ph-bold ${copiedKey === "osas-email" ? "ph-check text-emerald-600" : "ph-copy"}`} />
                  </button>
                </div>

                {/* Campus Trunkline */}
                <div className="p-3 rounded-2xl bg-zinc-50  border border-black/[0.04] [0.06] flex items-center justify-between gap-2">
                  <div className="overflow-hidden">
                    <span className="block text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-0.5">
                      Campus Direct Trunklines
                    </span>
                    <span className="font-mono font-bold text-gray-800  truncate block">
                      (02) 8724-4112 / (02) 8724-4113
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy("(02) 8724-4112", "trunkline", "Campus Trunkline")}
                    className="p-2 rounded-xl text-xs text-zinc-500  hover:bg-white :bg-zinc-700 transition-colors shrink-0 cursor-pointer"
                    title="Copy trunkline phone"
                  >
                    <HugeIcon  className={`ph-bold ${copiedKey === "trunkline" ? "ph-check text-emerald-600" : "ph-copy"}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Official Certification Watermark */}
            <div className="mt-5 pt-3 border-t border-gray-100  flex items-center justify-between text-[10px] text-zinc-400 font-mono">
              <span>PUP SAN JUAN OFFICIAL RECORDS</span>
              <span className="text-[#800000]  font-semibold">RA 11032 ARTA</span>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}


