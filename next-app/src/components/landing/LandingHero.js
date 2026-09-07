"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import BevelButton from "@/components/ui/bevel-button";
import MorphButton from "@/components/ui/morph-button";

gsap.registerPlugin(ScrollTrigger);

const CAMPUS_SLIDES = [
  {
    src: "/assets/pup/landing-1.jpg",
    alt: "PUP San Juan Campus Building Entrance",
    label: "Main Campus Entrance",
  },
  {
    src: "/assets/pup/landing-2.jpg",
    alt: "PUP San Juan Academic Hall & Records Center",
    label: "Academic & Records Hall",
  },
  {
    src: "/assets/pup/landing-3.jpg",
    alt: "PUP San Juan Campus Grounds & Facade",
    label: "Campus Grounds & Courtyard",
  },
];

export default function LandingHero() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const heroContainerRef = useRef(null);
  const heroInnerRef = useRef(null);
  const headlineRef = useRef(null);
  const descRef = useRef(null);
  const ctaClusterRef = useRef(null);

  // Auto-switch campus background photos every 5.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAMPUS_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  // GSAP Orchestration & Entrance Animation (sequenced after navbar slides in)
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (headlineRef.current) {
        tl.fromTo(
          headlineRef.current.children,
          { 
            y: 32, 
            opacity: 0, 
            filter: "blur(12px)",
            scale: 0.97,
          },
          { 
            y: 0, 
            opacity: 1, 
            filter: "blur(0px)", 
            scale: 1, 
            duration: 1.1, 
            stagger: 0.18 
          },
          0.35
        );
      }

      if (descRef.current) {
        tl.fromTo(
          descRef.current,
          { 
            y: 20, 
            opacity: 0, 
            filter: "blur(8px)" 
          },
          { 
            y: 0, 
            opacity: 1, 
            filter: "blur(0px)", 
            duration: 0.9 
          },
          0.65
        );
      }

      if (ctaClusterRef.current) {
        tl.fromTo(
          ctaClusterRef.current.children,
          { 
            y: 16, 
            opacity: 0, 
            scale: 0.94,
            filter: "blur(4px)" 
          },
          { 
            y: 0, 
            opacity: 1, 
            scale: 1, 
            filter: "blur(0px)", 
            duration: 0.75, 
            stagger: 0.1,
            ease: "back.out(1.2)" 
          },
          0.85
        );
      }
    }, heroContainerRef);

    return () => ctx.revert();
  }, []);

  // Scroll-driven border-radius + inset animation (Apple TV+ style)
  useEffect(() => {
    const inner = heroInnerRef.current;
    const container = heroContainerRef.current;
    if (!inner || !container) return;

    const ctx = gsap.context(() => {
      // Container frame: shrink inward + gain border-radius
      // Background naturally follows (child of inner), clipped by overflow:hidden + borderRadius
      gsap.fromTo(
        inner,
        {
          borderRadius: "0px",
          scale: 1,
        },
        {
          borderRadius: "24px",
          scale: 0.95,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        }
      );
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <section 
      ref={heroContainerRef} 
      className="relative w-full mx-0 px-0 mt-0 mb-12 sm:mb-16 font-inter select-none bg-zinc-950"
    >
      {/* Scroll-animated inner container — starts full-bleed, gains border-radius on scroll */}
      <div 
        ref={heroInnerRef}
        className="relative w-full min-h-[92vh] sm:min-h-screen overflow-hidden flex flex-col justify-between pt-24 sm:pt-28 pb-8 px-6 sm:px-12 lg:px-16 border-none shadow-none bg-zinc-950"
        style={{ borderRadius: 0, willChange: "border-radius, transform" }}
      >
        
        {/* BACKGROUND IMAGE CAROUSEL WITH CINEMATIC ATMOSPHERIC MASKS */}
        <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none overflow-hidden bg-zinc-950">
          {CAMPUS_SLIDES.map((slide, idx) => (
            <div
              key={slide.src}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img 
                src={slide.src} 
                alt={slide.alt} 
                className={`w-full h-full object-cover object-center transform transition-transform duration-[7000ms] ease-out ${
                  idx === currentSlide ? "scale-100" : "scale-108"
                }`}
              />
            </div>
          ))}
          {/* Gradient scrims — heavier left for text, lighter right to let image breathe */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-zinc-950/30" />
          <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
          <div className="absolute inset-0 w-full h-full bg-[#800000]/10 mix-blend-overlay" />
        </div>

        {/* MAIN HERO CONTENT — LEFT-ALIGNED ASYMMETRIC (text ~55%, image breathes right) */}
        <div className="relative z-10 w-full max-w-7xl mx-auto my-auto py-8 sm:py-14 flex flex-col items-start text-left">
          <div className="w-full max-w-[55%] max-lg:max-w-[70%] max-sm:max-w-full">
            <h1 
              ref={headlineRef}
              style={{
                fontSize: "clamp(2.25rem, 5vw, 4.5rem)",
                lineHeight: 1.04,
              }}
              className="tanglaw-heading font-extrabold text-white tracking-tight sm:tracking-tighter mb-5"
            >
              <span className="block">Tanglaw ng Bayan,</span>
              <span className="block">
                Dambana ng Kagitingan.
              </span>
            </h1>

            <p 
              ref={descRef}
              className="text-xs sm:text-sm md:text-base text-slate-200/85 leading-relaxed max-w-md mb-8 font-normal"
            >
              Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus.
            </p>

            {/* Action Cluster — left-aligned */}
            <div 
              ref={ctaClusterRef}
              className="flex flex-wrap items-center justify-start gap-4"
            >
            <BevelButton
              onClick={() => router.push("/login")}
              className="h-13 px-9 rounded-full font-semibold text-xs tracking-wide shadow-[0_10px_30px_rgba(128,0,0,0.35)] cursor-pointer"
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
              className="h-13 px-7 rounded-full text-xs font-medium backdrop-blur-xl border border-white/20 active:scale-[0.98] cursor-pointer"
            >
              <span>Explore Services (8)</span>
              <span className="opacity-70 text-[11px]">↓</span>
            </MorphButton>
            </div>
          </div>
        </div>

        {/* BOTTOM ACCREDITATION BANNER & CAMPUS PHOTO CONTROLS */}
        <div className="relative z-10 border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span>223 Ortega Street, corner A. Mabini Street, Barangay Addition Hills, San Juan City</span>
          </div>

          {/* Apple-styled Campus Photo Switcher Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[10px] font-mono text-white/75">
              <span>{CAMPUS_SLIDES[currentSlide].label}</span>
              <div className="flex items-center gap-1.5 ml-1">
                {CAMPUS_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`View campus photo ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                      idx === currentSlide ? "w-5 bg-white shadow-xs" : "w-1.5 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/50">
              <span>REGISTRAR: 8:00 AM – 5:00 PM</span>
              <span className="text-white/30">·</span>
              <span>MON – FRI</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
