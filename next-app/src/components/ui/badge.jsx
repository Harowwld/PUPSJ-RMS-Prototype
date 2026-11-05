import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5.5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-[-0.01em] whitespace-nowrap select-none transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/30 dark:focus-visible:ring-red-500/40 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default:
          "bg-pup-maroon text-white border-transparent shadow-[0_1px_2px_rgba(0,0,0,0.08)] [a]:hover:bg-pup-darkMaroon",
        secondary:
          "bg-black/[0.04] dark:bg-white/[0.08] text-gray-700 dark:text-zinc-200 border-black/[0.06] dark:border-white/10 [a]:hover:bg-black/[0.07]",
        destructive:
          "bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30 [a]:hover:bg-rose-500/20",
        danger:
          "bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30 [a]:hover:bg-rose-500/20",
        success:
          "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30 [a]:hover:bg-emerald-500/20",
        warning:
          "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30 [a]:hover:bg-amber-500/20",
        info:
          "bg-blue-500/12 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30 [a]:hover:bg-blue-500/20",
        blue:
          "bg-blue-500/12 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30 [a]:hover:bg-blue-500/20",
        purple:
          "bg-purple-500/12 text-purple-700 dark:text-purple-400 border-purple-500/20 dark:border-purple-500/30 [a]:hover:bg-purple-500/20",
        brand:
          "bg-pup-maroon/10 text-pup-maroon dark:bg-red-500/15 dark:text-red-300 border-pup-maroon/20 dark:border-red-500/30 [a]:hover:bg-pup-maroon/15",
        outline:
          "border-black/[0.08] dark:border-white/10 text-gray-700 dark:text-zinc-300 bg-white/60 dark:bg-zinc-800/60 shadow-2xs [a]:hover:bg-black/[0.04]",
        ghost:
          "border-transparent hover:bg-black/[0.04] text-gray-700 dark:text-zinc-300 dark:hover:bg-white/[0.06]",
        link: "border-transparent text-pup-maroon underline-offset-4 hover:underline dark:text-red-400",
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
