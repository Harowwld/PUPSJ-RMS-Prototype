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
        "h-10 w-full min-w-0 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-900 px-3 py-1 text-[13px] text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none transition-all duration-150",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "focus:outline-none focus:border-pup-maroon dark:focus:border-red-500/80 focus:ring-1 focus:ring-pup-maroon dark:focus:ring-red-500/80 focus-visible:outline-none focus-visible:border-pup-maroon dark:focus-visible:border-red-500/80 focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500/80",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-black/[0.02] dark:disabled:bg-white/[0.02]",
        "aria-invalid:border-rose-500 aria-invalid:ring-1 aria-invalid:ring-rose-500 dark:aria-invalid:border-rose-400 dark:aria-invalid:ring-rose-400",
        variantClassName,
        className
      )}
      {...props}
    />
  );
}

export { Input }
