"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import BevelButton from "@/components/ui/bevel-button";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_HERO_CONTENT = {
  headlineLine1: "Tanglaw ng Bayan,",
  headlineLine2: "Dambana ng Kagitingan.",
  description:
    "Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus.",
  ctaText: "Request Document",
  ctaLink: "/login",
  campusAddress:
    "223 Ortega St. cor. A. Mabini St., Addition Hills, San Juan City",
  registrarHours: "REGISTRAR: 8:00 AM – 5:00 PM",
  operatingDays: "MON – FRI",
  autoRotateInterval: 5500,
  slides: [
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
  ],
};

export default function LandingHero() {
  const router = useRouter();
  const [hero, setHero] = useState(DEFAULT_HERO_CONTENT);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroContainerRef = useRef(null);
  const heroInnerRef = useRef(null);
  const headlineRef = useRef(null);
  const descRef = useRef(null);
  const ctaClusterRef = useRef(null);

  // Fetch dynamic CMS settings on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/landing/hero")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.ok && json?.data) {
          setHero(json.data);
        }
      })
      .catch((err) => {
        console.warn("[LandingHero] Dynamic content fetch failed, using defaults:", err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const slides = hero.slides && hero.slides.length > 0 ? hero.slides : DEFAULT_HERO_CONTENT.slides;

  // Auto-switch campus background photos
  useEffect(() => {
    const interval = hero.autoRotateInterval || 5500;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, interval);
    return () => clearInterval(timer);
  }, [hero.autoRotateInterval, slides.length]);

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
          {slides.map((slide, idx) => (
            <div
              key={slide.src || idx}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <img 
                src={slide.src} 
                alt={slide.alt || "Campus Photo"} 
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
              <span className="block">{hero.headlineLine1 || "Tanglaw ng Bayan,"}</span>
              <span className="block">
                {hero.headlineLine2 || "Dambana ng Kagitingan."}
              </span>
            </h1>

            <p 
              ref={descRef}
              className="text-xs sm:text-sm md:text-base text-slate-200/85 leading-relaxed max-w-md mb-8 font-normal"
            >
              {hero.description ||
                "Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus."}
            </p>

            {/* Action Cluster — left-aligned */}
            <div 
              ref={ctaClusterRef}
              className="flex flex-wrap items-center justify-start gap-4"
            >
              <BevelButton
                onClick={() => router.push("/login")}
                className="h-11 px-7 rounded-full text-xs font-bold tracking-wide cursor-pointer flex items-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                <span>Request Document</span>
                <i className="ph-bold ph-arrow-right text-xs" />
              </BevelButton>
            </div>
          </div>
        </div>

        {/* BOTTOM ACCREDITATION BANNER & CAMPUS PHOTO CONTROLS */}
        <div className="relative z-10 px-4 sm:px-6 py-3 rounded-2xl liquid-glass-dark-pill bg-zinc-950/40 grid grid-cols-1 md:grid-cols-3 items-center gap-3 text-xs text-white/75">
          {/* Left: Campus address */}
          <div className="flex items-center gap-2 justify-start">
            <span className="truncate">
              {hero.campusAddress || "223 Ortega St. cor. A. Mabini St., Addition Hills, San Juan City"}
            </span>
          </div>

          {/* Center: Apple-styled Campus Photo Pagination */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              {slides.map((_, idx) => {
                const isActive = idx === currentSlide;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`View campus photo ${idx + 1}`}
                    className={`relative h-2 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
                      isActive 
                        ? "w-7 bg-white/40" 
                        : "w-2 bg-white/30 hover:bg-white/60"
                    }`}
                  >
                    {isActive && (
                      <div 
                        key={currentSlide}
                        className="absolute inset-y-0 left-0 bg-white rounded-full"
                        style={{
                          animation: "carouselProgress 5.5s linear forwards",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Registrar hours */}
          <div className="hidden md:flex items-center justify-end gap-3 text-[11px] font-mono text-white/50">
            <span>{hero.registrarHours || "REGISTRAR: 8:00 AM – 5:00 PM"}</span>
            <span className="text-white/30">·</span>
            <span>{hero.operatingDays || "MON – FRI"}</span>
          </div>
        </div>

      </div>
    </section>
  );
}
