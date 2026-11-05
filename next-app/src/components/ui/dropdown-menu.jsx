"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"

import { cn } from "@/lib/utils"
import { ArrowRight01Icon as ChevronRightIcon, Tick01Icon as CheckIcon } from 'hugeicons-react'

function DropdownMenu({
  ...props
}) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}) {
  return <MenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({
  asChild,
  children,
  ...props
}) {
  if (asChild && React.isValidElement(children)) {
    return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" render={children} {...props} />;
  }
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props}>{children}</MenuPrimitive.Trigger>;
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}>
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "z-50 max-h-(--available-height) w-(--anchor-width) min-w-48 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl bg-white/92 dark:bg-zinc-900/92 backdrop-blur-2xl p-1.5 flex flex-col gap-0.5 text-popover-foreground border border-black/[0.08] dark:border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] duration-150 outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-[0.97]",
            className
          )}
          {...props} />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="dropdown-menu-header"
      className={cn(
        "flex items-center justify-between px-4.5 py-2.5 border-b-[0.5px] border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] text-[11px] font-semibold text-gray-900 dark:text-zinc-100 select-none",
        className
      )}
      {...props} />
  );
}

function DropdownMenuBody({
  className,
  ...props
}) {
  return (
    <div
      data-slot="dropdown-menu-body"
      className={cn("p-1 space-y-0.5", className)}
      {...props} />
  );
}

function DropdownMenuGroup({
  ...props
}) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-2 py-1 text-[11px] font-semibold text-muted-foreground data-inset:pl-7",
        className
      )}
      {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item relative flex min-h-[32px] cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-hidden select-none transition-colors duration-100 active:scale-[0.98]",
        "focus:bg-black/[0.05] focus:text-gray-900 data-highlighted:bg-black/[0.05] data-highlighted:text-gray-900 dark:focus:bg-white/10 dark:focus:text-zinc-50 dark:data-highlighted:bg-white/10 dark:data-highlighted:text-zinc-50",
        "data-inset:pl-8",
        "data-[variant=destructive]:text-red-600 dark:data-[variant=destructive]:text-red-400 data-[variant=destructive]:hover:text-red-600 dark:data-[variant=destructive]:hover:text-red-400 data-[variant=destructive]:focus:text-red-600 dark:data-[variant=destructive]:focus:text-red-400 data-[variant=destructive]:data-highlighted:text-red-600 dark:data-[variant=destructive]:data-highlighted:text-red-400 data-[variant=destructive]:hover:bg-red-500/10 dark:data-[variant=destructive]:hover:bg-red-500/15 data-[variant=destructive]:focus:bg-red-500/10 dark:data-[variant=destructive]:focus:bg-red-500/15 data-[variant=destructive]:data-highlighted:bg-red-500/10 dark:data-[variant=destructive]:data-highlighted:bg-red-500/15",
        "data-disabled:pointer-events-none data-disabled:opacity-40",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 [&_i]:pointer-events-none [&_i]:shrink-0 [&_svg]:text-current [&_i]:text-current data-[variant=destructive]:*:[svg]:text-red-600 dark:data-[variant=destructive]:*:[svg]:text-red-400 data-[variant=destructive]:*:[i]:text-red-600 dark:data-[variant=destructive]:*:[i]:text-red-400 data-[variant=destructive]:*:[span]:text-red-600 dark:data-[variant=destructive]:*:[span]:text-red-400 data-[variant=destructive]:hover:**:text-red-600 dark:data-[variant=destructive]:hover:**:text-red-400 data-[variant=destructive]:focus:**:text-red-600 dark:data-[variant=destructive]:focus:**:text-red-400 data-[variant=destructive]:data-highlighted:**:text-red-600 dark:data-[variant=destructive]:data-highlighted:**:text-red-400",
        className
      )}
      {...props} />
  );
}

function DropdownMenuSub({
  ...props
}) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "flex min-h-[32px] cursor-pointer items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-hidden select-none transition-colors duration-100 active:scale-[0.98]",
        "focus:bg-black/[0.05] focus:text-gray-900 data-highlighted:bg-black/[0.05] data-highlighted:text-gray-900 dark:focus:bg-white/10 dark:focus:text-zinc-50 dark:data-highlighted:bg-white/10 dark:data-highlighted:text-zinc-50",
        "data-inset:pl-8 data-popup-open:bg-black/[0.05] dark:data-popup-open:bg-white/10 data-open:bg-black/[0.05] dark:data-open:bg-white/10",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}>
      {children}
      <ChevronRightIcon size={14} className="ml-auto opacity-60" />
    </MenuPrimitive.SubmenuTrigger>
  );
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 2,
  className,
  ...props
}) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        "w-auto min-w-[140px] rounded-xl bg-white/92 dark:bg-zinc-900/92 backdrop-blur-2xl p-1.5 text-popover-foreground border border-black/[0.08] dark:border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] duration-150",
        className
      )}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props} />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  ...props
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "relative flex min-h-[32px] cursor-default items-center gap-1.5 rounded-lg py-1.25 pr-7 pl-2 text-xs font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      checked={checked}
      {...props}>
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator">
        <MenuPrimitive.CheckboxItemIndicator>
          <CheckIcon size={14} />
        </MenuPrimitive.CheckboxItemIndicator>
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}) {
  return (<MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />);
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "relative flex min-h-[32px] cursor-default items-center gap-1.5 rounded-lg py-1.25 pr-7 pl-2 text-xs font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className
      )}
      {...props}>
      <span
        className="pointer-events-none absolute right-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator">
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon size={14} />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-[0.5px] bg-black/[0.06] dark:bg-white/10", className)}
      {...props} />
  );
}

function DropdownMenuShortcut({
  className,
  ...props
}) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-[10px] font-sans font-medium tracking-widest text-muted-foreground/80 opacity-70",
        className
      )}
      {...props} />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuHeader,
  DropdownMenuBody,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
