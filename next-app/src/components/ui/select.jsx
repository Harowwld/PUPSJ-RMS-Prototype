"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

const Select = React.forwardRef(({
  className,
  buttonClassName,
  containerClassName,
  children,
  options: optionsProp,
  value,
  onChange,
  onValueChange,
  placeholder,
  menuClassName,
  optionClassName,
  usePortal = true,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 })
  const triggerRef = React.useRef(null)
  const menuRef = React.useRef(null)

  React.useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      })
    }
  }

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (isOpen && usePortal) {
      updateCoords()
      window.addEventListener("scroll", updateCoords, true)
      window.addEventListener("resize", updateCoords)
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true)
      window.removeEventListener("resize", updateCoords)
    }
  }, [isOpen, usePortal])

  React.useEffect(() => {
    if (typeof document === "undefined") return
    function handleClickOutside(event) {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  // Extract options from options prop or children
  let options = []
  if (Array.isArray(optionsProp)) {
    options = optionsProp.map((opt) =>
      typeof opt === "object" && opt !== null
        ? opt
        : { value: opt, label: String(opt) }
    )
  } else if (children) {
    const extractOptions = (nodes) => {
      const list = []
      React.Children.forEach(nodes, (child, idx) => {
        if (!child) return
        if (child.type === React.Fragment) {
          list.push(...extractOptions(child.props.children))
        } else if (child.type === "optgroup") {
          if (child.props.label) {
            list.push({
              isHeader: true,
              label: child.props.label,
              key: `header-${child.props.label}-${idx}`,
            })
          }
          if (child.props.children) {
            list.push(...extractOptions(child.props.children))
          }
        } else if (child.type === "option") {
          list.push({
            value: child.props.value,
            label: child.props.children,
            disabled: child.props.disabled,
          })
        }
      })
      return list
    }
    options = extractOptions(children)
  }

  const selectedOption = options.find((o) => !o.isHeader && String(o.value) === String(value))

  const handleSelect = (val) => {
    if (onValueChange) {
      onValueChange(val)
    }
    if (onChange) {
      onChange({ target: { value: val } })
    }
    setIsOpen(false)
  }

  const renderMenu = () => (
    <div
      ref={menuRef}
      style={usePortal ? {
        position: "fixed",
        top: coords.top + 4,
        left: coords.left,
        width: coords.width,
        zIndex: 9999,
      } : undefined}
      className={cn(
        "transition-[opacity,transform] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-card",
        usePortal ? "" : "absolute z-50 top-[calc(100%+4px)] left-0 min-w-[120px] w-full",
        menuClassName
      )}
    >
      <div className="max-h-60 overflow-y-auto overflow-x-hidden w-full scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
        {options.map((option, idx) => {
          if (option.isHeader) {
            return (
              <div
                key={option.key || `header-${idx}`}
                className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider select-none border-t first:border-t-0 border-gray-100 dark:border-white/5 first:pt-1.5"
              >
                {option.label}
              </div>
            )
          }

          const isSelected = String(value) === String(option.value)
          return (
            <button
              key={option.value !== undefined ? String(option.value) : `opt-${idx}`}
              type="button"
              disabled={option.disabled}
              onClick={() => handleSelect(option.value)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-normal transition-colors min-w-0 cursor-pointer",
                isSelected
                  ? "bg-pup-maroon/10 text-pup-maroon font-medium dark:bg-red-500/20 dark:text-red-400"
                  : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5",
                option.disabled && "opacity-50 cursor-not-allowed",
                optionClassName
              )}
              title={typeof option.label === "string" ? option.label : undefined}
            >
              <span className="truncate flex-1 min-w-0">{option.label}</span>
              {isSelected && (
                <i className="ph-bold ph-check text-xs ml-2 text-pup-maroon dark:text-red-400 shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className={cn("relative w-full min-w-0 h-auto", containerClassName)}>
      <button
        type="button"
        ref={(el) => {
          triggerRef.current = el
          if (ref) {
            if (typeof ref === "function") ref(el)
            else if (ref.hasOwnProperty('current')) ref.current = el
          }
        }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-11 w-full items-center justify-between overflow-hidden rounded-xl border border-gray-200 bg-white px-3 text-xs font-normal text-gray-700 shadow-none outline-none transition-all hover:bg-gray-50 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 dark:border-white/10 dark:bg-card dark:text-zinc-200 dark:hover:bg-zinc-800 min-w-0",
          isOpen && "border-pup-maroon ring-1 ring-pup-maroon dark:border-red-500/80 dark:ring-red-500/80",
          buttonClassName,
          className
        )}
        {...props}
      >
        <span 
          className="flex-1 text-left truncate min-w-0"
          title={selectedOption ? String(selectedOption.label ?? "") : ""}
        >
          {selectedOption ? selectedOption.label : (placeholder !== undefined ? placeholder : (options.find((o) => !o.isHeader)?.label || "Select..."))}
        </span>
        <i
          className={cn(
            "ph-bold ph-caret-down ml-auto shrink-0 text-gray-400 text-[10px] transition-all duration-300",
            isOpen ? "rotate-180 text-pup-maroon dark:text-primary" : ""
          )}
        ></i>
      </button>

      {isOpen && mounted && (usePortal ? createPortal(renderMenu(), document.body) : renderMenu())}
    </div>
  )
})
Select.displayName = "Select"

export { Select }
