"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsOpen(!isOpen)
    }
    if (props.onMouseDown) props.onMouseDown(e)
  }

  const handleBlur = (e) => {
    setIsOpen(false)
    if (props.onBlur) props.onBlur(e)
  }

  const handleChange = (e) => {
    setIsOpen(false)
    if (props.onChange) props.onChange(e)
  }

  return (
    <div className="relative w-full group/select">
      <select
        ref={ref}
        className={cn(
          "appearance-none w-full bg-white transition-all",
          className,
          "pr-8"
        )}
        onMouseDown={handleMouseDown}
        onBlur={handleBlur}
        onChange={handleChange}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
        <i
          className={cn(
            "ph-bold ph-caret-down text-gray-400 text-xs transition-all duration-300",
            isOpen ? "rotate-180 text-pup-maroon dark:text-primary" : "group-focus-within/select:text-pup-maroon"
          )}
        ></i>
      </div>
    </div>
  )
})
Select.displayName = "Select"

export { Select }
