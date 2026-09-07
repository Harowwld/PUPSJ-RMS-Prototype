"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import BevelButton from "@/components/ui/bevel-button";

const CATEGORIES = [
  { id: "all", label: "All Records" },
  { id: "transcripts", label: "Transcripts & Grades" },
  { id: "certs", label: "Certifications" },
  { id: "clearances", label: "Clearances & Diplomas" },
];

const CATALOG_ITEMS = [
  {
    id: "tor",
    code: "TOR",
    title: "Transcript of Records",
    category: "transcripts",
    sla: "5–7 Days SLA",
    slaColor: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
    description: "Official comprehensive academic transcript for employment, professional board examinations, or graduate studies.",
    requirements: [
      "2x2 Formal Photo (White Background, Nametag)",
      "University Clearance Form (Fully Signed)",
      "Documentary Stamp (BIR Compliant)"
    ],
    client: "Student & Alumni"
  },
  {
    id: "cog",
    code: "COG",
    title: "Certificate of Grades",
    category: "transcripts",
    sla: "2–3 Days SLA",
    slaColor: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
    description: "Certified summary of semester grades requested for scholarships, employer tuition subsidies, and academic evaluation.",
    requirements: [
      "Current Student ID or SIS Portal Profile Printout",
      "Specific Academic Year & Semester Identification"
    ],
    client: "Enrolled Students"
  },
  {
    id: "cor",
    code: "COR",
    title: "Certificate of Registration",
    category: "certs",
    sla: "1–2 Days SLA",
    slaColor: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
    description: "Official certification of enrollment status for student discounts, government aid, health insurance, and visa applications.",
    requirements: [
      "Validated Assessment Form / Enrollment Proof",
      "Current Semester Course Load Details"
    ],
    client: "Enrolled Students"
  },
  {
    id: "ctc",
    code: "HD",
    title: "Honorable Dismissal",
    category: "clearances",
    sla: "5–7 Days SLA",
    slaColor: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
    description: "Formal Certificate of Transfer Credential certifying official release from PUP to transfer to another institution.",
    requirements: [
      "Comprehensive Campus University Clearance",
      "Surrender of PUP Student ID Card",
      "Parent / Guardian Consent Form (If Minor)"
    ],
    client: "Transferees"
  },
  {
    id: "moral",
    code: "GMC",
    title: "Good Moral Character",
    category: "certs",
    sla: "2–3 Days SLA",
    slaColor: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
    description: "Issued in coordination with OSAS certifying zero pending disciplinary infractions during academic stay.",
    requirements: [
      "OSAS Disciplinary Clearance Slip",
      "Valid Student ID or Government ID Card"
    ],
    client: "Student & Alumni"
  },
  {
    id: "diploma",
    code: "DIP-2",
    title: "Second Copy of Diploma",
    category: "clearances",
    sla: "10–14 Days SLA",
    slaColor: "bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40",
    description: "Official replacement graduation diploma reissued after verified destruction or loss of the original parchment.",
    requirements: [
      "Notarized Affidavit of Loss / Damage",
      "Copy of Official Certificate of Graduation",
      "Board of Regents Formal Verification"
    ],
    client: "Alumni Only"
  },
  {
    id: "cav",
    code: "CAV",
    title: "CAV (DFA Apostille / Abroad)",
    category: "certs",
    sla: "7–10 Days SLA",
    slaColor: "bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40",
    description: "Certification, Authentication, and Verification endorsed directly to the DFA for overseas academic verification.",
    requirements: [
      "Certified True Copies of TOR and Diploma",
      "Passport Identification Copy (Full Legal Name)",
      "CHED / Red Ribbon Endorsement Checklist"
    ],
    client: "Graduates & Alumni"
  },
  {
    id: "certified_copy",
    code: "CTC",
    title: "Certified True Copy",
    category: "transcripts",
    sla: "2–3 Days SLA",
    slaColor: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40",
    description: "Official Registrar dry seal and verification stamp placed on original photocopies of records.",
    requirements: [
      "Original Document for Verification Presentation",
      "Clear Photocopy for Dry Seal Stamping"
    ],
    client: "Student & Alumni"
  }
];

export default function DocumentCatalog() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredItems = CATALOG_ITEMS.filter((item) => {
    if (activeCategory === "all") return true;
    return item.category === activeCategory;
  });

  return (
    <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 w-full font-inter select-none">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[2.5rem] bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06)] overflow-hidden p-8 sm:p-12"
      >
        
        {/* Header & Filter Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-gray-100 dark:border-zinc-800/80">
          <div>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#800000] dark:text-red-400 block mb-1">
              Official Services
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
              Academic Document Catalog
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Explore available credentials, clearance requirements, and standard university turnaround times.
            </p>
          </div>

          {/* Apple Sliding Pill Filter Bar */}
          <div className="flex items-center p-1 rounded-full bg-gray-100/80 dark:bg-zinc-800/80 border border-black/[0.04] dark:border-white/[0.06] self-start lg:self-auto overflow-x-auto max-w-full">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap z-10 ${
                    isActive ? "text-gray-950 dark:text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-800"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="catalogFilter"
                      className="absolute inset-0 rounded-full bg-white dark:bg-zinc-700 shadow-sm z-[-1]"
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Grid with Animated Presence */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8"
        >
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -3 }}
                key={item.id}
                className="p-6 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-900 shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-mono text-xs font-bold tracking-wider border border-gray-200/80 dark:border-zinc-700">
                      {item.code}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${item.slaColor}`}>
                      {item.sla}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-950 dark:text-white group-hover:text-[#800000] dark:group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 leading-relaxed font-normal">
                    {item.description}
                  </p>

                  {/* Requirements List */}
                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-zinc-800/80 text-[11px] text-gray-500 dark:text-zinc-400 space-y-1.5">
                    <div className="font-semibold text-gray-700 dark:text-zinc-300">
                      Filing Requirements:
                    </div>
                    {item.requirements.map((req, idx) => (
                      <div key={idx} className="text-gray-500 dark:text-zinc-400 pl-1 leading-relaxed">
                        • {req}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Bottom CTA */}
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-medium text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    {item.client}
                  </span>
                  <BevelButton
                    onClick={() => router.push("/login")}
                    className="h-8 px-4 rounded-full text-xs font-semibold tracking-wide cursor-pointer"
                  >
                    Request
                  </BevelButton>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

      </motion.div>
    </section>
  );
}

