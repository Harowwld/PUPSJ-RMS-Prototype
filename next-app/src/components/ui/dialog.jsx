"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Cancel01Icon as XIcon } from 'hugeicons-react'
import { useAuthUser } from "@/components/shared/AuthGuard"
import { getRoleBranding } from "@/lib/roleBranding"

function Dialog({
  ...props
}) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  asChild,
  children,
  ...props
}) {
  if (asChild && React.isValidElement(children)) {
    return <DialogPrimitive.Trigger data-slot="dialog-trigger" render={children} {...props} />;
  }
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props}>{children}</DialogPrimitive.Trigger>;
}

function DialogPortal({
  ...props
}) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  asChild,
  children,
  ...props
}) {
  if (asChild && React.isValidElement(children)) {
    return <DialogPrimitive.Close data-slot="dialog-close" render={children} {...props} />;
  }
  return <DialogPrimitive.Close data-slot="dialog-close" {...props}>{children}</DialogPrimitive.Close>;
}

function DialogOverlay({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-[70] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
        className
      )}
      {...props} />
  );
}

function DialogContent({
  className,
  children,
  hideClose = false,
  style,
  ...props
}) {
  const authUser = useAuthUser?.() ?? null;
  const branding = authUser ? getRoleBranding(authUser) : null;
  const brandStyles = branding ? {
    "--brand-accent": branding.color,
    "--brand-foreground": branding.foreground,
  } : undefined;

  return (
    <DialogPortal>
      <DialogOverlay />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "pointer-events-auto relative grid w-full max-w-full gap-3.5 rounded-[22px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl p-5 text-sm text-popover-foreground border border-black/[0.08] dark:border-white/10 shadow-[0_24px_54px_rgba(0,0,0,0.18),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_28px_64px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.12)] duration-200 ease-out outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.96] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.96] motion-reduce:animate-none",
            className
          )}
          style={{
            ...brandStyles,
            ...style,
          }}
          {...props}>
          {children}
          {!hideClose && (
            <DialogPrimitive.Close
              className="absolute top-3.5 right-3.5 z-20 size-7 rounded-full bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.08]"
              aria-label="Close"
            >
              <XIcon size={14} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex min-w-0 flex-col gap-0 text-left", className)}
      {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex min-w-0 flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:items-center",
        className
      )}
      {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-[17px] font-bold tracking-tight text-gray-900 [overflow-wrap:anywhere] dark:text-zinc-50 leading-snug", className)}
      {...props} />
  );
}

function DialogDescription({
  className,
  ...props
}) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "mt-1.5 text-[13px] font-normal text-gray-500 [overflow-wrap:anywhere] dark:text-zinc-400 leading-relaxed *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
