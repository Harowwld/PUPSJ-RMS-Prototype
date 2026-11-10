"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useAppReducedMotion, SPRING_LAYOUT } from "@/lib/motion";

const TabsContext = React.createContext({
  variant: "default",
  size: "default",
  listId: "default",
  orientation: "horizontal",
});

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      orientation={orientation}
      className={cn(
        "flex gap-2",
        orientation === "horizontal" ? "flex-col" : "flex-row",
        className
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "inline-flex w-fit items-center justify-center p-1 select-none transition-all duration-150 data-[orientation=vertical]:flex-col relative",
  {
    variants: {
      variant: {
        default:
          "rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] backdrop-blur-md text-gray-500 dark:text-zinc-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
        segmented:
          "inline-grid grid-flow-col auto-cols-fr rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] backdrop-blur-md text-gray-500 dark:text-zinc-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
        capsule:
          "inline-grid grid-flow-col auto-cols-fr rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] backdrop-blur-md text-gray-500 dark:text-zinc-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
        line:
          "rounded-xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] backdrop-blur-md text-gray-500 dark:text-zinc-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]",
        pills: "gap-1.5 bg-transparent p-0",
      },
      size: {
        default: "gap-1",
        sm: "gap-0.5 p-0.5 text-xs",
        lg: "gap-1.5 p-1.5 text-sm",
        capsule: "gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function TabsList({
  className,
  variant = "default",
  size = "default",
  orientation: orientationProp,
  id: idProp,
  ...props
}) {
  const generatedId = React.useId();
  const listId = idProp || generatedId;
  const orientation =
    orientationProp || (className?.includes("flex-col") ? "vertical" : "horizontal");

  return (
    <TabsContext.Provider value={{ variant, size, listId, orientation }}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        data-orientation={orientation}
        className={cn(tabsListVariants({ variant, size }), className)}
        {...props}
      />
    </TabsContext.Provider>
  );
}

const tabsTriggerVariants = cva(
  [
    "relative inline-flex flex-1 items-center justify-center gap-1.5 border border-transparent whitespace-nowrap select-none",
    "font-semibold tracking-[-0.01em] transition-all duration-150 cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/30 dark:focus-visible:ring-red-500/40",
    "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
    "active:scale-[0.98]",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    "data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start",
    "text-gray-900 dark:text-zinc-100",
  ],
  {
    variants: {
      size: {
        default: "h-8 px-3.5 py-1 text-xs sm:text-[13px] rounded-[9px]",
        sm: "h-7 px-2.5 py-0.5 text-xs rounded-md",
        lg: "h-9 px-4 py-1.5 text-sm rounded-lg",
        capsule: "h-7 px-3.5 text-xs rounded-full",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

function TabsTrigger({
  asChild,
  children,
  className,
  size: sizeProp,
  pillClassName,
  ...props
}) {
  const context = React.useContext(TabsContext);
  const resolvedSize = sizeProp || (context.variant === "capsule" ? "capsule" : context.size);
  const shouldReduceMotion = useAppReducedMotion();

  const sharedClassName = cn(
    tabsTriggerVariants({ size: resolvedSize }),
    className
  );

  if (asChild && React.isValidElement(children)) {
    return (
      <TabsPrimitive.Tab
        data-slot="tabs-trigger"
        render={children}
        className={sharedClassName}
        {...props}
      />
    );
  }

  const isCapsule = context.variant === "capsule" || resolvedSize === "capsule";
  const layoutAxis = context.orientation === "vertical" ? "y" : "x";

  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={sharedClassName}
      render={(tabProps, state) => {
        const isActive = Boolean(state.active);
        return (
          <button
            {...tabProps}
            data-active={isActive ? "" : undefined}
            data-state={isActive ? "active" : "inactive"}
            className={cn(
              sharedClassName,
              "relative z-0",
              tabProps.className
            )}
          >
            {isActive && (
              <motion.span
                layoutId={`segmented-pill-${context.listId}`}
                layout={layoutAxis}
                initial={false}
                transition={shouldReduceMotion ? { duration: 0 } : SPRING_LAYOUT}
                className={cn(
                  "absolute inset-0 z-0 bg-white dark:bg-zinc-800 pointer-events-none",
                  isCapsule ? "rounded-full" : "rounded-[9px]",
                  "shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.85)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
                  pillClassName
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex items-center justify-center gap-1.5 transition-opacity duration-200 ease-out w-full",
                isActive ? "opacity-100" : "opacity-50 hover:opacity-80"
              )}
            >
              {children}
            </span>
          </button>
        );
      }}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none data-[hidden]:hidden", className)}
      {...props}
    />
  );
}

/**
 * High-level Apple Segmented Control helper
 */
function SegmentedControl({
  value,
  onValueChange,
  items = [],
  variant = "capsule",
  size: sizeProp,
  orientation = "horizontal",
  className,
  pillClassName,
  badgeClassName,
  id,
  ...props
}) {
  const resolvedSize = sizeProp || (variant === "capsule" ? "capsule" : "default");
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      orientation={orientation}
      className={cn("w-auto", className)}
      {...props}
    >
      <TabsList variant={variant} size={resolvedSize} orientation={orientation} id={id}>
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            size={resolvedSize}
            pillClassName={pillClassName}
          >
            {item.icon && <span className="shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums leading-none shrink-0 border-0 shadow-none",
                  "bg-black/[0.06] text-gray-700 dark:bg-white/15 dark:text-zinc-200",
                  badgeClassName,
                  item.badgeClassName
                )}
              >
                {item.badge}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  SegmentedControl,
  tabsListVariants,
  tabsTriggerVariants,
};
