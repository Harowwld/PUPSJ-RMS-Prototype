"use client"

import { Toaster as Sonner, toast } from "sonner";

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
          toast: "cn-toast group/toast relative flex w-full items-start overflow-hidden p-0 cursor-pointer select-none border border-gray-200 bg-white shadow-xl dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-2xl rounded-2xl",
          title: "text-[13px] font-black text-gray-900 leading-snug dark:text-zinc-50 tracking-tight",
          description: "text-[11px] font-medium !text-gray-500 leading-relaxed dark:!text-zinc-400 mt-1",
          content: "flex-1 py-4 px-4",
          success: "border-l-4 border-l-emerald-500",
          warning: "border-l-4 border-l-amber-500",
          error: "border-l-4 border-l-red-600",
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
        "--border-radius": "1rem",
        "--toast-transition-duration": "500ms"
      }}
      {...props} 
    />
  );
}

export { Toaster }
