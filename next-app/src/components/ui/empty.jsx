import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

function Empty({
  className,
  ...props
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        [data-slot="empty"] button,
        [data-slot="empty"] a.button,
        [data-slot="empty"] a[class*="border"],
        [data-slot="empty"] button[class*="border"],
        [data-slot="empty"] .btn-brand-red {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          height: auto !important;
          width: auto !important;
          color: #800000 !important; /* pup-maroon */
          font-size: 12px !important;
          font-weight: 600 !important;
          text-decoration: none !important;
          display: inline-flex !important;
          justify-content: center !important;
          align-items: center !important;
          text-align: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
          gap: 4px !important;
          margin-top: 8px !important;
          transition: opacity 0.2s !important;
        }
        [data-slot="empty"] button:hover,
        [data-slot="empty"] a[class*="border"]:hover,
        [data-slot="empty"] .btn-brand-red:hover {
          opacity: 0.8 !important;
          background: transparent !important;
          background-color: transparent !important;
          text-decoration: underline !important;
        }
        .dark [data-slot="empty"] button,
        .dark [data-slot="empty"] a[class*="border"],
        .dark [data-slot="empty"] .btn-brand-red {
          color: #f87171 !important; /* red-400 for dark mode */
        }
        /* Remove any background circles, animated pulses, or borders behind icons */
        [data-slot="empty"] .rounded-full,
        [data-slot="empty"] .rounded-3xl,
        [data-slot="empty"] [class*="rounded-full"],
        [data-slot="empty"] [class*="animate-pulse"],
        [data-slot="empty"] [class*="bg-gray-50"],
        [data-slot="empty"] [class*="bg-white"],
        [data-slot="empty"] [class*="shadow-"] {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          transform: none !important;
          animation: none !important;
        }
        /* Center icons within any layout wrappers */
        [data-slot="empty-icon"] {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
          margin-top: 28px !important;
          margin-bottom: 4px !important;
          width: auto !important;
          height: auto !important;
        }
        /* Reset and center any wrapping divs nested under the Empty component */
        [data-slot="empty"] div:not([data-slot="empty-header"]):not([data-slot="empty-content"]):not([data-slot="empty-title"]):not([data-slot="empty-description"]) {
          width: auto !important;
          height: auto !important;
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
          margin-top: 0px !important;
          margin-bottom: 0px !important;
          position: relative !important;
          transform: none !important;
        }
      `}} />
      <div
        data-slot="empty"
        className={cn(
          "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center text-balance bg-transparent border-0",
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
      className={cn("flex max-w-sm flex-col items-center gap-1.5", className)}
      {...props} />
  )
}

function EmptyMedia({
  children,
  className,
  variant = "default",
  ...props
}) {
  const cleanChildren = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      const isIcon = child.type === "i" || child.type === "svg" || (typeof child.props.className === "string" && (child.props.className.includes("ph-") || child.props.className.includes("fa-")));
      if (isIcon) {
        let newClass = child.props.className || "";
        newClass = newClass
          .replace(/\bph-(duotone|bold|fill|thin)\b/g, "ph-light")
          .replace(/\btext-[a-z0-9-/]+\b/g, "")
          .replace(/\btext-(base|lg|xl|2xl|3xl|4xl|5xl)\b/g, "");
        return React.cloneElement(child, {
          className: cn("ph-light text-[28px] text-gray-400 dark:text-zinc-500", newClass)
        })
      }
    }
    return child
  })

  return (
    <div
      data-slot="empty-icon"
      className="flex shrink-0 items-center justify-center mb-2.5 h-8 w-8 bg-transparent border-0 shadow-none rounded-none"
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
      className={cn("text-[13px] font-semibold tracking-tight text-gray-900 dark:text-zinc-50 mb-0.5", className)}
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
        "text-[11px] text-gray-500 dark:text-zinc-400 max-w-[280px] mx-auto line-clamp-2 ",
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
        "flex w-full max-w-sm min-w-0 flex-col items-center gap-1 text-xs text-balance",
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
