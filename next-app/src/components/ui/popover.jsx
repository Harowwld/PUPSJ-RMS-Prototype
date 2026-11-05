"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

function Popover({
  ...props
}) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  asChild,
  children,
  ...props
}) {
  if (asChild && React.isValidElement(children)) {
    return <PopoverPrimitive.Trigger data-slot="popover-trigger" render={children} {...props} />;
  }
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props}>{children}</PopoverPrimitive.Trigger>;
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  collisionPadding = 8,
  ...props
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className="isolate z-50">
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 flex w-80 origin-(--transform-origin) flex-col gap-0 rounded-2xl bg-white/92 dark:bg-zinc-900/92 backdrop-blur-2xl border border-black/[0.08] dark:border-white/10 p-0 text-xs text-popover-foreground shadow-[0_20px_48px_rgba(0,0,0,0.14),inset_0_1px_0_0_rgba(255,255,255,0.75)] dark:shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] outline-hidden duration-150 overflow-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97]",
            className
          )}
          {...props} />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

function PopoverHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="popover-header"
      className={cn(
        "flex items-center justify-between px-4.5 py-2.5 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-xs select-none",
        className
      )}
      {...props}
    />
  );
}

function PopoverBody({
  className,
  ...props
}) {
  return (
    <div
      data-slot="popover-body"
      className={cn("p-3 space-y-2", className)}
      {...props}
    />
  );
}

function PopoverFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="popover-footer"
      className={cn(
        "flex items-center justify-between px-4.5 py-2.5 border-t border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-xs text-gray-600 dark:text-zinc-400 select-none",
        className
      )}
      {...props}
    />
  );
}

function PopoverTitle({
  className,
  ...props
}) {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-xs font-semibold text-gray-900 dark:text-zinc-100 tracking-tight", className)}
      {...props} />
  );
}

function PopoverDescription({
  className,
  ...props
}) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-xs font-normal text-gray-500 dark:text-zinc-400 mt-0.5", className)}
      {...props} />
  );
}

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverTitle,
  PopoverTrigger,
}
