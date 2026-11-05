"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef(({
  className,
  thumbClassName,
  checked,
  onCheckedChange,
  size = "default",
  variant = "apple",
  ...props
}, ref) => {
  const isSm = size === "sm";

  const variantStyles = {
    apple: "data-[checked]:bg-[#34C759] dark:data-[checked]:bg-[#30D158] focus-visible:ring-[#34C759]/40 dark:focus-visible:ring-[#30D158]/40",
    brand: "data-[checked]:bg-pup-maroon dark:data-[checked]:bg-red-600 focus-visible:ring-pup-maroon/40 dark:focus-visible:ring-red-500/40",
    emerald: "data-[checked]:bg-emerald-600 dark:data-[checked]:bg-emerald-600 focus-visible:ring-emerald-500/40",
  }[variant] || "data-[checked]:bg-[#34C759] dark:data-[checked]:bg-[#30D158]";

  return (
    <SwitchPrimitive.Root
      ref={ref}
      checked={checked}
      onCheckedChange={onCheckedChange}
      data-slot="switch"
      data-size={size}
      className={cn(
        "group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 outline-none select-none",
        "border border-black/[0.06] dark:border-white/[0.08]",
        "bg-[#E9E9EA] dark:bg-[#39393D]",
        "shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]",
        "transition-all duration-200 ease-out active:scale-[0.96]",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45 motion-reduce:transition-none motion-reduce:active:scale-100",
        isSm ? "h-5 w-9" : "h-6 w-11",
        variantStyles,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block shrink-0 rounded-full bg-white dark:bg-white select-none",
          "border border-black/[0.04] dark:border-black/[0.06]",
          "shadow-[inset_0_1px_0.5px_rgba(255,255,255,0.9),0_2px_4px_rgba(0,0,0,0.18),0_1px_1px_rgba(0,0,0,0.1),0_3px_8px_rgba(0,0,0,0.12)]",
          "translate-x-0 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
          isSm
            ? "size-4 data-[checked]:translate-x-4"
            : "size-5 data-[checked]:translate-x-5",
          thumbClassName
        )}
      />
    </SwitchPrimitive.Root>
  );
});

Switch.displayName = "Switch";

export { Switch };
