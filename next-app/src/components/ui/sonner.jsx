"use client"

import { Toaster as Sonner, toast } from "sonner";

if (typeof window !== "undefined" && !toast.__audioPatched) {
  toast.__audioPatched = true;
  
  const playTone = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      if (type === "error") {
        // High-to-low siren double synth chime (purely premium digital)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(320, now);
        gain1.gain.setValueAtTime(0.08, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.12);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(240, now + 0.10);
        gain2.gain.setValueAtTime(0.08, now + 0.10);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.10);
        osc2.stop(now + 0.25);
      } else if (type === "warning") {
        // Soft digital alert double beep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        gain1.gain.setValueAtTime(0.06, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.08);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(440, now + 0.09);
        gain2.gain.setValueAtTime(0.06, now + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.09);
        osc2.stop(now + 0.18);
      }
    } catch (e) {
      console.error("[Toast Audio] Playback failed:", e);
    }
  };

  const origError = toast.error;
  toast.error = function(...args) {
    playTone("error");
    return origError.apply(toast, args);
  };

  const origWarning = toast.warning;
  toast.warning = function(...args) {
    playTone("warning");
    return origWarning.apply(toast, args);
  };
}

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      duration={3000}
      expand={false}
      toastOptions={{
        // Force manual dismissal on click
        onClick: (t) => {
          toast.dismiss(t.id);
        },
        classNames: {
          toast: "cn-toast group/toast relative flex w-full items-start overflow-hidden p-0 cursor-pointer select-none border border-gray-200 bg-white shadow-md dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-md/50 rounded-xl",
          title: "text-[13px] font-black text-gray-900 leading-snug dark:text-zinc-50 tracking-tight",
          description: "text-[11px] font-medium !text-gray-500 leading-relaxed dark:!text-zinc-400 mt-0.5",
          content: "flex-1 py-3 px-3.5",
          success: "!bg-white dark:!bg-zinc-900 !border-gray-200 dark:!border-zinc-800 border-l-[3px] !border-l-[#16a34a] dark:!border-l-[#10b981] [--normal-bg:#ffffff] dark:[--normal-bg:#18181b] [--normal-border:#e5e7eb] dark:[--normal-border:#27272a]",
          warning: "!bg-white dark:!bg-zinc-900 !border-gray-200 dark:!border-zinc-800 border-l-[3px] !border-l-[#d97706] dark:!border-l-[#f59e0b] [--normal-bg:#ffffff] dark:[--normal-bg:#18181b] [--normal-border:#e5e7eb] dark:[--normal-border:#27272a]",
          error: "!bg-white dark:!bg-zinc-900 !border-gray-200 dark:!border-zinc-800 border-l-[3px] !border-l-[#dc2626] dark:!border-l-[#ef4444] [--normal-bg:#ffffff] dark:[--normal-bg:#18181b] [--normal-border:#e5e7eb] dark:[--normal-border:#27272a]",
          info: "border-l-[3px] border-l-blue-500",
          loading: "border-l-[3px] border-l-gray-400",
        },
      }}
      icons={{
        success: <i className="ph-fill ph-check-circle text-lg ml-3.5 mt-3.5 text-emerald-500" />,
        info: <i className="ph-fill ph-info text-lg ml-3.5 mt-3.5 text-blue-500" />,
        warning: <i className="ph-fill ph-warning-circle text-lg ml-3.5 mt-3.5 text-amber-500" />,
        error: <i className="ph-fill ph-warning-octagon text-lg ml-3.5 mt-3.5 text-red-650" />,
        loading: <i className="ph-bold ph-spinner animate-spin text-lg ml-3.5 mt-3.5 text-gray-400" />,
      }}
      style={{
        "--normal-bg": "#ffffff",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "#e5e7eb",
        "--border-radius": "12px",
        "--toast-transition-duration": "500ms"
      }}
      {...props} 
    />
  );
}

export { Toaster }
