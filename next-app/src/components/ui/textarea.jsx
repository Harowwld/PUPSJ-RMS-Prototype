import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full min-w-0 resize-y rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-3 py-2 text-[13px] leading-5 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] outline-none transition-all duration-150",
        "focus-visible:outline-none focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 focus-visible:ring-3 focus-visible:ring-pup-maroon/20 dark:focus-visible:ring-red-500/25",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-black/[0.02] dark:disabled:bg-white/[0.02]",
        "aria-invalid:border-rose-500 aria-invalid:ring-3 aria-invalid:ring-rose-500/20 dark:aria-invalid:border-rose-400 dark:aria-invalid:ring-rose-400/30",
        className
      )}
      {...props}
    />
  )
})

Textarea.displayName = "Textarea"

export { Textarea }
