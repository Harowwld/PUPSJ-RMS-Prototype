"use client"

import * as React from "react"
import { Select as Primitive } from "@base-ui/react/select"
import { ArrowDown01Icon, Tick01Icon, UnfoldMoreIcon } from "hugeicons-react"
import { cn } from "@/lib/utils"

function extractOptions(nodes, groupDisabled = false) {
  const options = []
  React.Children.forEach(nodes, child => {
    if (!React.isValidElement(child)) return
    if (child.type === React.Fragment) options.push(...extractOptions(child.props.children, groupDisabled))
    else if (child.type === "optgroup") {
      options.push({ isHeader: true, label: child.props.label })
      options.push(...extractOptions(child.props.children, groupDisabled || child.props.disabled))
    } else if (child.type === "option") options.push({ value: child.props.value ?? child.props.children, label: child.props.children, disabled: groupDisabled || child.props.disabled })
  })
  return options
}

const Select = React.forwardRef(({
  className, buttonClassName, containerClassName, children, options: optionsProp,
  value, defaultValue, onChange, onValueChange, placeholder, title, menuClassName,
  optionClassName, usePortal = true, indicator = "caret", align = "start",
  name, form, required, disabled, readOnly, ...props
}, ref) => {
  const options = Array.isArray(optionsProp)
    ? optionsProp.map(option => typeof option === "object" && option !== null ? option : { value: option, label: String(option) })
    : extractOptions(children)
  const items = options.filter(option => !option.isHeader)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const [isOpen, setIsOpen] = React.useState(false)
  const currentValue = value !== undefined ? value : uncontrolledValue
  // Callers mix numeric options with string values from change events.
  const selected = items.find(option => String(option.value) === String(currentValue))
  const content = (
    <Primitive.Positioner align={align} sideOffset={4} alignItemWithTrigger={false} collisionPadding={12} className="z-[9999] outline-none">
      <Primitive.Popup data-slot="select-popup" className={cn("w-[var(--anchor-width)] min-w-[min(10rem,calc(100vw-24px))] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/10 bg-white/92 dark:bg-zinc-900/92 backdrop-blur-2xl p-0 text-gray-700 shadow-[0_16px_36px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.08)] outline-none dark:text-zinc-200", menuClassName)}>
        {title && <div className="px-4.5 py-2.5 text-[11px] font-semibold text-gray-900 dark:text-zinc-100 border-b border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">{title}</div>}
        <Primitive.List className="max-h-[min(15rem,var(--available-height))] overflow-y-auto overflow-x-hidden p-1.5 space-y-0.5 outline-none">
          {options.map((option, index) => option.isHeader ? (
            <div key={`heading-${index}`} role="presentation" className="px-3 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500">{option.label}</div>
          ) : (
            <Primitive.Item key={`${option.value}-${index}`} value={option.value} disabled={option.disabled} className={cn("min-h-[30px] flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none transition-colors duration-100 data-highlighted:bg-black/[0.05] data-selected:bg-black/[0.05] data-disabled:cursor-not-allowed data-disabled:opacity-50 dark:data-highlighted:bg-white/10 dark:data-selected:bg-white/10", optionClassName)}>
              <Primitive.ItemText className="min-w-0 flex-1 truncate">{option.label}</Primitive.ItemText>
              <Primitive.ItemIndicator><Tick01Icon size={13} aria-hidden="true" /></Primitive.ItemIndicator>
            </Primitive.Item>
          ))}
        </Primitive.List>
      </Primitive.Popup>
    </Primitive.Positioner>
  )
  const Indicator = indicator === "updown" ? UnfoldMoreIcon : ArrowDown01Icon
  return (
    <Primitive.Root onOpenChange={setIsOpen} value={selected?.value ?? null} onValueChange={next => {
      setUncontrolledValue(next)
      onValueChange?.(next)
      onChange?.({ target: { value: next, name } })
    }} items={items} name={name} form={form} required={required} disabled={disabled} readOnly={readOnly}>
      <div className={cn("relative h-auto w-full min-w-0", containerClassName)}>
        <Primitive.Trigger ref={ref} data-slot="select-trigger" className={cn("flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 overflow-hidden rounded-xl border border-gray-200 bg-white px-3 text-[13px] font-normal text-gray-700 shadow-none outline-none transition-colors focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon data-popup-open:border-pup-maroon data-popup-open:ring-1 data-popup-open:ring-pup-maroon disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200", buttonClassName, className)} {...props}>
          <Primitive.Value className="min-w-0 flex-1 truncate text-left" placeholder={placeholder ?? items[0]?.label ?? "Select…"} />
          <Primitive.Icon><Indicator size={16} aria-hidden="true" className="shrink-0 text-gray-400" /></Primitive.Icon>
        </Primitive.Trigger>
        {usePortal ? <Primitive.Portal>{content}</Primitive.Portal> : isOpen ? content : null}
      </div>
    </Primitive.Root>
  )
})
Select.displayName = "Select"
export { Select }
