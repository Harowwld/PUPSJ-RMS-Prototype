import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 rounded-brand",
  {
    variants: {
      orientation: {
        horizontal:
          "flex-row [&>[data-slot]]:rounded-none [&>[data-slot]:first-child]:rounded-l-brand [&>[data-slot]:last-child]:rounded-r-brand [&>[data-slot]~[data-slot]]:-ml-px",
        vertical:
          "flex-col [&>[data-slot]]:rounded-none [&>[data-slot]:first-child]:rounded-t-brand [&>[data-slot]:last-child]:rounded-b-brand [&>[data-slot]~[data-slot]]:-mt-px",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)

function ButtonGroup({
  className,
  orientation,
  ...props
}) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props} />
  );
}

function ButtonGroupText({
  className,
  render,
  ...props
}) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps({
      className: cn(
        "flex items-center gap-2 rounded-brand border bg-muted px-2.5 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        className
      ),
    }, props),
    render,
    state: {
      slot: "button-group-text",
    },
  });
}

function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className
      )}
      {...props} />
  );
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
}
