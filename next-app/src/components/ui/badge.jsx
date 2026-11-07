import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[-0.01em] whitespace-nowrap select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/30 dark:focus-visible:ring-red-500/40 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-pup-maroon text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] [a]:hover:bg-pup-darkMaroon",
        secondary:
          "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300 [a]:hover:bg-gray-200",
        destructive:
          "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 [a]:hover:bg-rose-100",
        danger:
          "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 [a]:hover:bg-rose-100",
        success:
          "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 [a]:hover:bg-emerald-100",
        warning:
          "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 [a]:hover:bg-amber-100",
        info:
          "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 [a]:hover:bg-blue-100",
        blue:
          "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 [a]:hover:bg-blue-100",
        purple:
          "bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 [a]:hover:bg-purple-100",
        orange:
          "bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 [a]:hover:bg-orange-100",
        gray:
          "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300 [a]:hover:bg-gray-200",
        brand:
          "bg-[#800000]/10 text-[#800000] dark:bg-red-950/40 dark:text-red-300 [a]:hover:bg-[#800000]/15",
        outline:
          "border border-border text-gray-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-800/60 shadow-2xs [a]:hover:bg-black/[0.04]",
        ghost:
          "hover:bg-black/[0.04] text-gray-700 dark:text-zinc-300 dark:hover:bg-white/[0.06]",
        link: "text-pup-maroon underline-offset-4 hover:underline dark:text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps({
      className: cn(badgeVariants({ variant }), className),
    }, props),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants }
