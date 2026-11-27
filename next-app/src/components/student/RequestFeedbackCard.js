"use client";

import Image from "next/image";
import { useId, useRef } from "react";
import { useInView } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ArrowDown01Icon } from "hugeicons-react";
import { cn } from "@/lib/utils";
import styles from "./RequestFeedbackCard.module.css";

export function RequestFeedbackBackdrop({ sizes }) {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      <Image
        src="/assets/campus-hero.jpg"
        alt=""
        fill
        sizes={sizes}
        className="object-cover object-[center_45%]"
      />
    </div>
  );
}

export default function RequestFeedbackCard({ minimized, onToggle, onRate }) {
  const descriptionId = useId();
  const cardRef = useRef(null);
  const hasEntered = useInView(cardRef, { once: true, amount: 0.35 });

  return (
    <section
      ref={cardRef}
      aria-label="Experience Feedback"
      data-entered={!minimized && hasEntered || undefined}
      className={cn(
        "relative isolate mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 overflow-hidden rounded-2xl px-4",
        minimized ? "border border-border py-2" : cn(styles.card, "py-3 text-white")
      )}
    >
      {!minimized && <RequestFeedbackBackdrop sizes="(max-width: 640px) 85vw, 530px" />}

      <div className="min-w-0 flex-[1_1_10rem]">
        <h3 className="text-sm font-semibold leading-snug">
          {minimized ? "Experience Feedback" : "How was your experience?"}
        </h3>
        <p id={descriptionId} hidden={minimized} className="mt-1 text-xs leading-relaxed text-white/85">
          Help improve Registrar services in eManage.
        </p>
      </div>
      {!minimized && (
        <Button
          type="button"
          size="sm"
          onClick={onRate}
          className="ml-auto border-0 focus-visible:ring-white/80 focus-visible:ring-offset-0"
        >
          Rate Service
        </Button>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={minimized ? "Expand feedback banner" : "Minimize feedback banner"}
            aria-expanded={!minimized}
            aria-controls={descriptionId}
            onClick={onToggle}
            className={!minimized ? "text-white/85 hover:bg-white/10 hover:text-white focus-visible:ring-white/80 focus-visible:ring-offset-0" : undefined}
          >
            <ArrowDown01Icon size={14} aria-hidden="true" className={minimized ? "rotate-180" : undefined} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{minimized ? "Expand feedback banner" : "Minimize feedback banner"}</TooltipContent>
      </Tooltip>
    </section>
  );
}
