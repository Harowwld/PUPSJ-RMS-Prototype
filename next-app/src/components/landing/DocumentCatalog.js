"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BevelButton from "@/components/ui/bevel-button";
import DocumentCardPreview from "./DocumentCardPreview";

export const CATALOG_ITEMS = [
  {
    id: "tor",
    code: "TOR",
    title: "Transcript of Records",
    category: "transcripts",
    description: "Official comprehensive academic transcript for employment, PRC board examinations, and graduate studies.",
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
    description: "Official certification of enrollment status for student discounts, government aid, and passport/visa requirements.",
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
    description: "Issued in coordination with OSAS certifying zero pending disciplinary infractions during university residency.",
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
    description: "Certification, Authentication, and Verification endorsed directly to DFA and CHED for international credential recognition.",
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
    description: "Official Registrar dry seal and verification stamp placed on original photocopies of university academic records.",
    requirements: [
      "Original Document for Verification Presentation",
      "Clear Photocopy for Dry Seal Stamping"
    ],
    client: "Student & Alumni"
  }
];

export default function DocumentCatalog() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [catalogData, setCatalogData] = useState({
    eyebrow: "Official University Credentials",
    heading: "Academic Document Catalog",
    description:
      "Explore authentic credentials, university clearance protocols, and official registrar records issued by the University.",
    badgeText: "Official Credential",
    primaryButtonText: "Request Credential",
    primaryButtonLink: "/login",
    primaryButtonEnabled: true,
    dragHint: "Drag or click document to inspect",
    items: CATALOG_ITEMS,
  });

  // Fetch dynamic catalog configuration
  useEffect(() => {
    let isMounted = true;
    fetch("/api/landing/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (isMounted && json.ok && json.data) {
          setCatalogData(json.data);
        }
      })
      .catch((err) => {
        console.warn("[DocumentCatalog] Failed to fetch catalog config:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const items = catalogData.items?.length ? catalogData.items : CATALOG_ITEMS;
  const totalItems = items.length;
  const safeActiveIndex = activeIndex < totalItems ? activeIndex : 0;

  // Section reference for sizing the giant Ferris Wheel
  const sectionRef = useRef(null);
  const [wheelGeometry, setWheelGeometry] = useState({
    radius: 580,
    centerX: 1350,
    centerY: 450,
    scale: 1,
  });

  // Responsive Ferris Wheel geometry calculation
  useEffect(() => {
    if (!sectionRef.current) return;

    const updateGeometry = () => {
      if (!sectionRef.current) return;
      const width = sectionRef.current.clientWidth;
      const height = sectionRef.current.clientHeight || 800;

      if (width < 640) {
        // Mobile: Circle center positioned comfortably past right edge
        setWheelGeometry({
          radius: 350,
          centerX: width * 1.05,
          centerY: height * 0.65,
          scale: 0.78,
        });
      } else if (width < 1024) {
        // Tablet: Circle center at right edge
        setWheelGeometry({
          radius: 460,
          centerX: width * 1.02,
          centerY: height * 0.5,
          scale: 0.88,
        });
      } else if (width < 1440) {
        // Standard Desktop: Center near right edge (~98% of width)
        setWheelGeometry({
          radius: 560,
          centerX: width * 0.98,
          centerY: height * 0.5,
          scale: 1,
        });
      } else {
        // Large & Ultrawide Desktop: Center aligned near right edge (~100% of width)
        setWheelGeometry({
          radius: 620,
          centerX: width * 1.00,
          centerY: height * 0.5,
          scale: 1.05,
        });
      }
    };

    updateGeometry();
    const ro = new ResizeObserver(updateGeometry);
    ro.observe(sectionRef.current);
    return () => ro.disconnect();
  }, []);

  // Target angle and smooth interpolated angle
  // Derived angle based purely on activeIndex (No RAF lag!)
  const FRONT_ANGLE = Math.PI;
  const step = totalItems > 0 ? (2 * Math.PI) / totalItems : 0;
  const renderAngle = FRONT_ANGLE - safeActiveIndex * step;

  // Move directly to target index
  const rotateToIndex = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const activeDoc = items[safeActiveIndex] || items[0];

  return (
    <section
      id="catalog"
      ref={sectionRef}
      className="relative w-full py-16 sm:py-20 lg:py-24 overflow-hidden bg-white select-none font-inter min-h-0 flex items-center"
    >
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100%] pointer-events-none opacity-30 overflow-hidden">
        <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-200/50 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 pointer-events-none flex flex-col items-center">
        <div className="w-full pointer-events-auto space-y-10 flex flex-col items-center">

          {/* Section Heading & Subtitle */}
          <div className="text-center flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-950 leading-[1.08]">
              {catalogData.heading || "Academic Document Catalog"}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 mt-4 max-w-xl leading-relaxed font-normal">
              {catalogData.description}
            </p>
          </div>

          {/* Active Document Details Inspector Panel: Stable Height Container */}
          <div className="relative min-h-[320px] sm:min-h-[340px] w-full max-w-xl flex flex-col">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeDoc?.id || "doc-empty"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }}
                className="w-full space-y-6 flex flex-col items-center text-center"
              >
                {/* Badges */}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-black/5">
                    {activeDoc?.client}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {catalogData.badgeText || "Official Credential"}
                  </span>
                </div>

                {/* Title & Description */}
                <div className="min-h-[80px] sm:min-h-[86px]">
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight leading-snug">
                    {activeDoc?.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-2.5 leading-relaxed max-w-md mx-auto">
                    {activeDoc?.description}
                  </p>
                </div>

                {/* Filing Requirements Checklist */}
                <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 border border-black/5 w-full text-left">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900 mb-4 font-mono">
                    <i className="ph-bold ph-shield-check text-gray-400 text-base" />
                    Mandatory Filing Requirements
                  </div>
                  <ul className="space-y-3 text-sm text-gray-600">
                    {activeDoc?.requirements?.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-3 leading-relaxed">
                        <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                          <i className="ph-bold ph-check text-[10px]" />
                        </span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Buttons & Pagination */}
          <div className="space-y-4 pt-4 flex flex-col items-center">
            {/* Document Pagination Status */}
            <div className="flex flex-col items-center gap-4">
              <span className="font-mono text-xs font-bold text-gray-900">
                {String(safeActiveIndex + 1).padStart(2, "0")}{" "}
                <span className="text-gray-400 font-normal">/ {String(totalItems).padStart(2, "0")}</span>
              </span>

              <div className="flex items-center gap-2">
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => rotateToIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === safeActiveIndex
                        ? "w-8 bg-gray-800"
                        : "w-2 bg-gray-200 hover:bg-gray-300"
                    }`}
                    aria-label={`Go to ${item.title}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>


    </section>
  );
}
