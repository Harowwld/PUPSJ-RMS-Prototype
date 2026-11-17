"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AppIcon from "@/components/ui/app-icon";
import { DEFAULT_WORKFLOW_CONTENT } from "@/lib/landingRequestContent";
import { useAppReducedMotion } from "@/lib/motion";

export default function ProcessWorkflow({ classic }) {
  const [workflow, setWorkflow] = useState(DEFAULT_WORKFLOW_CONTENT);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/landing/workflow", { signal: controller.signal })
      .then((response) => response.json())
      .then((response) => {
        if (response.ok && response.data) setWorkflow(response.data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.warn("[ProcessWorkflow] Using default workflow:", error);
      });
    return () => controller.abort();
  }, []);

  return <WorkflowSection workflow={workflow} classic={classic} />;
}

function getStepCurveClass(idx, total, curveStyle = "gentle") {
  if (curveStyle === "none" || total <= 1) {
    return "lg:ml-0 sm:ml-0";
  }

  // Calculate sinusoidal arc: 0 at ends, peak in middle
  const progress = idx / (total - 1);
  const factor = Math.sin(progress * Math.PI);

  if (curveStyle === "pronounced") {
    if (factor > 0.85) return "ml-7 sm:ml-14 lg:ml-28";
    if (factor > 0.55) return "ml-5 sm:ml-10 lg:ml-20";
    if (factor > 0.25) return "ml-2 sm:ml-5 lg:ml-10";
    return "lg:ml-0 sm:ml-0";
  }

  // gentle
  if (factor > 0.85) return "ml-5 sm:ml-10 lg:ml-20";
  if (factor > 0.55) return "ml-3 sm:ml-7 lg:ml-14";
  if (factor > 0.25) return "ml-1 sm:ml-3 lg:ml-6";
  return "lg:ml-0 sm:ml-0";
}

export function WorkflowSection({ workflow, classic }) {
  const [activeStep, setActiveStep] = useState(0);
  const reduceMotion = useAppReducedMotion();
  const steps = workflow.steps;

  // Handle smooth navigation / scrolling
  const handleActionClick = (target, type = "link") => {
    if (!target) return;
    if (target === "catalog" || target.startsWith("#") || type === "scroll") {
      const targetId = target.replace(/^#/, "");
      const el = document.getElementById(targetId);
      if (el) {
        const yOffset = -76;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: reduceMotion ? "instant" : "smooth" });
      }
      return;
    }
    // Always open portal links in a new tab per user request
    window.open(target, "_blank", "noopener,noreferrer");
  };



  return (
    <section
      id="workflow"
      aria-labelledby="workflow-heading"
      className={`relative w-full scroll-mt-20 overflow-hidden font-jakarta ${classic ? "bg-zinc-950 text-white" : "bg-white text-[#1d1d1f]"}`}
    >
      <div className={`mx-auto max-w-7xl px-6 sm:px-10 lg:px-16 ${classic ? "py-20 sm:py-28 lg:py-32" : "py-16 sm:py-[90px]"}`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* =========================================================================
              LEFT COLUMN: CENTERED EDITORIAL HERO (Adjusts to middle of steps)
              ========================================================================= */}
          <div className="lg:col-span-5 flex flex-col justify-center my-auto lg:py-4">
            {/* Friendly, relatable title for students and alumni */}
            <motion.h2 id="workflow-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 28, filter: "blur(6px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`mb-5 max-w-[340px] font-semibold leading-[1.08] ${classic ? "text-5xl tracking-tight sm:text-6xl lg:text-7xl" : "text-3xl sm:text-[40px]"}`}
            >
              {workflow.headingLine1 || "How to Request"}<br />
              {workflow.headingLine2 || "Your Documents."}
            </motion.h2>

            {/* Clear, approachable narrative description */}
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 24, filter: "blur(4px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mb-5 max-w-md text-[17px] leading-[1.47] text-current opacity-75"
            >
              {workflow.description}
            </motion.p>
            <p className="max-w-md text-sm leading-relaxed text-current opacity-75">
              Scanned records are stored locally and accessible only to authorized staff.
            </p>
          </div>

          {/* =========================================================================
              RIGHT COLUMN: CURVED VERTICAL TIMELINE WITH FRAMER MOTION ENTRANCE
              ========================================================================= */}
          <div className="lg:col-span-7 relative">
            <div className="space-y-12 sm:space-y-16 relative">
              {steps.map((step, idx) => {
                const isSelected = activeStep === idx;
                const curveClass = getStepCurveClass(
                  idx,
                  steps.length,
                  workflow.curveStyle || "gentle"
                );

                return (
                  <motion.div
                    key={step.num || idx}
                    initial={reduceMotion ? false : { opacity: 0, y: 35, filter: "blur(6px)" }}
                    whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.65,
                      delay: idx * 0.08,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={reduceMotion ? undefined : { x: 4 }}
                    onMouseEnter={() => setActiveStep(idx)}
                    className={`workflow-step-item relative pl-16 sm:pl-20 group transition-colors duration-200 ${curveClass}`}
                  >
                    {/* Circular Step Badge + Vertical Stem */}
                    <div className="absolute left-0 top-0">
                      <motion.div
                        initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.45,
                          delay: idx * 0.08 + 0.04,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-sans tabular-nums text-sm transition-all duration-300 ${
                          isSelected
                            ? "bg-pup-maroon text-white"
                            : classic ? "border border-white/10 bg-white/5 text-zinc-300" : "bg-[#f5f5f7] text-[#1d1d1f]"
                        }`}
                      >
                        {step.num || String(idx + 1).padStart(2, "0")}
                      </motion.div>

                    </div>

                    {/* Step Content */}
                    <div className="pt-1">

                      {/* Main Title */}
                      <h3 className="mb-2 text-xl font-semibold tracking-tight sm:text-2xl">
                        {step.title}
                      </h3>

                      {/* Description */}
                      {step.desc && (
                        <p className="max-w-xl text-base leading-[1.47] text-current opacity-75 sm:text-[17px]">
                          {step.desc}
                        </p>
                      )}

                      {/* Metadata tags + optional action button */}
                      <div className="flex flex-wrap items-center gap-2 empty:hidden [&:not(:empty)]:mt-3">
                        {Array.isArray(step.tags) &&
                          step.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium bg-transparent border border-[#d6d6d6] text-current opacity-75 transition-colors"
                            >
                              {tag}
                            </span>
                          ))}

                        {step.actionLabel && (
                          <button
                            type="button"
                            onClick={() => handleActionClick(step.actionTarget, step.actionType)}
                            className={`inline-flex items-center gap-1 cursor-pointer text-sm font-medium hover:underline ${classic ? "text-red-300" : "text-pup-maroon"}`}
                          >
                            <span>{step.actionLabel}</span>
                            <AppIcon  className={` ${step.actionIcon || (step.actionType === "scroll" || step.actionTarget === "catalog" ? "ArrowDown01Icon" : "ArrowRight02Icon")} text-xs`} />
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
    </section>
  );
}
