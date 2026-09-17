"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const DEFAULT_HERO_CONTENT = {
  headlineLine1: "Tanglaw ng Bayan,",
  headlineLine2: "Dambana ng Kagitingan.",
  description:
    "Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus.",
  ctaText: "Request",
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


  return (
    <section 
      ref={heroContainerRef} 
      className="relative w-full mx-0 px-0 mt-[69px] mb-0 font-jakarta select-none bg-[#ffffff]"
    >
      {/* Hero container with gap below navbar */}
      <div 
        ref={heroInnerRef}
        className="relative w-full h-[75vh] min-h-[550px] overflow-hidden flex flex-col justify-center px-6 sm:px-12 lg:px-16"
      >
        
        {/* BACKGROUND IMAGE CAROUSEL WITH CINEMATIC ATMOSPHERIC MASKS */}
        <div className="absolute inset-0 w-full h-full z-0 select-none pointer-events-none overflow-hidden bg-[#ffffff]">
          {slides.map((slide, idx) => (
            <div
              key={slide.src || idx}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <Image 
                src={slide.src} 
                alt={slide.alt || "Campus Photo"} 
                fill
                priority={idx === 0}
                sizes="100vw"
                quality={85}
                className="object-cover object-center"
              />
            </div>
          ))}
          {/* Gradient scrims — heavier left for text, lighter right to let image breathe */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
          <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute inset-0 w-full h-full bg-[#800000]/30" />
        </div>

        {/* MAIN HERO CONTENT — CENTERED */}
        <div className="relative z-10 w-full max-w-7xl mx-auto my-auto py-8 sm:py-14 flex flex-col items-center text-center">
          <div className="w-full max-w-4xl flex flex-col items-center">
            <h1 
              ref={headlineRef}
              style={{
                fontSize: "clamp(2.25rem, 5vw, 4.5rem)",
                lineHeight: 1.04,
              }}
              className="tanglaw-heading font-extrabold text-white tracking-tight sm:tracking-tighter mb-6"
            >
              <span className="block">{hero.headlineLine1 || "Tanglaw ng Bayan,"}</span>
              <span className="block">
                {hero.headlineLine2 || "Dambana ng Kagitingan."}
              </span>
            </h1>

            <p 
              ref={descRef}
              className="text-xs sm:text-sm md:text-base text-zinc-300 leading-relaxed max-w-xl mx-auto mb-10 font-normal"
            >
              {hero.description ||
                "Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus."}
            </p>

            {/* Action Cluster — centered */}
            <div 
              ref={ctaClusterRef}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <Button
                onClick={() => router.push("/login")}
                className="h-11 px-8 rounded-full btn-brand-red text-[13px] font-medium text-white active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Request</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* APPLE-STYLE PAGINATION OUTSIDE THE IMAGE PANEL */}
      <div className="w-full flex justify-center py-5 bg-[#ffffff]">
        <div className="flex items-center gap-2 px-3 py-1">
          {slides.map((_, idx) => {
            const isActive = idx === currentSlide;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`View campus photo ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out cursor-pointer ${
                  isActive 
                    ? "w-6 bg-gray-800" 
                    : "w-1.5 bg-gray-300 hover:bg-gray-400"
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
