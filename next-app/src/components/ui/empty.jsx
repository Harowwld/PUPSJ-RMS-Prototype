import { cn } from "@/lib/utils"

function Empty({ className, variant = "page", ...props }) {
  return (
    <div
      data-slot="empty"
      data-variant={variant}
      className={cn(
        "group/empty flex w-full min-w-0 flex-col items-center justify-center text-center",
        variant === "compact"
          ? "min-h-0 flex-none px-4 py-6"
          : "min-h-[360px] flex-1 px-6 py-12",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex w-full min-w-0 flex-col items-center", className)}
      {...props}
    />
  )
}

function EmptyMedia({ className, ...props }) {
  return (
    <div
      data-slot="empty-icon"
      aria-hidden="true"
      className={cn(
        "mb-4 flex h-12 w-12 shrink-0 items-center justify-center text-[48px] text-gray-400 dark:text-zinc-500 group-data-[variant=compact]/empty:mb-3 group-data-[variant=compact]/empty:h-7 group-data-[variant=compact]/empty:w-7 group-data-[variant=compact]/empty:text-[28px]",
        className
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }) {
  return (
    <div
      data-slot="empty-title"
      className={cn(
        "max-w-full text-xl font-semibold leading-tight tracking-[-0.02em] text-gray-900 [overflow-wrap:anywhere] dark:text-zinc-50 group-data-[variant=compact]/empty:text-sm group-data-[variant=compact]/empty:tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "mt-2 max-w-xs text-sm font-normal leading-relaxed text-gray-500 [overflow-wrap:anywhere] dark:text-zinc-400 group-data-[variant=compact]/empty:mt-1 group-data-[variant=compact]/empty:text-xs",
        className
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "mt-6 flex w-full min-w-0 flex-col items-center gap-2 empty:hidden [&>button]:max-w-full [&>button]:whitespace-normal [&>a]:max-w-full [&>a]:whitespace-normal",
        className
      )}
      {...props}
    />
  )
}

function EmptyState({ icon: Icon, title, description, children, variant = "page", className }) {
  return (
    <Empty variant={variant} className={className}>
      <EmptyHeader>
        {Icon && <EmptyMedia><Icon size="1em" /></EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia, EmptyState }
