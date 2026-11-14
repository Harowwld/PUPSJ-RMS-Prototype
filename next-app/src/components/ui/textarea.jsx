import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full min-w-0 resize-y rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900 px-3 py-2 text-[13px] leading-5 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none transition-all duration-150",
        "focus:outline-none focus:border-pup-maroon dark:focus:border-red-500/80 focus:ring-1 focus:ring-pup-maroon dark:focus:ring-red-500/80 focus-visible:outline-none focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500/80",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-black/[0.02] dark:disabled:bg-white/[0.02]",
        className
      )}
      {...props}
    />
  )
})

Textarea.displayName = "Textarea"

export { Textarea }
