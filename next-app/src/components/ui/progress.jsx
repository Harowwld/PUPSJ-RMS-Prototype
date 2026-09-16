import * as React from "react"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-gray-100 shadow-inner",
      className
    )}
    {...props}
  >
    <div
      data-progress={`${value || 0}%`}
      className="rms-progress-transform h-full w-full flex-1 bg-pup-maroon transition-all duration-500 ease-in-out"
    />
  </div>
))
Progress.displayName = "Progress"

export { Progress }
