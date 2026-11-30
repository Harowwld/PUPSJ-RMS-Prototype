import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"
import { BADGE_BASE, BADGE_PALETTES, COMPACT_BADGE_BASE } from "@/lib/badgeStyles"

const badgeVariants = cva(
  `${BADGE_BASE} group/badge w-fit overflow-hidden select-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-500 [&>svg]:pointer-events-none [&>svg]:size-3!`,
  {
    variants: {
      variant: {
        default:
          "bg-pup-maroon text-white [a]:hover:bg-pup-darkMaroon",
        secondary:
          BADGE_PALETTES.slate,
        destructive:
          BADGE_PALETTES.red,
        danger:
          BADGE_PALETTES.red,
        success:
          BADGE_PALETTES.green,
        warning:
          BADGE_PALETTES.amber,
        info:
          BADGE_PALETTES.blue,
        blue:
          BADGE_PALETTES.blue,
        purple:
          BADGE_PALETTES.purple,
        orange:
          BADGE_PALETTES.orange,
        gray:
          BADGE_PALETTES.slate,
        brand:
          "bg-[#800000]/10 text-[#800000] dark:bg-red-950/40 dark:text-red-300 [a]:hover:bg-[#800000]/15",
        outline:
          BADGE_PALETTES.slate,
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
  size,
  ...props
}) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps({
      className: cn(badgeVariants({ variant }), size === "compact" && COMPACT_BADGE_BASE, className),
    }, props),
    render,
  size,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants }
