"use client";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";

const PROPERTY_CSS = `
@property --bevel-angle {
  syntax: '<angle>';
  initial-value: 180deg;
  inherits: false;
}
@keyframes bevel-button-spin {
  to { --bevel-angle: 540deg; }
}
`;

let propertyStyleInjected = false;
const injectPropertyStyles = () => {
  if (typeof document === "undefined" || propertyStyleInjected) return;
  propertyStyleInjected = true;
  const style = document.createElement("style");
  style.setAttribute("data-bevel-button", "");
  style.textContent = PROPERTY_CSS;
  document.head.appendChild(style);
};

const BevelButton = React.forwardRef(
  (
    {
      className,
      children,
      speedMs = 3000,
      baseColor = "#800000",
      baseColorEnd = "#5a0000",
      borderHighlight = "rgba(255, 255, 255, 0.75)",
      style,
      ...props
    },
    ref
  ) => {
    useEffect(() => {
      injectPropertyStyles();
    }, []);

    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center rounded-[8px] border border-solid border-transparent px-[10px] py-[10px] text-[12px] font-normal leading-none text-white outline-none transition-transform active:scale-[0.98] cursor-pointer select-none",
          className
        )}
        style={{
          fontFamily:
            'var(--font-geist), Geist, "Geist Fallback", var(--font-inter), Inter, Helvetica, sans-serif',
          background: `linear-gradient(${baseColor}, ${baseColorEnd}) padding-box, linear-gradient(var(--bevel-angle, 180deg), ${borderHighlight} 0%, rgba(255,255,255,0.12) 38%, rgba(0,0,0,0.85) 100%) border-box`,
          boxShadow:
            "inset 0px -2px 2.6px 0px rgba(0,0,0,0.57), inset 0px 1px 1.7px 0px rgba(255,255,255,0.35), 0 4px 14px -2px rgba(128,0,0,0.35)",
          animation: `bevel-button-spin ${speedMs}ms linear infinite`,
          ...style,
        }}
        {...props}
      >
        {children ?? "Hello Button :)"}
      </button>
    );
  }
);

BevelButton.displayName = "BevelButton";

export { BevelButton };
export default BevelButton;
