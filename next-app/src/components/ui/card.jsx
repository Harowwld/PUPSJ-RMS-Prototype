import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "group/card flex flex-col overflow-hidden rounded-2xl text-sm transition-colors text-card-foreground",
  {
    variants: {
      variant: {
        default:
          "border border-black/[0.08] dark:border-white/10 bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.3)]",
        grouped:
          "border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] shadow-none",
        "inset-grouped":
          "border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] shadow-none",
        "glass":
          "border border-black/[0.08] dark:border-white/12 bg-white/80 dark:bg-zinc-900/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]",
        flat:
          "border border-border/80 dark:border-border bg-card shadow-none",
      },
      size: {
        default: "gap-4 py-4 data-[size=sm]:gap-3 data-[size=sm]:py-3",
        sm: "gap-3 py-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Card({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      data-size={size}
      className={cn(
        cardVariants({ variant, size }),
        "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-2xl px-5 group-data-[size=sm]/card:px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-[15px] font-semibold tracking-[-0.012em] text-gray-900 dark:text-zinc-50 group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-[12.5px] font-normal leading-relaxed text-gray-500 dark:text-zinc-400 mt-0.5", className)}
      {...props}
    />
  );
}

function CardAction({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  );
}

function CardContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-5 group-data-[size=sm]/card:px-4", className)}
      {...props}
    />
  );
}

function CardFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-2xl border-t border-black/[0.06] dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.015] p-4 px-5 text-xs text-muted-foreground group-data-[size=sm]/card:p-3 group-data-[size=sm]/card:px-4",
        className
      )}
      {...props}
    />
  );
}

function CardSectionHeader({
  className,
  children,
  ...props
}) {
  return (
    <div
      data-slot="card-section-header"
      className={cn(
        "px-1 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground select-none",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardGroup({
  className,
  ...props
}) {
  return (
    <div
      data-slot="card-group"
      className={cn(
        "rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-zinc-900/50 divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden shadow-2xs",
        className
      )}
      {...props}
    />
  );
}

function CardRow({
  className,
  icon: Icon,
  title,
  description,
  children,
  ...props
}) {
  return (
    <div
      data-slot="card-row"
      className={cn(
        "flex items-center justify-between gap-3 p-3.5 sm:p-4 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {Icon && (
          <div className="size-8 rounded-lg bg-black/[0.04] dark:bg-white/[0.08] text-gray-700 dark:text-zinc-200 flex items-center justify-center shrink-0">
            <Icon size={16} />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          {title && (
            <span className="text-[13px] font-semibold text-gray-900 dark:text-zinc-100 truncate">
              {title}
            </span>
          )}
          {description && (
            <span className="text-[11.5px] font-normal leading-relaxed text-gray-500 dark:text-zinc-400">
              {description}
            </span>
          )}
        </div>
      </div>
      {children && (
        <div className="shrink-0 flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

function CardSeparator({
  className,
  inset = false,
  ...props
}) {
  return (
    <div
      data-slot="card-separator"
      className={cn(
        "h-px bg-black/[0.06] dark:bg-white/10",
        inset && "ml-4",
        className
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  CardSectionHeader,
  CardGroup,
  CardRow,
  CardSeparator,
}
