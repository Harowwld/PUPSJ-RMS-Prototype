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
  // FRONT_ANGLE is PI (9 o'clock position on the Ferris wheel, closest to left inspector)
  const FRONT_ANGLE = Math.PI;
  const targetAngleRef = useRef(FRONT_ANGLE);
  const currentAngleRef = useRef(FRONT_ANGLE);
  const [renderAngle, setRenderAngle] = useState(FRONT_ANGLE);

  // Drag interaction state
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartXRef = useRef(0);
  const dragStartAngleRef = useRef(FRONT_ANGLE);

  // Move directly to target index
  const rotateToIndex = useCallback((index) => {
    if (totalItems === 0) return;
    const step = (2 * Math.PI) / totalItems;
    const desiredAngle = FRONT_ANGLE - index * step;

    // Find shortest rotational path from current target angle
    const diff = desiredAngle - targetAngleRef.current;
    const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
    targetAngleRef.current += normalizedDiff;
    setActiveIndex(index);
  }, [totalItems, FRONT_ANGLE]);

  // Continuous animation loop (Ferris Wheel rotation)
  useEffect(() => {
    let animId;
    let lastTime = performance.now();

    const tick = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Auto rotation: slow majestic Ferris wheel turn (~55 seconds per revolution)
      if (!isHovered && !isDraggingRef.current) {
        targetAngleRef.current += 0.12 * dt;
      }

      // Smooth spring lerp toward target angle
      const angleDiff = targetAngleRef.current - currentAngleRef.current;
      currentAngleRef.current += angleDiff * Math.min(dt * 8, 0.3);

      setRenderAngle(currentAngleRef.current);

      // Identify which carriage is closest to focal position (FRONT_ANGLE = PI)
      if (totalItems > 0) {
        const step = (2 * Math.PI) / totalItems;
        let closestIdx = 0;
        let minDiff = Infinity;

        for (let i = 0; i < totalItems; i++) {
          const itemAngle = currentAngleRef.current + i * step;
          const diff = Math.abs(Math.atan2(Math.sin(itemAngle - FRONT_ANGLE), Math.cos(itemAngle - FRONT_ANGLE)));
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        }

        if (closestIdx !== activeIndex) {
          setActiveIndex(closestIdx);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isHovered, totalItems, activeIndex, FRONT_ANGLE]);

  // Pointer drag event handlers for the Ferris wheel stage
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartXRef.current = e.clientX;
    dragStartAngleRef.current = targetAngleRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaY = e.clientY - dragStartYRef.current;
    const deltaX = e.clientX - dragStartXRef.current;
    // Dragging UP/DOWN on a Ferris wheel rotates the wheel
    targetAngleRef.current = dragStartAngleRef.current - deltaY * 0.003 - deltaX * 0.002;
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    setIsHovered(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    // Snap to nearest carriage on release
    if (totalItems > 0) {
      const step = (2 * Math.PI) / totalItems;
      let closestIdx = 0;
      let minDiff = Infinity;

      for (let i = 0; i < totalItems; i++) {
        const itemAngle = targetAngleRef.current + i * step;
        const diff = Math.abs(Math.atan2(Math.sin(itemAngle - FRONT_ANGLE), Math.cos(itemAngle - FRONT_ANGLE)));
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      rotateToIndex(closestIdx);
    }
  };

  const activeDoc = items[safeActiveIndex] || items[0];

  return (
    <section
      id="catalog"
      ref={sectionRef}
      className="relative w-full py-20 sm:py-28 lg:py-36 overflow-hidden bg-white dark:bg-zinc-950 select-none font-inter min-h-[800px] sm:min-h-[860px] lg:min-h-[940px] flex items-center"
    >
      {/* Ambient background glow behind rotating documents on the right */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[70vw] h-[90%] pointer-events-none opacity-40 dark:opacity-20 overflow-hidden">
        <div className="w-full h-full bg-radial from-[#800000]/15 via-transparent to-transparent blur-3xl" />
      </div>

      {/* Main Content Area: Left Column with Breathing Room */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-20 pointer-events-none">
        <div className="max-w-xl lg:max-w-[480px] xl:max-w-[520px] pointer-events-auto space-y-7">

          {/* Section Heading & Subtitle */}
          <div>
            {catalogData.eyebrow && (
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#800000] dark:text-red-400 font-bold mb-2">
                {catalogData.eyebrow}
              </div>
            )}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gray-950 dark:text-white leading-[1.08]">
              {catalogData.heading || "Academic Document Catalog"}
            </h2>
            <p className="text-sm sm:text-base text-gray-500 dark:text-zinc-400 mt-2.5 leading-relaxed font-normal">
              {catalogData.description}
            </p>
          </div>

          {/* Active Document Details Inspector Panel: Stable Height Container */}
          <div className="relative min-h-[320px] sm:min-h-[340px]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeDoc?.id || "doc-empty"}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2, ease: "easeOut" } }}
                exit={{ opacity: 0, transition: { duration: 0.15, ease: "easeIn" } }}
                className="w-full space-y-5"
              >
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/[0.06] dark:border-white/[0.08]">
                    {activeDoc?.client}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {catalogData.badgeText || "Official Credential"}
                  </span>
                </div>

                {/* Title & Description with stable min-height */}
                <div className="min-h-[80px] sm:min-h-[86px]">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight leading-snug">
                    {activeDoc?.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-zinc-300 mt-2 leading-relaxed">
                    {activeDoc?.description}
                  </p>
                </div>

                {/* Filing Requirements Checklist with stable min-height */}
                <div className="p-4 sm:p-5 rounded-2xl liquid-glass-light min-h-[148px]">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-zinc-100 mb-3 font-mono">
                    <i className="ph-bold ph-shield-check text-[#800000] dark:text-red-400 text-base" />
                    Mandatory Filing Requirements
                  </div>
                  <ul className="space-y-2 text-xs text-gray-600 dark:text-zinc-300">
                    {activeDoc?.requirements?.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold">
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

          {/* Action Buttons & Pagination: Permanently Mounted Without Jitter */}
          <div className="space-y-4 pt-1">
            {catalogData.primaryButtonEnabled !== false && (
              <div>
                <BevelButton
                  onClick={() => {
                    const link = catalogData.primaryButtonLink || "/login";
                    if (link.startsWith("#")) {
                      const el = document.getElementById(link.substring(1));
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    } else {
                      router.push(link);
                    }
                  }}
                  className="h-11 px-7 rounded-full text-xs font-bold tracking-wide cursor-pointer flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  <span>{catalogData.primaryButtonText || "Request Credential"}</span>
                  <i className="ph-bold ph-arrow-right text-xs" />
                </BevelButton>
              </div>
            )}

            {/* Document Pagination Status */}
            <div className="flex items-center gap-3 pt-1">
              <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
                {String(safeActiveIndex + 1).padStart(2, "0")}{" "}
                <span className="text-gray-400 font-normal">/ {String(totalItems).padStart(2, "0")}</span>
              </span>

              <div className="flex items-center gap-1.5">
                {items.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => rotateToIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === safeActiveIndex
                        ? "w-7 bg-[#800000] dark:bg-red-500"
                        : "w-1.5 bg-gray-300 dark:bg-zinc-700 hover:bg-gray-400"
                    }`}
                    aria-label={`Go to ${item.title}`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Circular Rotating Document Stage: Sweeps across the section and out of the screen */}
      <div
        className="absolute inset-0 w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing select-none overflow-visible"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Orbiting Document Cards */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {items.map((item, idx) => {
            const step = (2 * Math.PI) / totalItems;
            const angle = renderAngle + idx * step;

            // Position along the circular orbit
            const x = wheelGeometry.centerX + wheelGeometry.radius * Math.cos(angle);
            const y = wheelGeometry.centerY + wheelGeometry.radius * Math.sin(angle);

            // Depth calculation: angle = PI is focal station (closest to left column)
            // depthFactor = 1.0 at FRONT_ANGLE (PI), 0.0 at 0 (far right off-screen)
            const depthFactor = (1 - Math.cos(angle)) / 2;

            const scale = (0.76 + 0.28 * depthFactor) * wheelGeometry.scale;
            const opacity = 0.25 + 0.75 * depthFactor;
            const zIndex = Math.round(10 + 40 * depthFactor);

            // Subtle organic tilt
            const subtleTilt = Math.sin(angle) * 2.5;

            const isActive = idx === safeActiveIndex;

            return (
              <div
                key={item.id}
                onClick={() => rotateToIndex(idx)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="absolute pointer-events-auto cursor-pointer select-none active:scale-[0.98] transition-transform duration-150 transform-gpu"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(-50%, -50%) scale(${scale}) rotateZ(${subtleTilt}deg)`,
                  opacity: opacity,
                  zIndex: zIndex,
                  filter: depthFactor < 0.2 ? "blur(1px)" : "none",
                  transition: isDragging
                    ? "none"
                    : "box-shadow 250ms cubic-bezier(0.23, 1, 0.32, 1), filter 250ms ease-out",
                }}
              >
                <DocumentCardPreview item={item} isActive={isActive} />
              </div>
            );
          })}
        </div>

        {/* Interactive Instruction Floating Pill */}
        {catalogData.dragHint && (
          <div className="absolute bottom-6 right-8 pointer-events-none hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full navbar-liquid-glass text-[11px] font-mono text-gray-500 dark:text-zinc-400 shadow-md">
            <i className="ph-bold ph-hand-pointing text-xs text-[#800000] dark:text-red-400" />
            <span>{catalogData.dragHint}</span>
          </div>
        )}
      </div>

    </section>
  );
}
