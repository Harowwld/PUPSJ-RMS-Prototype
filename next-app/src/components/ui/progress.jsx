import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, indicatorClassName, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="progress"
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]",
      className
    )}
    {...props}
  >
    <div
      data-slot="progress-indicator"
      data-progress={`${value || 0}%`}
      className={cn(
        "rms-progress-transform h-full w-full flex-1 rounded-full bg-pup-maroon dark:bg-red-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] transition-all duration-500 ease-in-out",
        indicatorClassName
      )}
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
