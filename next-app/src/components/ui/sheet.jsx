"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Cancel01Icon as XIcon } from 'hugeicons-react'
import { useAuthUser } from "@/components/shared/AuthGuard"
import { getRoleBranding } from "@/lib/roleBranding"

function Sheet({
  ...props
}) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  asChild,
  children,
  ...props
}) {
  if (asChild && React.isValidElement(children)) {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" render={children} {...props} />;
  }
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props}>{children}</SheetPrimitive.Trigger>;
}

function SheetClose({
  asChild,
  children,
  ...props
}) {
  if (asChild && React.isValidElement(children)) {
    return <SheetPrimitive.Close data-slot="sheet-close" render={children} {...props} />;
  }
  return <SheetPrimitive.Close data-slot="sheet-close" {...props}>{children}</SheetPrimitive.Close>;
}

function SheetPortal({
  ...props
}) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/35 backdrop-blur-sm transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-200 motion-reduce:transition-none",
        className
      )}
      {...props} />
  );
}

const SHEET_SIZE_CLASSES = {
  compact:
    "data-[side=left]:max-w-sm data-[side=right]:max-w-sm",
  default:
    "data-[side=left]:sm:max-w-lg md:data-[side=left]:max-w-xl lg:data-[side=left]:max-w-2xl data-[side=right]:sm:max-w-lg md:data-[side=right]:max-w-xl lg:data-[side=right]:max-w-2xl",
  wide:
    "data-[side=left]:sm:max-w-xl md:data-[side=left]:max-w-3xl lg:data-[side=left]:max-w-4xl xl:data-[side=left]:max-w-5xl 2xl:data-[side=left]:max-w-[62vw] data-[side=right]:sm:max-w-xl md:data-[side=right]:max-w-3xl lg:data-[side=right]:max-w-4xl xl:data-[side=right]:max-w-5xl 2xl:data-[side=right]:max-w-[62vw]",
  full:
    "data-[side=left]:max-w-none data-[side=right]:max-w-none w-screen",
};

function SheetContent({
  className,
  children,
  side = "right",
  size = "default",
  showCloseButton = true,
  style,
  ...props
}) {
  const authUser = useAuthUser?.() ?? null;
  const branding = authUser ? getRoleBranding(authUser) : null;
  const brandStyles = branding ? {
    "--brand-accent": branding.color,
    "--brand-foreground": branding.foreground,
  } : undefined;

  const sizeClasses = SHEET_SIZE_CLASSES[size] || SHEET_SIZE_CLASSES.default;

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        data-size={size}
        className={cn(
          "fixed z-50 flex flex-col gap-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl bg-clip-padding text-sm text-popover-foreground transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] data-ending-style:duration-250 will-change-transform motion-reduce:transition-none",
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:border-black/[0.08] dark:data-[side=bottom]:border-white/10 data-[side=bottom]:shadow-[0_-20px_50px_rgba(0,0,0,0.12)] dark:data-[side=bottom]:shadow-[0_-24px_60px_rgba(0,0,0,0.55)] data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full",
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-full data-[side=left]:border-r data-[side=left]:border-black/[0.08] dark:data-[side=left]:border-white/10 data-[side=left]:shadow-[20px_0_50px_rgba(0,0,0,0.12),1px_0_0_rgba(0,0,0,0.04)] dark:data-[side=left]:shadow-[24px_0_60px_rgba(0,0,0,0.55),1px_0_0_rgba(255,255,255,0.06)] data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-full data-[side=right]:border-l data-[side=right]:border-black/[0.08] dark:data-[side=right]:border-white/10 data-[side=right]:shadow-[-20px_0_50px_rgba(0,0,0,0.12),-1px_0_0_rgba(0,0,0,0.04)] dark:data-[side=right]:shadow-[-24px_0_60px_rgba(0,0,0,0.55),-1px_0_0_rgba(255,255,255,0.06)] data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:border-black/[0.08] dark:data-[side=top]:border-white/10 data-[side=top]:shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:data-[side=top]:shadow-[0_24px_60px_rgba(0,0,0,0.55)] data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full",
          sizeClasses,
          className
        )}
        style={{
          ...brandStyles,
          ...style,
        }}
        {...props}>
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <button
                type="button"
                aria-label="Close"
                className="absolute top-4 right-4 z-20 size-8 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08] shadow-2xs"
              >
                <XIcon size={16} className="w-4 h-4" />
                <span className="sr-only">Close</span>
              </button>
            }
          />
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex min-w-0 flex-col gap-1 p-5 text-left border-b border-black/[0.06] dark:border-white/10", className)}
      {...props} />
  );
}

function SheetFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-row items-center justify-between gap-2.5 p-5 border-t border-black/[0.06] dark:border-white/10", className)}
      {...props} />
  );
}

function SheetTitle({
  className,
  ...props
}) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-[17px] font-semibold tracking-[-0.015em] text-gray-900 [overflow-wrap:anywhere] dark:text-zinc-50", className)}
      {...props} />
  );
}

function SheetDescription({
  className,
  ...props
}) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("mt-1 text-[13px] font-normal leading-relaxed text-gray-500 [overflow-wrap:anywhere] dark:text-zinc-400", className)}
      {...props} />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
