import * as React from "react"
import { cn } from "@/lib/utils"

function Empty({
  className,
  ...props
}) {
  return (
    <>
      <div
        data-slot="empty"
        className={cn(
          "flex w-full min-w-0 flex-1 flex-col items-center justify-center bg-transparent border-0",
          className
        )}
        {...props} />
    </>
  )
}

function EmptyHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="empty-header"
      className={cn("flex flex-col items-center", className)}
      {...props} />
  )
}

function EmptyMedia({
  children,
  className,
  ...props
}) {
  const cleanChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      const isIcon = child.type === "i" || child.type === "svg" || (typeof child.props.className === "string" && (child.props.className.includes("ph-") || child.props.className.includes("fa-") || child.props.className.includes("ti-")));
      if (isIcon) {
        let newClass = child.props.className || "";
        newClass = newClass
          .replace(/\bph-(duotone|bold|fill|thin|light)\b/g, "ph")
          .replace(/\btext-[a-z0-9-/]+\b/g, "")
          .replace(/\btext-(base|lg|xl|2xl|3xl|4xl|5xl)\b/g, "");
        return React.cloneElement(child, {
          className: cn("ph", newClass),
          style: {
            ...child.props.style,
            fontSize: '48px',
            color: '#C7C7CC',
          }
        })
      }
    }
    return child
  })

  return (
    <div
      data-slot="empty-icon"
      className={cn("flex shrink-0 items-center justify-center bg-transparent border-0 shadow-none rounded-none", className)}
      {...props}
    >
      {cleanChildren}
    </div>
  )
}

function EmptyTitle({
  className,
  ...props
}) {
  return (
    <div
      data-slot="empty-title"
      className={cn("font-bold tracking-tight text-[#1C1C1E] dark:text-zinc-50", className)}
      {...props} />
  )
}

function EmptyDescription({
  className,
  ...props
}) {
  return (
    <div
      data-slot="empty-description"
      className={cn(
        "font-normal text-[#8E8E93] text-center max-w-[240px] mx-auto",
        className
      )}
      {...props} />
  )
}

function EmptyContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full flex-col items-center",
        className
      )}
      {...props} />
  )
}

export {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
}
