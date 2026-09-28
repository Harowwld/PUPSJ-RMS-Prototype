"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva } from "class-variance-authority";
import React from "react";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-brand border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap cursor-pointer transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#232e3b] text-white hover:bg-[#1a222c] rounded-full",
        outline:
          "border-[#232e3b]/40 bg-transparent text-[#232e3b] hover:bg-[#232e3b]/10 hover:text-[#232e3b] aria-expanded:bg-[#232e3b]/10 aria-expanded:text-[#232e3b] dark:border-white/50 dark:bg-transparent dark:hover:bg-white/20 dark:text-white dark:hover:text-white rounded-full",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-[#0A84FF] hover:bg-[#0A84FF]/10 aria-expanded:bg-[#0A84FF]/10 dark:text-[#0A84FF] dark:hover:bg-[#0A84FF]/20 dark:aria-expanded:bg-[#0A84FF]/20",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-[#0A84FF] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-brand px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-brand px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 text-base",
        icon: "size-10",
        "icon-xs":
          "size-7 rounded-brand in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-brand in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  asChild,
  children,
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  if (asChild && React.isValidElement(children)) {
    const isNativeButton = children.type === 'button';
    return (
      <ButtonPrimitive
        data-slot="button"
        render={children}
        nativeButton={isNativeButton}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props} />
    );
  }
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}>
      {children}
    </ButtonPrimitive>
  );
}

export { Button, buttonVariants }
