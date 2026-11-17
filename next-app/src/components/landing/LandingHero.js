"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

const DEFAULT_HERO_CONTENT = {
  headlineLine1: "Tanglaw ng Bayan,",
  headlineLine2: "Dambana ng Kagitingan.",
  description:
    "Official institutional records keeping, archive retrieval, and document verification system for Polytechnic University of the Philippines San Juan Campus.",
  ctaText: "Request a Document",
  ctaLink: "/login",
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

export default function LandingHero({ classic, hasNotice, previewContent, preview = false }) {
  const router = useRouter();
  const [publishedContent, setHero] = useState(DEFAULT_HERO_CONTENT);
  const [currentSlide, setCurrentSlide] = useState(0);

  const reduceMotion = useReducedMotion();

  // Fetch dynamic CMS settings on mount
  const hero = previewContent ?? publishedContent;

  useEffect(() => {
    if (previewContent) return;
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
  }, [previewContent]);

  const slides = hero.slides && hero.slides.length > 0 ? hero.slides : DEFAULT_HERO_CONTENT.slides;

  const activeSlide = currentSlide % slides.length;

  useEffect(() => {
    if (preview || reduceMotion || slides.length < 2) return;

    const timer = setTimeout(() => {
      setCurrentSlide((previous) => (previous + 1) % slides.length);
    }, hero.autoRotateInterval || 5500);

    return () => clearTimeout(timer);
  }, [currentSlide, hero.autoRotateInterval, preview, reduceMotion, slides.length]);

  const photos = (
    <>
      {slides.map((slide, index) => (
        <div key={`${slide.src}-${index}`} aria-hidden={index !== activeSlide}
          className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${index === activeSlide ? "opacity-100" : "opacity-0"}`}>
          <Image src={slide.src} alt={slide.alt || "Campus photo"} fill preload={index === 0}
            sizes={classic ? "100vw" : "(max-width: 1440px) 100vw, 1440px"}
            quality={85} className="object-cover object-center" />
        </div>
      ))}
    </>
  );

  return (
    <section className={`w-full bg-white text-center ${preview ? (classic ? "" : "pt-10") : classic ? (hasNotice ? "pt-6" : "pt-[69px]") : hasNotice ? "pt-12 sm:pt-20" : "pt-24 sm:pt-32"}`}>
      <div className={classic ? "relative isolate grid min-h-[550px] h-[75vh] place-items-center overflow-hidden px-6" : "mx-auto max-w-6xl px-5"}>
        {classic && (
          <div className="absolute inset-0 -z-10">
            {photos}
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div aria-hidden="true" className="absolute inset-0 bg-pup-maroon/30" />
          </div>
        )}
        <div>
          <h1 className={classic ? "text-[clamp(2.25rem,5vw,4.5rem)] font-extrabold leading-[1.04] tracking-tight text-white" : "text-[clamp(2rem,6.25vw,5rem)] font-semibold leading-[1.05] tracking-[-0.015em]"}>
            <span className="block">{hero.headlineLine1 || DEFAULT_HERO_CONTENT.headlineLine1}</span>
            <span className="block">{hero.headlineLine2 || DEFAULT_HERO_CONTENT.headlineLine2}</span>
          </h1>
          <p className={classic ? "mx-auto mt-6 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base" : "mx-auto mt-5 max-w-2xl text-[17px] leading-[1.47] tracking-[-0.022em] text-[#707070]"}>
            {hero.description || DEFAULT_HERO_CONTENT.description}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button
              onClick={preview ? undefined : () => router.push("/login")}
              className={classic ? "h-11 rounded-xl px-8" : "rounded-full bg-pup-maroon px-4 text-white hover:bg-pup-darkMaroon"}
            >
              {hero.ctaText || DEFAULT_HERO_CONTENT.ctaText}
            </Button>
            {!classic && <Button asChild variant="outline" className="rounded-full border-[#86868b] bg-white px-4 text-[#1d1d1f] shadow-none">
              <a href={preview ? undefined : "#catalog"}>Browse Documents</a>
            </Button>}
          </div>
        </div>
      </div>

      {!classic && (
        <div className="relative mx-auto mt-10 aspect-[4/3] w-full max-w-[1440px] overflow-hidden bg-[#f5f5f7] sm:aspect-[2/1]">
          {photos}
        </div>
      )}

      {slides.length > 1 && (
        <div className="flex justify-center px-4 pt-5">
          <div role="group" aria-label="Campus photo controls" className="flex items-center rounded-full bg-[#f5f5f7] px-3">
            {slides.map((slide, index) => (
              <button
                key={`${slide.src}-${index}`}
                type="button"
                onClick={() => setCurrentSlide(index)}
                aria-label={slide.label || `View campus photo ${index + 1}`}
                aria-pressed={index === activeSlide}
                className="flex h-11 min-w-8 items-center justify-center rounded-full"
              >
                <span className={`h-2 rounded-full ${
                  index === activeSlide ? "w-4 bg-pup-maroon" : "w-2 bg-[#86868b]"
                }`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
