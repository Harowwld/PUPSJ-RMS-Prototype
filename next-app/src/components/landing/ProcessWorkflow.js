"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BevelButton from "@/components/ui/bevel-button";
import MorphButton from "@/components/ui/morph-button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const STEPS = [
  {
    num: "01",
    title: "Sign In to Portal",
    summary: "Log in with your official Student Number",
    desc: "Log in to the eManage portal using your official Student Number (format: YYYY-XXXXX-SJ-0). Both currently enrolled students and alumni can access the request system directly.",
    tags: ["Student Portal", "Student Number Login", "Current & Alumni"],
    curveClass: "lg:ml-0 sm:ml-0",
  },
  {
    num: "02",
    title: "Select Your Document",
    summary: "Choose from official academic credentials",
    desc: "Browse the available documents and select what you need—such as a Transcript of Records (TOR), Certificate of Grades, Certificate of Registration, or Diploma.",
    tags: ["8 Document Types", "Official Records", "Clear Requirements"],
    curveClass: "lg:ml-16 sm:ml-8",
  },
  {
    num: "03",
    title: "Submit Your Request",
    summary: "State your purpose and submit online",
    desc: "Indicate why you need the document (for employment, scholarship, transfer, or board exams) and submit your request form right from your phone or computer.",
    tags: ["Online Submission", "Purpose of Request", "No Paper Forms"],
    curveClass: "lg:ml-28 sm:ml-14",
  },
  {
    num: "04",
    title: "Digital Record Retrieval",
    summary: "Staff pull your records from the system",
    desc: "Registrar personnel retrieve your digitized student files directly from the system. Your grades, earned units, and credentials are authenticated without having to search physical folders.",
    tags: ["Digitized Database", "Fast System Pull", "Staff Authentication"],
    curveClass: "lg:ml-16 sm:ml-8",
  },
  {
    num: "05",
    title: "Pick Up at Registrar Counter",
    summary: "Claim your official stamped document",
    desc: "Once your document is printed and stamped with the university's official dry seal, you'll be notified that it's ready for pick-up at the Ground Floor Registrar counter.",
    tags: ["Official Dry Seal", "Registrar Counter", "Campus Pick-Up"],
    curveClass: "lg:ml-2 sm:ml-1",
  },
];

export default function ProcessWorkflow() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);

  const containerRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const card = cardRef.current;
    if (!container || !card) return;

    const ctx = gsap.context(() => {
      const isMobile = window.innerWidth < 640;
      gsap.fromTo(
        card,
        {
          borderRadius: "0px",
          scale: 1,
          borderColor: "rgba(255, 255, 255, 0.04)",
          boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
        },
        {
          borderRadius: isMobile ? "24px" : "40px",
          scale: isMobile ? 0.975 : 0.955,
          borderColor: "rgba(255, 255, 255, 0.12)",
          boxShadow: "0 35px 80px -20px rgba(0, 0, 0, 0.55), 0 0 50px -10px rgba(128, 0, 0, 0.2)",
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top 85%",
            end: "top 12%",
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        }
      );
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={containerRef}
      id="workflow" 
      className="relative w-full bg-white dark:bg-zinc-950 py-4 sm:py-8 lg:py-12 transition-colors overflow-hidden"
    >
      {/* Scroll-animated dark canvas card — begins full-bleed, smoothly morphs into a rounded framed showcase */}
      <div 
        ref={cardRef}
        className="relative w-full bg-zinc-950 text-white font-inter select-none py-20 sm:py-28 lg:py-32 overflow-hidden border border-white/[0.06] transition-colors"
        style={{
          borderRadius: 0,
          transformOrigin: "center top",
          willChange: "transform, border-radius, box-shadow",
        }}
      >
        {/* Background ambient lighting effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#800000]/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[160px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* =========================================================================
              LEFT COLUMN: STICKY EDITORIAL HERO (Relatable & Clean)
              ========================================================================= */}
          <div className="lg:col-span-5 lg:sticky lg:top-28">
            {/* Friendly, relatable title for students and alumni */}
            <motion.h2 
              initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                fontSize: "clamp(2.25rem, 4.2vw, 3.75rem)",
                lineHeight: 1.05,
              }}
              className="font-extrabold text-white tracking-tight sm:tracking-tighter mb-6"
            >
              How to Request<br />
              Your Documents.
            </motion.h2>

            {/* Clear, approachable narrative description */}
            <motion.p 
              initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs sm:text-sm md:text-base text-zinc-400 leading-relaxed font-normal max-w-md mb-8"
            >
              A straightforward guide for students and alumni. See how your document request is submitted online, authenticated from our digital records, and prepared for pick-up at the Registrar counter.
            </motion.p>

            {/* Quick Action cluster */}
            <motion.div 
              initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              <BevelButton
                onClick={() => router.push("/login")}
                className="h-11 px-6 rounded-full font-semibold text-xs tracking-wide shadow-[0_10px_25px_rgba(128,0,0,0.3)] cursor-pointer"
              >
                Request Document
              </BevelButton>

              <MorphButton
                variant="secondary"
                onClick={() => {
                  const el = document.getElementById("catalog");
                  if (el) {
                    const yOffset = -76;
                    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }
                }}
                className="h-11 px-5 rounded-full text-xs font-medium backdrop-blur-xl border border-white/15 active:scale-[0.98] cursor-pointer text-white/90"
              >
                <span>Explore Services (8)</span>
                <span className="opacity-70 text-[11px] ml-1">↓</span>
              </MorphButton>
            </motion.div>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: CURVED VERTICAL TIMELINE WITH FRAMER MOTION ENTRANCE
              ========================================================================= */}
          <div className="lg:col-span-7 relative">
            <div className="space-y-12 sm:space-y-16 relative">
              {STEPS.map((step, idx) => {
                const isSelected = activeStep === idx;
                
                return (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, y: 35, filter: "blur(6px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{
                      duration: 0.65,
                      delay: idx * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ x: 4 }}
                    onMouseEnter={() => setActiveStep(idx)}
                    className={`workflow-step-item relative pl-16 sm:pl-20 group transition-colors duration-200 ${step.curveClass}`}
                    style={{ willChange: "transform, opacity, filter" }}
                  >
                    {/* Circular Step Badge + Vertical Stem (Matches Inspo 01, 02, 03) */}
                    <div className="absolute left-0 top-0">
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.45,
                          delay: idx * 0.08 + 0.04,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-mono text-xs sm:text-sm font-extrabold transition-all duration-300 backdrop-blur-xl ${
                          isSelected
                            ? "bg-[#800000] text-white border-2 border-red-400/80 shadow-[0_0_25px_rgba(128,0,0,0.5)] scale-105"
                            : "bg-zinc-900/90 text-zinc-400 border border-white/15 group-hover:border-white/40 group-hover:text-white"
                        }`}
                      >
                        {step.num}
                      </motion.div>

                      {/* Vertical stem dropping straight down from the circle, smoothly drawing downward */}
                      {idx < STEPS.length - 1 && (
                        <motion.div 
                          initial={{ scaleY: 0, opacity: 0 }}
                          whileInView={{ scaleY: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.55,
                            delay: idx * 0.08 + 0.12,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          style={{ transformOrigin: "top" }}
                          className="absolute left-1/2 top-13 sm:top-15 w-[1px] h-12 sm:h-16 -translate-x-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none" 
                        />
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="pt-1">
                      {/* Step Header */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#ad2f2f] dark:text-red-400 font-bold">
                          Step {step.num}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="text-[11px] font-mono text-zinc-400">
                          {step.summary}
                        </span>
                      </div>

                      {/* Main Title */}
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3 group-hover:text-red-100 transition-colors">
                        {step.title}
                      </h3>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-normal max-w-xl mb-4">
                        {step.desc}
                      </p>

                      {/* Metadata tags */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {step.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-white/[0.04] border border-white/[0.08] text-zinc-300 group-hover:border-white/15 transition-colors"
                          >
                            {tag}
                          </span>
                        ))}

                        {idx === 0 && (
                          <button
                            type="button"
                            onClick={() => router.push("/login")}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 ml-2 transition-colors cursor-pointer"
                          >
                            <span>Open Portal</span>
                            <i className="ph-bold ph-arrow-right text-xs" />
                          </button>
                        )}

                        {idx === 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById("catalog");
                              if (el) {
                                const yOffset = -76;
                                const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                                window.scrollTo({ top: y, behavior: "smooth" });
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 ml-2 transition-colors cursor-pointer"
                          >
                            <span>View Catalog</span>
                            <i className="ph-bold ph-arrow-down text-xs" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

          </div>

        </div>
      </div>
      </div>
    </section>
  );
}
