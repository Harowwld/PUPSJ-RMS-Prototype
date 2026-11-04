"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontalIcon } from "hugeicons-react"
import { cn } from "@/lib/utils"

const getActionVariant = (variant) =>
  ["danger", "success", "warning", "default", "outline", "ghost", "destructive"].includes(variant)
    ? variant
    : "outline"

function formatEntityLabel(count, entityName, selectionStatus) {
  if (selectionStatus) {
    const clean = selectionStatus.trim().replace(/^\d+\s*/, "")
    if (clean.toLowerCase().includes("selected")) {
      return clean.toLowerCase()
    }
    return `${clean.toLowerCase()} selected`
  }
  if (!entityName) {
    return "selected"
  }
  const clean = entityName.trim()
  const lower = clean.toLowerCase()
  if (lower === "personnel") {
    return "personnel selected"
  }
  if (lower.endsWith("y") && !lower.endsWith("ey")) {
    const base = clean.slice(0, -1)
    const plural = count === 1 ? clean : base + "ies"
    return `${plural.toLowerCase()} selected`
  }
  const plural = clean.endsWith("s") ? clean : `${clean}s`
  return `${(count === 1 ? clean : plural).toLowerCase()} selected`
}

/**
 * FloatingActionBar
 * Apple-styled floating action dock for bulk / multi-selection operations.
 *
 * @param {number} selectedCount - Number of selected records
 * @param {string} entityName - Entity name for pluralization (e.g. "personnel", "department")
 * @param {string} selectionStatus - Custom selection label
 * @param {Function} onCancel - Callback to deselect all (also bound to Esc key)
 * @param {Function} onClearSelection - Alias for onCancel
 * @param {Object} primaryAction - Main semantic action: { label, onClick, variant, icon, disabled, isBusy }
 * @param {Array} secondaryActions - Array of quick utility actions: [{ label, onClick, icon, disabled, isBusy, variant }]
 * @param {Array} overflowActions - Extra actions grouped under a [...] dropdown: [{ label, onClick, icon, disabled, variant }]
 * @param {Function} onAction - Legacy single action callback
 * @param {string} actionLabel - Legacy single action label
 * @param {string} actionVariant - Legacy single action variant
 * @param {string|Component} actionIcon - Legacy single action icon
 * @param {Array|ReactNode} actions - Legacy multiple action elements/objects
 * @param {ReactNode} customContent - Raw custom content
 * @param {ReactNode} children - Raw children
 * @param {boolean} showOnSingle - Whether to display on count >= 1 (default true)
 * @param {boolean} hideDeselectAll - Hide the Deselect button
 * @param {boolean} isBusy - Global loading/busy indicator
 * @param {string} className - Optional container styling
 */
export default function FloatingActionBar({
  selectedCount = 0,
  entityName,
  selectionStatus,
  onCancel,
  onClearSelection,
  primaryAction,
  secondaryActions = [],
  overflowActions = [],
  onAction,
  actionLabel,
  actionVariant = "danger",
  actionIcon,
  customContent,
  actions,
  children,
  showOnSingle = true,
  hideDeselectAll = false,
  isBusy = false,
  forceMount = false,
  className,
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  const count = Number(selectedCount) || 0
  const limit = showOnSingle ? 0 : 1
  const handleCancel = onCancel || onClearSelection

  // Global Escape keyboard listener to dismiss selection
  useEffect(() => {
    if ((!mounted && !forceMount) || count <= limit) return
    const onKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Esc") {
        const active = document.activeElement
        const isTextEditable =
          active &&
          ((active.tagName === "INPUT" &&
            !["checkbox", "radio", "button", "submit", "reset"].includes(
              (active.type || "").toLowerCase()
            )) ||
            active.tagName === "TEXTAREA" ||
            active.isContentEditable)
        const isDialogOpen = Boolean(
          document.querySelector(
            '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
          )
        )
        if (!isTextEditable && !isDialogOpen && handleCancel) {
          e.preventDefault()
          e.stopPropagation()
          if (active && typeof active.blur === "function") {
            active.blur()
          }
          handleCancel()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [mounted, forceMount, count, limit, handleCancel])

  if ((!mounted && !forceMount) || count <= limit) return null

  // Resolve Primary Action
  let resolvedPrimary = primaryAction
  if (!resolvedPrimary && (actionLabel || onAction)) {
    resolvedPrimary = {
      label: actionLabel,
      onClick: onAction,
      variant: actionVariant,
      icon: actionIcon,
    }
  }

  // Resolve Secondary Actions
  let resolvedSecondary = Array.isArray(secondaryActions) ? [...secondaryActions] : []
  let resolvedOverflow = Array.isArray(overflowActions) ? [...overflowActions] : []

  // Legacy actions array support
  if (Array.isArray(actions) && actions.length > 0) {
    // If primary action wasn't set explicitly, pick the most destructive/constructive one as primary
    if (!resolvedPrimary) {
      resolvedPrimary = actions[0]
      resolvedSecondary = [...actions.slice(1), ...resolvedSecondary]
    } else {
      resolvedSecondary = [...actions, ...resolvedSecondary]
    }
  }

  const handleDeselectClick = () => {
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur()
    }
    if (handleCancel) {
      handleCancel()
    }
  }

  const renderDeselectButton = () => {
    if (hideDeselectAll || !handleCancel) return null
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDeselectClick}
        title="Deselect All Selected Items (Esc)"
        className="flex h-8.5 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium border border-border dark:border-white/10 bg-white/80 dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
      >
        <span>Deselect</span>
        <kbd className="hidden sm:inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-700 px-1.5 py-0.5 text-[9.5px] font-sans font-semibold text-gray-400 dark:text-zinc-400 border border-gray-200/80 dark:border-white/5 leading-none">
          esc
        </kbd>
      </Button>
    )
  }

  const renderActionButtons = () => {
    if (customContent) {
      return (
        <div className="flex items-center gap-2">
          {customContent}
          {!hideDeselectAll && handleCancel && (
            <>
              <div className="w-[1px] bg-black/10 dark:bg-white/10 h-4.5 shrink-0 mx-0.5" aria-hidden="true" />
              {renderDeselectButton()}
            </>
          )}
        </div>
      )
    }

    if (children) {
      return (
        <div className="flex items-center gap-2">
          {children}
          {!hideDeselectAll && handleCancel && (
            <>
              <div className="w-[1px] bg-black/10 dark:bg-white/10 h-4.5 shrink-0 mx-0.5" aria-hidden="true" />
              {renderDeselectButton()}
            </>
          )}
        </div>
      )
    }

    // If actions is passed as custom JSX
    if (actions && !Array.isArray(actions)) {
      return (
        <div className="flex items-center gap-2">
          {actions}
          {!hideDeselectAll && handleCancel && (
            <>
              <div className="w-[1px] bg-black/10 dark:bg-white/10 h-4.5 shrink-0 mx-0.5" aria-hidden="true" />
              {renderDeselectButton()}
            </>
          )}
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        {/* Secondary Quick Action Buttons */}
        {resolvedSecondary.map((act, idx) => {
          if (!act || !act.label) return null
          const actDisabled = act.disabled || isBusy || act.isBusy
          return (
            <Button
              key={act.label || idx}
              type="button"
              variant={act.variant || "outline"}
              size="sm"
              onClick={act.onClick}
              disabled={actDisabled}
              title={act.title || act.label}
              className="flex h-8.5 items-center justify-center rounded-xl px-3 text-xs font-medium border border-border dark:border-white/10 bg-white/80 dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 transition-all whitespace-nowrap"
            >
              <span>{act.label}</span>
            </Button>
          )
        })}

        {/* Primary Semantic Action Button */}
        {resolvedPrimary && resolvedPrimary.label && (
          <Button
            type="button"
            size="sm"
            variant={getActionVariant(resolvedPrimary.variant)}
            onClick={resolvedPrimary.onClick}
            disabled={resolvedPrimary.disabled || isBusy || resolvedPrimary.isBusy}
            title={resolvedPrimary.title || resolvedPrimary.label}
            className="flex h-8.5 items-center justify-center rounded-xl px-4 text-xs font-semibold cursor-pointer active:scale-95 transition-all whitespace-nowrap shadow-xs"
          >
            <span>{resolvedPrimary.label}</span>
          </Button>
        )}

        {/* Overflow [...] Dropdown Menu */}
        {resolvedOverflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="More batch actions"
                title="More actions"
                className="flex h-8.5 w-8.5 p-0 items-center justify-center rounded-xl border border-border dark:border-white/10 bg-white/80 dark:bg-zinc-800/80 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 shadow-2xs cursor-pointer active:scale-95 transition-all"
              >
                <MoreHorizontalIcon size={14} className="shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={8}
              className="w-48 rounded-xl p-1 shadow-xl bg-white dark:bg-zinc-900 border border-border dark:border-white/10"
            >
              {resolvedOverflow.map((act, idx) => (
                <DropdownMenuItem
                  key={act.label || idx}
                  onClick={act.onClick}
                  disabled={act.disabled || isBusy}
                  className={cn(
                    "flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors",
                    act.variant === "danger"
                      ? "text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/30"
                      : "text-gray-700 dark:text-zinc-200 focus:bg-gray-100 dark:focus:bg-zinc-800"
                  )}
                >
                  <span className="truncate">{act.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Deselect All at the very end with vertical separator */}
        {!hideDeselectAll && handleCancel && (
          <>
            <div className="w-[1px] bg-black/10 dark:bg-white/10 h-4.5 shrink-0 mx-0.5" aria-hidden="true" />
            {renderDeselectButton()}
          </>
        )}
      </div>
    )
  }

  const entityLabel = formatEntityLabel(count, entityName, selectionStatus)

  const content = (
    <div
      role="region"
      aria-label="Selection batch actions"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in-0 slide-in-from-bottom-4 duration-200"
    >
      <div
        className={cn(
          "flex min-w-[320px] max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl py-2 px-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-none select-none",
          className
        )}
      >
        {/* Left Zone: Apple-style Token Pill with Counter & Plain Entity Label */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-gray-100 dark:bg-zinc-800 px-1.5 text-xs font-semibold tabular-nums text-gray-800 dark:text-zinc-200 border border-gray-200/60 dark:border-white/10">
            {count}
          </span>
          <span className="text-xs font-medium text-gray-800 dark:text-zinc-100 whitespace-nowrap">
            {entityLabel}
          </span>
        </div>

        {/* Vertical Hairline Divider */}
        <div className="w-[1px] bg-black/10 dark:bg-white/10 h-4.5 shrink-0" aria-hidden="true" />

        {/* Right Zone: Action Buttons */}
        <div className="flex items-center gap-2 ml-auto flex-1 justify-end">
          {renderActionButtons()}
        </div>
      </div>
    </div>
  )

  if (typeof document === "undefined" || forceMount) {
    return content
  }

  return createPortal(content, document.body)
}
