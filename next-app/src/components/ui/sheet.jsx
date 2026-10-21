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
        "fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:duration-200 motion-reduce:transition-none",
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
          "fixed z-50 flex flex-col gap-0 bg-white dark:bg-card bg-clip-padding text-sm text-popover-foreground transition-transform duration-350 ease-drawer data-ending-style:duration-200 will-change-transform motion-reduce:transition-none",
          "data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full",
          "data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-full data-[side=left]:border-r data-[side=left]:border-border dark:data-[side=left]:border-border data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full data-[side=left]:shadow-[12px_0_35px_-4px_rgba(0,0,0,0.12)]",
          "data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-full data-[side=right]:border-l data-[side=right]:border-border dark:data-[side=right]:border-border data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full data-[side=right]:shadow-[-12px_0_35px_-4px_rgba(0,0,0,0.12)] dark:data-[side=right]:shadow-[-12px_0_40px_-4px_rgba(0,0,0,0.45)]",
          "data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full",
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
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-xl bg-gray-100/90 hover:bg-gray-200/90 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/5 dark:border-white/10 shadow-2xs"
              >
                <XIcon className="w-4 h-4" />
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
      className={cn("flex flex-col gap-0.5 p-4", className)}
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
      className={cn("mt-auto flex flex-row items-center justify-end gap-2.5 p-4", className)}
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
      className={cn("font-heading text-base font-medium text-foreground", className)}
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
      className={cn("text-sm text-muted-foreground", className)}
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
