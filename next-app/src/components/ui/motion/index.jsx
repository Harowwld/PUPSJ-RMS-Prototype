"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  EASE_OUT,
  CONTENT_SWAP_ENTER_TRANSITION,
  CONTENT_SWAP_EXIT_TRANSITION,
  useAppReducedMotion,
} from "@/lib/motion";

/**
 * ContentSwap
 * Smooth view/tab content swapper.
 * Conforms to beUI / Apple HIG "Content swap" recipe:
 * - Old content leaves faster than new content arrives
 * - Travel is kept to a few pixels (y: 4px)
 * - Degrades to pure opacity on reduced motion (y: 0)
 */
export function ContentSwap({ children, className, id, style, ...props }) {
  const shouldReduceMotion = useAppReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={id}
        initial={{
          opacity: 0,
          y: shouldReduceMotion ? 0 : 4,
        }}
        animate={{
          opacity: 1,
          y: 0,
          transition: shouldReduceMotion
            ? { duration: 0.05 }
            : CONTENT_SWAP_ENTER_TRANSITION,
        }}
        exit={{
          opacity: 0,
          y: shouldReduceMotion ? 0 : -4,
          transition: shouldReduceMotion
            ? { duration: 0.04 }
            : CONTENT_SWAP_EXIT_TRANSITION,
        }}
        className={className}
        style={{
          willChange: shouldReduceMotion ? undefined : "opacity, transform",
          ...style,
        }}
        suppressHydrationWarning
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * ContentReveal
 * Conforms to beUI "Content reveal" recipe:
 * - Short lift (y: 6px) and restrained blur (4px)
 * - Finishes quickly (0.2s) before the surface becomes the focus
 */
export function ContentReveal({
  children,
  className,
  delay = 0,
  duration = 0.2,
  ...props
}) {
  const shouldReduceMotion = useAppReducedMotion();

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: shouldReduceMotion ? 0 : 6,
        filter: shouldReduceMotion ? "none" : "blur(4px)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
          duration: shouldReduceMotion ? 0.1 : duration,
          delay: shouldReduceMotion ? 0 : delay,
          ease: EASE_OUT,
        },
      }}
      className={className}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * PageTransition
 * Top-level page entrance, kept under the 300ms interface ceiling (0.22s).
 */
export function PageTransition({ children, className, ...props }) {
  const shouldReduceMotion = useAppReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8 }}
      transition={{
        duration: shouldReduceMotion ? 0.1 : 0.22,
        ease: EASE_OUT,
      }}
      className={className}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * FadeIn
 * Restrained opacity entrance (0.2s default).
 */
export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.2,
  ...props
}) {
  const shouldReduceMotion = useAppReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: shouldReduceMotion ? 0.1 : duration,
        delay: shouldReduceMotion ? 0 : delay,
        ease: EASE_OUT,
      }}
      className={className}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * SlideUp
 * Micro-elevation reveal (8px default travel instead of large jumps).
 */
export function SlideUp({
  children,
  className,
  delay = 0,
  duration = 0.22,
  yOffset = 8,
  ...props
}) {
  const shouldReduceMotion = useAppReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : yOffset }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.1 : duration,
        delay: shouldReduceMotion ? 0 : delay,
        ease: EASE_OUT,
      }}
      className={className}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer & StaggerItem
 * Progressive item reveal for lists and cards.
 */
export function StaggerContainer({
  children,
  className,
  delayChildren = 0,
  staggerChildren = 0.04,
  ...props
}) {
  const shouldReduceMotion = useAppReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        delayChildren: shouldReduceMotion ? 0 : delayChildren,
        staggerChildren: shouldReduceMotion ? 0 : staggerChildren,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={className}
      suppressHydrationWarning
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  duration = 0.2,
  ...props
}) {
  const shouldReduceMotion = useAppReducedMotion();

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 6,
    },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.1 : duration,
        ease: EASE_OUT,
      },
    },
  };

  return (
    <motion.div variants={itemVariants} className={className} suppressHydrationWarning {...props}>
      {children}
    </motion.div>
  );
}
