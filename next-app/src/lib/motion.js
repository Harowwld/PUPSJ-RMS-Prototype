/**
 * Motion & Physics Tokens
 * Conforming to Apple Human Interface Guidelines and beUI Motion Patterns.
 * Source guidance: https://beui.dev/docs/motion-patterns
 */

// Easing curves
export const EASE_OUT = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT = [0.77, 0, 0.175, 1];
export const EASE_DRAWER = [0.32, 0.72, 0, 1];
export const EASE_APPLE_SPRING = [0.16, 1, 0.3, 1];
export const EASE_APPLE_EXIT = [0.4, 0, 0.2, 1];

// Spring physics configurations
// SPRING_TOAST: Apple notification banner spring for drop-and-settle entrance (damping ~0.82, response ~0.36s)
export const SPRING_TOAST = {
  type: "spring",
  stiffness: 380,
  damping: 28,
  mass: 0.8,
};

// Spring physics configurations
// SPRING_PRESS: Fast, weighted feedback for pressable surfaces (100–160ms range)
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.5,
};

// SPRING_LAYOUT: Shared surfaces, active indicators, and tabs preserving spatial continuity
export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.8,
};

// SIDEBAR_MORPH_TRANSITION: Critically damped desktop rail expansion/collapse
export const SIDEBAR_MORPH_TRANSITION = {
  type: "spring",
  stiffness: 380,
  damping: 35,
  mass: 0.75,
};

// Transition timing tokens
export const LABEL_ENTER_TRANSITION = {
  duration: 0.2,
  delay: 0.08,
  ease: EASE_OUT,
};

export const LABEL_EXIT_TRANSITION = {
  duration: 0.12,
  ease: EASE_OUT,
};

export const CONTENT_SWAP_ENTER_TRANSITION = {
  duration: 0.15,
  ease: EASE_OUT,
};

export const CONTENT_SWAP_EXIT_TRANSITION = {
  duration: 0.06,
  ease: EASE_OUT,
};

// Re-export accessibility motion hook
export { useAppReducedMotion } from "./accessibility.js";
