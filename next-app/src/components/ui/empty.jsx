import * as React from "react"
import { cn } from "@/lib/utils"

function Empty({
  className,
  ...props
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        /* iOS/macOS Empty State Override Container */
        [data-slot="empty"] {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 32px 16px !important;
          margin: auto !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 280px !important;
        }

        /* Compact/Widget Variant */
        [data-slot="empty"][data-compact="true"] {
          min-height: 0 !important;
          min-height: auto !important;
          padding: 8px 16px !important;
        }

        [data-slot="empty"][data-compact="true"] [data-slot="empty-icon"] {
          margin: 0 auto 8px auto !important;
          width: 32px !important;
          height: 32px !important;
          min-width: 32px !important;
          min-height: 32px !important;
        }

        [data-slot="empty"][data-compact="true"] [data-slot="empty-icon"] i,
        [data-slot="empty"][data-compact="true"] [data-slot="empty-icon"] svg,
        [data-slot="empty"][data-compact="true"] [data-slot="empty-icon"] .lucide-svg {
          font-size: 32px !important;
          width: 32px !important;
          height: 32px !important;
        }

        [data-slot="empty"][data-compact="true"] [data-slot="empty-title"] {
          font-size: 14px !important;
          margin: 0 auto 2px auto !important;
        }

        [data-slot="empty"][data-compact="true"] [data-slot="empty-description"] {
          font-size: 11px !important;
          max-width: 180px !important;
        }

        /* Reset all structural wrappers that might exist inside Empty */
        [data-slot="empty-header"], 
        [data-slot="empty-content"] {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          max-width: none !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }

        /* Remove any backgrounds, circles, rotations or borders behind icons */
        [data-slot="empty"] .rounded-full,
        [data-slot="empty"] .rounded-3xl,
        [data-slot="empty"] [class*="rounded-full"],
        [data-slot="empty"] [class*="rounded-3xl"],
        [data-slot="empty"] [class*="bg-gray-"],
        [data-slot="empty"] [class*="bg-white"],
        [data-slot="empty"] [class*="shadow-"],
        [data-slot="empty"] [class*="border-"],
        [data-slot="empty"] [class*="rotate-"],
        [data-slot="empty"] [class*="translate-"] {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          transform: none !important;
          rotate: 0deg !important;
          --tw-rotate: 0deg !important;
          --tw-transform: none !important;
          animation: none !important;
        }

        /* Enforce large outline/stroke icon (~48-56px, color #C7C7CC) with no container */
        [data-slot="empty-icon"] {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin: 0 auto 12px auto !important;
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          padding: 0 !important;
          background: transparent !important;
          border: none !important;
          transform: none !important;
          rotate: 0deg !important;
          --tw-rotate: 0deg !important;
          --tw-transform: none !important;
        }

        [data-slot="empty-icon"] i,
        [data-slot="empty-icon"] svg,
        [data-slot="empty-icon"] .lucide-svg {
          font-size: 48px !important;
          width: 48px !important;
          height: 48px !important;
          color: #C7C7CC !important;
          stroke: #C7C7CC !important;
          fill: none !important;
          transform: none !important;
          rotate: 0deg !important;
          --tw-rotate: 0deg !important;
          --tw-transform: none !important;
        }

        /* Enforce bold (font-weight 700), ~17-18px primary text, near-black #1C1C1E color */
        [data-slot="empty-title"] {
          font-size: 17.5px !important;
          font-weight: 700 !important;
          color: #1C1C1E !important;
          margin: 0 auto 5px auto !important;
          padding: 0 !important;
          line-height: 1.3 !important;
          letter-spacing: -0.01em !important;
          font-family: var(--font-inter), sans-serif !important;
        }

        .dark [data-slot="empty-title"] {
          color: #F2F2F7 !important;
        }

        /* Enforce regular weight (400), ~14px, color #8E8E93, max-width ~240px, line-height 1.5 secondary text */
        [data-slot="empty-description"] {
          font-size: 14px !important;
          font-weight: 400 !important;
          color: #8E8E93 !important;
          text-align: center !important;
          max-width: 240px !important;
          line-height: 1.5 !important;
          margin: 0 auto !important;
          padding: 0 !important;
          font-family: var(--font-inter), sans-serif !important;
        }

        /* Style CTA buttons to be minimal text links if they exist */
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
          color: #0A84FF !important; /* iOS blue tint color for interactive text */
          font-size: 14px !important;
          font-weight: 500 !important;
          text-decoration: none !important;
          display: inline-flex !important;
          justify-content: center !important;
          align-items: center !important;
          text-align: center !important;
          margin: 12px auto 0 auto !important;
          gap: 4px !important;
          transition: opacity 0.2s !important;
          cursor: pointer !important;
        }

        [data-slot="empty"] button:hover,
        [data-slot="empty"] a.button:hover,
        [data-slot="empty"] a[class*="border"]:hover,
        [data-slot="empty"] .btn-brand-red:hover {
          opacity: 0.7 !important;
          text-decoration: underline !important;
        }

        .dark [data-slot="empty"] button,
        .dark [data-slot="empty"] a.button,
        .dark [data-slot="empty"] a[class*="border"],
        .dark [data-slot="empty"] .btn-brand-red {
          color: #0A84FF !important;
        }
      `}} />
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
