import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  value,
  variant = "default",
  ...props
}) {
  const variantClassName = {
    default: "",
    floating: "h-[52px] rounded-none border-0 bg-transparent px-[14px] pt-4 pb-0 text-[15px] shadow-none focus-visible:border-transparent focus-visible:ring-0 dark:bg-transparent",
    verification: "h-12 text-center text-lg font-semibold tracking-widest",
  }[variant] ?? ""

  return (
    <InputPrimitive
      type={type}
      value={value !== undefined ? value : (props.defaultValue !== undefined ? undefined : "")}
      data-slot="input"
      data-variant={variant}
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-input bg-transparent px-3 py-1 text-[13px] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        variantClassName,
        className
      )}
      {...props} />
  );
}

export { Input }
