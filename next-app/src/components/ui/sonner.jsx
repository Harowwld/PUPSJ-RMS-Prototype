"use client"


import { toast as hotToast, useToaster } from "react-hot-toast";
import { toast as sonnerToast } from "sonner";
import React, { useEffect } from "react";
import { Alert02Icon, Cancel01Icon, CovidInfoIcon, Loading01Icon, Tick01Icon } from "hugeicons-react";
import { playSoundCue } from "@/lib/soundPatch";

const TOAST_ICON_COLORS = {
  default: "bg-zinc-600",
  success: "bg-emerald-700",
  error: "bg-red-600",
  warning: "bg-amber-700",
  info: "bg-blue-600",
  loading: "bg-zinc-600",
};

// 1. Play Tone logic (synthesized Kobra outcome cues governed by user Sound preferences)
const PORTAL_SOUND_PREFIXES = ["/admin", "/staff", "/systemadmin", "/student", "/account"];

const playTone = (type) => {
  try {
    if (typeof window === "undefined") return;
    const pathname = window.location?.pathname || "";
    const inPortal = PORTAL_SOUND_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (!inPortal) return;

    if (type === "error" || type === "warning" || type === "success") {
      playSoundCue({ sound: type });
    }
  } catch (e) {
    console.error("[Toast Audio] Playback failed:", e);
  }
};

// Helper to recursively extract plain text from React nodes, strings, objects, etc.
const extractText = (node) => {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "boolean") return String(node);
  if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join(" ");
  if (React.isValidElement(node)) return extractText(node.props?.children);
  if (typeof node === "object") {
    if (typeof node.message === "string") return node.message;
    if (typeof node.description === "string") return node.description;
    if (typeof node.title === "string") return node.title;
  }
  return "";
};

// Helper to render technical identifiers (filenames, archive packages, UUIDs, hashes, paths)
// with native <wbr /> line-break opportunities after hyphens, underscores, dots, and slashes.
// This prevents browser layout engines from treating hyphens followed by digits (e.g. -2026-11-07)
// as unbreakable negative numbers under Unicode UAX #14, which otherwise leaves large empty voids
// on the preceding line.
const renderBreakableText = (content) => {
  if (typeof content !== "string" && typeof content !== "number") return content;
  const text = String(content);
  if (!text || text.length <= 12 || !/[-_./]/.test(text)) return text;

  // Split on whitespace while preserving whitespace tokens
  const tokens = text.split(/(\s+)/);
  let keyIdx = 0;

  return tokens.map((token, i) => {
    // If it's whitespace or short token without technical delimiters, return as-is
    if (i % 2 === 1 || token.length <= 12 || !/[-_./]/.test(token)) {
      return token;
    }

    // For long technical tokens, insert <wbr /> break opportunities after delimiters
    const parts = token.split(/([-_./])/g);
    return (
      <React.Fragment key={`wbr-tok-${keyIdx++}`}>
        {parts.map((part, pIdx) => {
          if (pIdx % 2 === 1) {
            return (
              <React.Fragment key={`p-${pIdx}`}>
                {part}
                <wbr />
              </React.Fragment>
            );
          }
          return part;
        })}
      </React.Fragment>
    );
  });
};

// 2. Custom Hot Toast trigger implementing Apple's 5 Dynamic Stages
const triggerCustomToast = (message, options = {}, type = "default") => {
  const safeOptions = (options && typeof options === "object") ? options : {};
  let titleContent = message;
  let descContent = safeOptions.description || "";

  // If message is an object with title/description or an Error (and not a React element)
  if (message && typeof message === "object" && !React.isValidElement(message)) {
    if (message instanceof Error) {
      titleContent = message.message || "An unexpected error occurred";
    } else if ("title" in message || "description" in message) {
      titleContent = message.title || "";
      if (!descContent && message.description) {
        descContent = message.description;
      }
    }
  }

  const rawTitleText = extractText(titleContent);
  const rawDescText = extractText(descContent);
  const lowerTitle = `${rawTitleText} ${rawDescText}`.toLowerCase();
  
  // Play Tone if Success, Warning, or Error
  if (type === "error" || lowerTitle.includes("fail") || lowerTitle.includes("error")) {
    playTone("error");
  } else if (type === "warning" || lowerTitle.includes("warning")) {
    playTone("warning");
  } else if (type === "success") {
    playTone("success");
  }

  // Determine Stage
  let stage = 1;
  const hasAction = !!safeOptions.action;
  const isDismissable = 
    type === "error" || 
    type === "warning" || 
    safeOptions.duration === Infinity || 
    lowerTitle.includes("fail") || 
    lowerTitle.includes("error") || 
    lowerTitle.includes("warning");
  const matchesStage2 = 
    lowerTitle.includes("layout saved") || 
    lowerTitle.includes("approved") || 
    lowerTitle.includes("added") || 
    lowerTitle.includes("registered") || 
    lowerTitle.includes("created") || 
    lowerTitle.includes("restored") || 
    lowerTitle.includes("complete") || 
    lowerTitle.includes("generated") || 
    lowerTitle.includes("uploaded") ||
    lowerTitle.includes("finalized") ||
    lowerTitle.includes("success") ||
    lowerTitle.includes("successful") ||
    lowerTitle.includes("deleted") ||
    lowerTitle.includes("archived") ||
    lowerTitle.includes("removed") ||
    lowerTitle.includes("download") ||
    lowerTitle.includes("downloaded") ||
    lowerTitle.includes("initiated") ||
    lowerTitle.includes("reset") ||
    lowerTitle.includes("cleared") ||
    lowerTitle.includes("clear") ||
    lowerTitle.includes("changed") ||
    lowerTitle.includes("updated") ||
    lowerTitle.includes("saved");

  if (isDismissable) {
    stage = 3;
  } else if (hasAction) {
    const needsIcon = 
      matchesStage2 ||
      lowerTitle.includes("returned") || 
      lowerTitle.includes("ready") || 
      lowerTitle.includes("export") || 
      type === "info" ||
      type === "loading";
    stage = needsIcon ? 5 : 4;
  } else {
    stage = (matchesStage2 || !!descContent || type === "success" || type === "info" || type === "loading") ? 2 : 1;
  }

// Helper subcomponent for individual Apple fluid toast with physical spring motion and swipe-to-dismiss
const ToastItem = ({
  t,
  type,
  stage,
  titleContent,
  descContent,
  safeOptions,
  lowerTitle,
  isDismissable,
}) => {
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(null);
  const isDraggingRef = React.useRef(false);

  const handlePointerDown = (e) => {
    // Prevent drag if touching an interactive button or link
    if (e.target.closest("button") || e.target.closest("a")) return;
    dragStartY.current = e.clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta < 0) {
      // Direct 1:1 manipulation upward
      setDragOffset(delta);
    } else {
      // Apple rubber-band resistance when pulling downward
      setDragOffset(delta * 0.22);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    // Apple swipe-up dismissal threshold (flick or swipe up > 22px)
    if (dragOffset < -22) {
      hotToast.dismiss(t.id);
    } else {
      // Spring snap-back to rest
      setDragOffset(0);
    }
    dragStartY.current = null;
  };

  // Legacy plain messages can also signal errors or warnings.
  const variant = type === "default"
    ? /fail|error/.test(lowerTitle)
      ? "error"
      : lowerTitle.includes("warning") ? "warning" : "default"
    : type;

  // Apple spring fluid entry (360ms with subtle overshoot) & swift upward retraction exit (200ms)
  const animationClass = t.visible 
    ? "animate-[apple-toast-slide-down_360ms_cubic-bezier(0.16,1,0.3,1)_forwards]" 
    : "animate-[apple-toast-slide-up_200ms_cubic-bezier(0.4,0,0.2,1)_forwards]";

  return (
    <div 
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: dragOffset !== 0 ? `translate3d(0, ${dragOffset}px, 0)` : undefined,
        transition: isDragging ? "none" : "transform 260ms cubic-bezier(0.16, 1, 0.3, 1)",
        touchAction: "none",
      }}
      data-has-description={Boolean(descContent)}
      className={`rms-toast cursor-grab active:cursor-grabbing select-none active:scale-[0.98] transition-transform duration-100 ease-out ${animationClass}`}
    >
      {/* Left Icon (Stage 2, 3, 5) */}
      {(stage === 2 || stage === 3 || stage === 5) && (
        <div className={`size-5 rounded-full flex items-center justify-center shrink-0 text-white border-none transition-transform duration-200 active:scale-95 ${
          TOAST_ICON_COLORS[variant]
        }`} aria-hidden="true">
          {variant === "error" || variant === "warning" ? (
            <Alert02Icon size="1em" className="text-[11px] text-white" />
          ) : type === "info" ? (
            <CovidInfoIcon size="1em" className="text-[11px] text-white" />
          ) : type === "loading" ? (
            <Loading01Icon size="1em" className="animate-spin text-[11px] text-white" />
          ) : (
            <Tick01Icon size="1em" className="text-[11px] text-white" />
          )}
        </div>
      )}
      
      {/* Text Block */}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        {React.isValidElement(titleContent) ? (
          titleContent
        ) : (
          <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] leading-5">
            {renderBreakableText(titleContent)}
          </span>
        )}
        {descContent && (
          typeof descContent === "string" || typeof descContent === "number" ? (
            <span className="text-[13px] font-normal text-gray-600 dark:text-zinc-400 mt-0.5 leading-5">
              {renderBreakableText(descContent)}
            </span>
          ) : (
            descContent
          )
        )}
      </div>
      
      {/* Action Button (Stage 4, 5, or any toast with safeOptions.action) */}
      {safeOptions.action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            safeOptions.action.onClick?.(e);
            hotToast.dismiss(t.id);
          }}
          className="self-center rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-95 py-1 px-3 text-[12px] font-semibold cursor-pointer shrink-0 border-none outline-none transition-all ml-auto"
        >
          <span className={
            String(safeOptions.action.label || "").toLowerCase() === "undo"
              ? "text-[#16a34a] dark:text-emerald-400"
              : (safeOptions.action.destructive || lowerTitle.includes("returned"))
                ? "text-[#e30000] dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
          }>
            {safeOptions.action.label}
          </span>
        </button>
      )}

      {/* Dismiss Button (Stage 3 or any dismissable toast) */}
      {(stage === 3 || isDismissable) && (
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hotToast.dismiss(t.id);
          }}
          className="self-center h-7 w-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 flex items-center justify-center cursor-pointer shrink-0 ml-auto border-none outline-none transition-all"
          aria-label="Dismiss notification"
        >
          <Cancel01Icon size="1em" className="text-gray-500 dark:text-zinc-400 text-xs" />
        </button>
      )}
    </div>
  );
};

  const duration = safeOptions.duration !== undefined
    ? safeOptions.duration
    : type === "loading"
      ? Infinity
      : isDismissable
        ? 6000
        : 3000;

  return hotToast.custom(
    (t) => (
      <ToastItem
        t={t}
        type={type}
        stage={stage}
        titleContent={titleContent}
        descContent={descContent}
        safeOptions={safeOptions}
        lowerTitle={lowerTitle}
        isDismissable={isDismissable}
      />
    ),
    {
      id: safeOptions.id,
      duration: duration,
      position: 'top-center',
    }
  );
};

// 3. Re-exportable custom toast interface with full callable support
const toastFn = (msg, opts) => triggerCustomToast(msg, opts, "default");
toastFn.success = (msg, opts) => triggerCustomToast(msg, opts, "success");
toastFn.error = (msg, opts) => triggerCustomToast(msg, opts, "error");
toastFn.warning = (msg, opts) => triggerCustomToast(msg, opts, "warning");
toastFn.info = (msg, opts) => triggerCustomToast(msg, opts, "info");
toastFn.loading = (msg, opts) => triggerCustomToast(msg, opts, "loading");
toastFn.message = (msg, opts) => triggerCustomToast(msg, opts, "default");
toastFn.dismiss = (id) => hotToast.dismiss(id);
toastFn.promise = (promise, msgs = {}, opts = {}) => {
  const loadingMsg = typeof msgs.loading === "function" ? msgs.loading() : msgs.loading;
  const id = loadingMsg ? triggerCustomToast(loadingMsg, opts, "loading") : undefined;
  return promise
    .then((res) => {
      if (id) hotToast.dismiss(id);
      const successMsg = typeof msgs.success === "function" ? msgs.success(res) : msgs.success;
      if (successMsg) triggerCustomToast(successMsg, opts, "success");
      return res;
    })
    .catch((err) => {
      if (id) hotToast.dismiss(id);
      const errorMsg = typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
      if (errorMsg) triggerCustomToast(errorMsg, opts, "error");
      throw err;
    });
};
toastFn.custom = (jsx, opts) => hotToast.custom(jsx, opts);

export const toast = toastFn;

// 4. Monkey patch the 'sonner' package exports directly so direct imports keep working
try {
  if (sonnerToast) {
    sonnerToast.success = toastFn.success;
    sonnerToast.error = toastFn.error;
    sonnerToast.warning = toastFn.warning;
    sonnerToast.info = toastFn.info;
    sonnerToast.loading = toastFn.loading;
    sonnerToast.message = toastFn.message;
    sonnerToast.dismiss = toastFn.dismiss;
    sonnerToast.promise = toastFn.promise;
    sonnerToast.custom = toastFn.custom;
  }
} catch (e) {
  console.warn("Could not patch sonner toast exports:", e);
}

function ToastStackItem({ toastId, updateHeight, style, children }) {
  const ref = React.useRef(null);

  useEffect(() => {
    const element = ref.current;
    const measure = () => updateHeight(toastId, element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [toastId, updateHeight]);

  return (
    <div
      ref={ref}
      className="absolute top-0 transition-all duration-380 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={style}
    >
      {children}
    </div>
  );
}

// 5. Custom Toaster renderer
const Toaster = () => {
  const { toasts, handlers } = useToaster({ duration: 3000, position: "top-center" });
  const [expanded, setExpanded] = React.useState(false);
  
  const visibleToasts = toasts.filter((t) => t.visible);
  const expandedHeight = visibleToasts.reduce((height, toast) => height + (toast.height ?? 40) + 8, 0);

  useEffect(() => {
    // Limit to 3 active visible toasts
    const active = toasts.filter((t) => t.visible);
    if (active.length > 3) {
      // Dismiss the oldest one (at the end of the array)
      hotToast.dismiss(active[active.length - 1].id);
    }
  }, [toasts]);

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col items-center pointer-events-none"
      onMouseEnter={() => { handlers.startPause(); setExpanded(true); }}
      onMouseLeave={() => { handlers.endPause(); setExpanded(false); }}
      aria-live="polite"
    >
      {/* Invisible hover bridge to prevent jitter when moving mouse between expanded toasts */}
      {expanded && visibleToasts.length > 1 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[620px] max-w-[calc(100vw-32px)] pointer-events-auto bg-transparent z-0" style={{ height: expandedHeight }} />
      )}
      {toasts.map((toastItem) => {
        const stackIndex = visibleToasts.findIndex(t => t.id === toastItem.id);
        const isVisible = toastItem.visible;
        
        // react-hot-toast puts newest toasts at index 0 for top-* positions.
        const effIndex = stackIndex === -1 ? 0 : stackIndex;

        const scale = isVisible ? (expanded ? 1 : Math.max(0.86, 1 - effIndex * 0.06)) : 0.90;
        const expandedOffset = visibleToasts
          .slice(0, effIndex)
          .reduce((offset, toast) => offset + (toast.height ?? 40) + 8, 0);
        const frontHeight = visibleToasts[0]?.height ?? 40;
        const itemHeight = toastItem.height ?? 40;
        const stackedOffset = effIndex === 0
          ? 0
          : Math.max(effIndex * 10, frontHeight - itemHeight * scale + effIndex * 10);
        const translateY = isVisible ? (expanded ? expandedOffset : stackedOffset) : -24;
        const opacity = isVisible ? (effIndex >= 3 && !expanded ? 0 : (expanded ? 1 : Math.max(0.70, 1 - effIndex * 0.14))) : 0;
        const zIndex = 100 - effIndex;
        const filter = isVisible && !expanded && effIndex > 0
          ? `brightness(${Math.max(0.85, 1 - effIndex * 0.05)})`
          : "none";

        const rawMsg = typeof toastItem.message === "string" ? toastItem.message : String(toastItem.message || "");

        const content = typeof toastItem.message === "function"
          ? toastItem.message(toastItem)
          : (
            <div className="rms-toast active:scale-[0.98] transition-transform duration-100 ease-out animate-[apple-toast-slide-down_360ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
              <div className="flex flex-col justify-center min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em] leading-5">
                  {renderBreakableText(rawMsg)}
                </span>
              </div>
            </div>
          );

        return (
          <ToastStackItem
            key={toastItem.id}
            toastId={toastItem.id}
            updateHeight={handlers.updateHeight}
            style={{
              opacity: opacity,
              transform: `translate3d(0, ${translateY}px, 0) scale(${scale})`,
              transformOrigin: "top center",
              filter: filter,
              zIndex: zIndex,
              pointerEvents: isVisible ? "auto" : "none"
            }}
          >
            {content}
          </ToastStackItem>
        );
      })}
    </div>
  );
};

export { Toaster };
