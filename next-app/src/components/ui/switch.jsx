"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef(({ className, checked, onCheckedChange, size = "default", ...props }, ref) => {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      checked={checked}
      onCheckedChange={onCheckedChange}
      data-slot="switch"
      data-size={size}
      className={cn(
        "group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 motion-reduce:transition-none",
        "bg-gray-200 dark:bg-zinc-700 data-[checked]:bg-emerald-600 dark:data-[checked]:bg-emerald-600",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block shrink-0 rounded-full bg-white shadow-sm ring-0 translate-x-0 transition-transform duration-150 motion-reduce:transition-none",
          size === "sm" ? "h-4 w-4 data-[checked]:translate-x-4" : "h-5 w-5 data-[checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  );
});

Switch.displayName = "Switch";

export { Switch };
