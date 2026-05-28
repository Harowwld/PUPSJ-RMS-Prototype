"use client"

import { Toaster as Sonner, toast } from "sonner";
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

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
          toast: "cn-toast group/toast relative flex w-full items-center overflow-hidden p-0 cursor-pointer select-none border border-gray-200 bg-white shadow-md dark:bg-zinc-900 dark:border-zinc-800 dark:shadow-none transition-all duration-500 ease-in-out data-[mounted=true]:animate-in data-[mounted=true]:fade-in data-[mounted=true]:zoom-in data-[removed=true]:animate-out data-[removed=true]:fade-out data-[removed=true]:zoom-out",
          title: "text-[13px] font-bold text-gray-900 leading-tight dark:text-zinc-50",
          description: "text-[11px] !text-gray-600 leading-tight dark:!text-zinc-400",
          content: "flex-1 py-2.5 px-3",
          success: "dark:!border-emerald-500/20",
          warning: "dark:!border-amber-500/20",
          error: "dark:!border-red-500/20",
          info: "dark:!border-blue-500/20",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-3.5 ml-3 text-emerald-500 dark:text-emerald-400/80" />,
        info: <InfoIcon className="size-3.5 ml-3 text-blue-500 dark:text-blue-400/80" />,
        warning: <TriangleAlertIcon className="size-3.5 ml-3 text-amber-500 dark:text-amber-400/80" />,
        error: <OctagonXIcon className="size-3.5 ml-3 text-red-500 dark:text-red-400/80" />,
        loading: <Loader2Icon className="size-3.5 ml-3 animate-spin text-gray-500 dark:text-zinc-400" />,
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius)",
        "--toast-transition-duration": "500ms"
      }}
      {...props} 
    />
  );
}

export { Toaster }
