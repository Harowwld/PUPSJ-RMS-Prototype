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
          toast: "cn-toast group/toast relative flex w-full items-start overflow-hidden p-0 cursor-pointer select-none border border-gray-200 bg-white shadow-xl dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-2xl rounded-xl",
          title: "text-[13px] font-black text-gray-900 leading-snug dark:text-zinc-50 tracking-tight group-[.success]:!text-emerald-950 dark:group-[.success]:!text-emerald-200 group-[.error]:!text-red-950 dark:group-[.error]:!text-red-200 group-[.warning]:!text-amber-950 dark:group-[.warning]:!text-amber-200",
          description: "text-[11px] font-medium !text-gray-500 leading-relaxed dark:!text-zinc-400 mt-1 group-[.success]:!text-emerald-800 dark:group-[.success]:!text-emerald-300 group-[.error]:!text-red-800 dark:group-[.error]:!text-red-300 group-[.warning]:!text-amber-800 dark:group-[.warning]:!text-amber-300",
          content: "flex-1 py-4 px-4",
          success: "!bg-[#f0fdf4] !border-[#16a34a] dark:!bg-[#022c22] dark:!border-[#047857] border-l-4 !border-l-[#15803d] dark:!border-l-[#059669] [--normal-bg:#f0fdf4] dark:[--normal-bg:#022c22] [--normal-border:#16a34a] dark:[--normal-border:#047857]",
          warning: "!bg-[#fefce8] !border-[#d97706] dark:!bg-[#451a03] dark:!border-[#b45309] border-l-4 !border-l-[#b45309] dark:!border-l-[#d97706] [--normal-bg:#fefce8] dark:[--normal-bg:#451a03] [--normal-border:#d97706] dark:[--normal-border:#b45309]",
          error: "!bg-[#fef2f2] !border-[#dc2626] dark:!bg-[#450a0a] dark:!border-[#b91c1c] border-l-4 !border-l-[#b91c1c] dark:!border-l-[#dc2626] [--normal-bg:#fef2f2] dark:[--normal-bg:#450a0a] [--normal-border:#dc2626] dark:[--normal-border:#b91c1c]",
          info: "border-l-4 border-l-blue-500",
          loading: "border-l-4 border-l-gray-400",
        },
      }}
      icons={{
        success: <i className="ph-fill ph-check-circle text-xl ml-4 mt-4 text-emerald-500" />,
        info: <i className="ph-fill ph-info text-xl ml-4 mt-4 text-blue-500" />,
        warning: <i className="ph-fill ph-warning-circle text-xl ml-4 mt-4 text-amber-500" />,
        error: <i className="ph-fill ph-warning-octagon text-xl ml-4 mt-4 text-red-600" />,
        loading: <i className="ph-bold ph-spinner animate-spin text-xl ml-4 mt-4 text-gray-400" />,
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "12px",
        "--toast-transition-duration": "500ms"
      }}
      {...props} 
    />
  );
}

export { Toaster }
