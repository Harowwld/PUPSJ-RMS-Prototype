"use client"

import { useEffect, useId, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { MoreHorizontalIcon, Search01Icon } from "hugeicons-react";


/**
 * A standardized header component for pages and tabs.
 * 
 * @param {string} title - Header title
 * @param {string} description - Header description
 * @param {React.ReactNode} leftAction - Optional slot for elements to the left of the icon (e.g., sidebar toggle)
 * @param {string} searchPlaceholder - Placeholder for the search input
 * @param {string} searchLabel - Optional label for the search input (defaults to "Search")
 * @param {string} searchValue - Current search value
 * @param {function} onSearchChange - Change handler for search
 * @param {React.ReactNode} filters - Slot for filter controls (e.g., segmented toggles)
 * @param {React.ReactNode} actions - Slot for action buttons (e.g., Add, Export, Refresh)
 * @param {React.ReactNode} secondaryActions - Less frequent actions revealed beside the main actions
 */
export default function PageHeader({
  title,
  description,
  leftAction,
  searchPlaceholder,
  searchLabel = "Search",
  searchCount,
  searchValue,
  onSearchChange,
  filters,
  actions,
  secondaryActions,
  showBorder = true,
  titleClassName,
  descriptionClassName,
  className,
}) {
  const [showSecondaryActions, setShowSecondaryActions] = useState(false)
  const secondaryActionsId = useId()
  const secondaryActionsRef = useRef(null)
  const moreActionsRef = useRef(null)

  useEffect(() => {
    if (!showSecondaryActions) return

    secondaryActionsRef.current?.querySelector("button:not(:disabled)")?.focus()

    const closeOnOutsideClick = (event) => {
      if (!secondaryActionsRef.current?.contains(event.target)) {
        setShowSecondaryActions(false)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setShowSecondaryActions(false)
        requestAnimationFrame(() => moreActionsRef.current?.focus())
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [showSecondaryActions])

  return (
    <div className={cn(
      "bg-transparent rounded-t-brand select-none transition-colors duration-normal dark:bg-transparent",
      !className?.includes("p-") && !className?.includes("py-") && "p-6",
      showBorder && "border-b border-border dark:border-border",
      className
    )}>
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 lg:flex-1">
          {leftAction}
          
          <div className="flex min-w-0 flex-col gap-[4px]">
            <CardTitle 
              className={cn(
                "flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50 m-0",
                titleClassName?.includes("text-[15px]") && "text-[15px]",
                titleClassName?.includes("text-[20px]") && "text-[20px]",
                titleClassName
              )}
            >
              {title}
            </CardTitle>
            {description && (
              <CardDescription 
                className={cn(
                  "text-[13px] font-normal text-gray-500 transition-colors dark:text-zinc-400 m-0 mt-[4px]",
                  descriptionClassName?.includes("text-[12px]") && "text-[12px]",
                  descriptionClassName?.includes("text-[14px]") && "text-[14px]",
                  descriptionClassName
                )}
              >
                {description}
              </CardDescription>
            )}
          </div>
        </div>

        {(filters || onSearchChange || searchValue !== undefined || actions) && (
          <div className={cn("flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-end lg:justify-end", filters || onSearchChange || searchValue !== undefined ? "lg:flex-1" : "lg:shrink-0")}>
            {/* Filters & Search */}
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
              {filters}
              
              {(onSearchChange || searchValue !== undefined) && (
                <div className="w-full sm:w-64">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-[10px] font-semibold text-gray-700 tracking-wide transition-colors dark:text-zinc-200">
                      {searchLabel}
                    </label>
                    {searchCount && (
                      <span className="text-[9px] font-semibold text-pup-maroon dark:text-primary/70">
                        {searchCount}
                      </span>
                    )}
                  </div>
                  <div className="relative transition-colors group">
                    <Search01Icon size={16}  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 z-10 text-gray-400 dark:text-zinc-500 transition-colors group-focus-within:text-pup-maroon dark:group-focus-within:text-red-400" />
                    <Input
                      placeholder={searchPlaceholder || "Search..."}
                      className="h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 pl-9 text-xs font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all"
                      value={searchValue || ""}
                      onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {(actions || secondaryActions) && (
              <div className="flex max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto lg:overflow-visible">
                {secondaryActions && (
                  <div
                    id={secondaryActionsId}
                    ref={secondaryActionsRef}
                    role="group"
                    aria-label="More actions"
                    onClickCapture={() => setShowSecondaryActions(false)}
                    className={cn(
                      "shrink-0 items-center gap-2",
                      showSecondaryActions ? "flex animate-in fade-in zoom-in-95 duration-150" : "hidden"
                    )}
                  >
                    {secondaryActions}
                  </div>
                )}
                {secondaryActions && !showSecondaryActions && (
                  <button
                    ref={moreActionsRef}
                    type="button"
                    aria-expanded={false}
                    aria-controls={secondaryActionsId}
                    aria-label="Show more actions"
                    title="More actions"
                    onClick={() => setShowSecondaryActions(true)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 cursor-pointer active:scale-95"
                  >
                    <MoreHorizontalIcon size={16} aria-hidden="true" />
                  </button>
                )}
                {actions}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
