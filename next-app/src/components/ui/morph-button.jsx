"use client";

import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";
import MorphSVGPlugin from "gsap/MorphSVGPlugin";
import { cn } from "@/lib/cn";

if (typeof window !== "undefined") {
  gsap.registerPlugin(MorphSVGPlugin);
}

const MorphButton = React.forwardRef(
  (
    {
      className,
      variant = "default",
      fillColor,
      textColor,
      activeTextColor,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef(null);

    const isSecondary = variant === "secondary";

    const resolvedFillColor =
      fillColor ?? (isSecondary ? "#ffffff" : "#800000");
    const resolvedTextColor =
      textColor ?? (isSecondary ? "#ffffff" : "#000000");
    const resolvedActiveTextColor =
      activeTextColor ?? (isSecondary ? "#09090b" : "#ffffff");

    const defaultVariantClasses = isSecondary
      ? "bg-white/10 hover:bg-white/15 text-white border-white/20 backdrop-blur-xl"
      : "bg-white text-black border-transparent";

    useEffect(() => {
      const el = buttonRef.current;
      if (!el) return;

      const ctx = gsap.context(() => {
        // Bleed 25% past viewBox on all 4 boundaries to ensure 100% seamless edge coverage
        const start = "M -25 125 V 25 Q 50 -25 125 25 V 125 z";
        const end = "M -25 125 V -25 Q 50 -25 125 -25 V 125 z";

        const pathEl = el.querySelector(".morph-path");
        const textEl = el.querySelector(".morph-text");

        if (!pathEl || !textEl) return;

        const tl = gsap.timeline({ paused: true });

        tl.to(pathEl, {
          morphSVG: start,
          duration: 0.3,
          ease: "power2.in",
        })
          .to(pathEl, {
            morphSVG: end,
            duration: 0.3,
            ease: "power2.out",
          })
          .to(
            el,
            {
              backgroundColor: resolvedFillColor,
              borderColor: resolvedFillColor,
              duration: 0.15,
              ease: "power1.out",
            },
            0.38
          );

        const tl2 = gsap.timeline({ paused: true });
        tl2.fromTo(
          textEl,
          { color: resolvedTextColor },
          {
            color: resolvedActiveTextColor,
            duration: 0.45,
            scale: 1.02,
            ease: "power2.inOut",
          }
        );

        const onEnter = () => {
          tl.play();
          tl2.play();
        };

        const onLeave = () => {
          tl.reverse();
          tl2.reverse();
        };

        el.addEventListener("mouseenter", onEnter);
        el.addEventListener("mouseleave", onLeave);

        return () => {
          el.removeEventListener("mouseenter", onEnter);
          el.removeEventListener("mouseleave", onLeave);
        };
      }, el);

      return () => ctx.revert();
    }, [resolvedFillColor, resolvedTextColor, resolvedActiveTextColor]);

    return (
      <button
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        disabled={disabled}
        className={cn(
          "relative button cursor-pointer overflow-hidden px-8 py-3 rounded-full text-xs font-semibold shadow-xs transition-all active:scale-[0.98] border h-12 flex items-center justify-center",
          defaultVariantClasses,
          className
        )}
        {...props}
      >
        <div className="absolute -inset-1.5 pointer-events-none overflow-hidden rounded-full">
          <svg
            style={{
              width: "100%",
              height: "100%",
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="transition"
          >
            <path
              className="morph-path"
              fill={resolvedFillColor}
              strokeWidth="0px"
              vectorEffect="non-scaling-stroke"
              d="M -25 125 V 125 Q 50 125 125 125 V 125 z"
            />
          </svg>
        </div>
        <div className="relative z-10 morph-text select-none flex items-center gap-2">
          {children ?? "Hover Me"}
        </div>
      </button>
    );
  }
);

MorphButton.displayName = "MorphButton";

export default MorphButton;
