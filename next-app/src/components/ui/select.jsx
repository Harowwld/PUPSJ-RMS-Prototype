"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

const Select = React.forwardRef(({ className, children, value, onChange, placeholder, menuClassName, optionClassName, ...props }, ref) => {
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
    if (isOpen) {
      updateCoords()
      window.addEventListener("scroll", updateCoords, true)
      window.addEventListener("resize", updateCoords)
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true)
      window.removeEventListener("resize", updateCoords)
    }
  }, [isOpen])

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

  // Extract options from children
  const options = React.Children.map(children, (child) => {
    if (!child) return null
    if (child.type === "option") {
      return {
        value: child.props.value,
        label: child.props.children,
        disabled: child.props.disabled,
      }
    }
    return null
  }).filter(Boolean)

  const selectedOption = options.find((o) => String(o.value) === String(value))

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ target: { value: val } })
    }
    setIsOpen(false)
  }

  return (
    <div className="relative w-full">
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
          "flex h-11 w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 shadow-xs outline-none transition-all hover:bg-gray-50 focus:border-pup-maroon/30 focus:ring-4 focus:ring-pup-maroon/5 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
          className
        )}
        {...props}
      >
        <span className="flex-1 text-left truncate">
          {selectedOption ? selectedOption.label : (placeholder !== undefined ? placeholder : (options[0]?.label || "Select..."))}
        </span>
        <i
          className={cn(
            "ph-bold ph-caret-down ml-auto shrink-0 text-gray-400 text-[10px] transition-all duration-300",
            isOpen ? "rotate-180 text-pup-maroon dark:text-primary" : ""
          )}
        ></i>
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: coords.top + 4,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
          }}
          className={cn(
            "transition-[opacity,transform] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-2xl dark:border-white/10 dark:bg-zinc-900",
            menuClassName
          )}
        >
          <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-left text-xs font-semibold whitespace-nowrap transition-colors",
                  String(value) === String(option.value)
                    ? "bg-pup-maroon/10 text-pup-maroon dark:bg-red-500/20 dark:text-red-400"
                    : "text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5",
                  option.disabled && "opacity-50 cursor-not-allowed",
                  optionClassName
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
})
Select.displayName = "Select"

export { Select }
