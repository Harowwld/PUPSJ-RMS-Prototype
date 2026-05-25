"use client"

import { Toaster as Sonner, toast } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      duration={2000}
      toastOptions={{
        // Force manual dismissal on click
        onClick: (t) => {
          toast.dismiss(t.id);
        },
        classNames: {
          toast: "cn-toast group/toast relative flex w-full items-center overflow-hidden p-0 cursor-pointer select-none border border-gray-200 bg-white shadow-md",
          title: "text-[13px] font-bold text-gray-900 leading-tight",
          description: "text-[11px] text-gray-500 opacity-90 leading-tight",
          content: "flex-1 py-2.5 px-3",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-3.5 ml-3 text-emerald-500" />,
        info: <InfoIcon className="size-3.5 ml-3 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-3.5 ml-3 text-amber-500" />,
        error: <OctagonXIcon className="size-3.5 ml-3 text-red-500" />,
        loading: <Loader2Icon className="size-3.5 ml-3 animate-spin text-gray-500" />,
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)"
      }}
      {...props} 
    />
  );
}

export { Toaster }
