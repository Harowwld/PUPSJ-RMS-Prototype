"use client"

import { Cancel01Icon, Search01Icon } from "hugeicons-react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function DashboardSearch({
  value,
  onChange,
  onClear,
  count,
  resultCount,
  loading = false,
  isLoading,
  label,
  "aria-label": ariaLabel,
  placeholder,
  className,
}) {
  const resolvedCount = count !== undefined ? count : resultCount
  const resolvedLoading = isLoading !== undefined ? isLoading : loading
  const resolvedLabel = label || ariaLabel || "Search"
  const clear = () => {
    if (onClear) onClear()
    else onChange("")
  }

  return (
    <div className={cn("group relative w-72 sm:w-80 shrink-0", className)}>
      <Search01Icon size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 text-gray-400 transition-colors group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-red-400" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape" && value) { event.stopPropagation(); clear() } }}
        aria-label={resolvedLabel}
        placeholder={placeholder}
        className={cn(
          "h-9 w-full max-w-none border-border bg-white pl-8 text-xs shadow-none dark:border-border dark:bg-zinc-800 [@media(pointer:coarse)]:h-11 [&::-webkit-search-cancel-button]:hidden focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all",
          value ? "pr-20" : "pr-12"
        )}
      />
      <div className="pointer-events-none absolute inset-y-0 right-2.5 z-10 flex items-center gap-1">
        {Boolean(value) && (
          <button
            type="button"
            aria-label={`Clear ${resolvedLabel.toLowerCase()}`}
            onClick={clear}
            className="pointer-events-auto flex h-5 w-5 cursor-pointer items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-white dark:focus-visible:ring-red-400"
          >
            <Cancel01Icon size={12} aria-hidden="true" />
          </button>
        )}
        {resolvedCount !== undefined && (
          <span aria-live="polite" aria-atomic="true" className="text-[11px] tabular-nums text-gray-500 dark:text-zinc-400">
            {resolvedLoading ? <Skeleton aria-hidden="true" className="h-3 w-6" /> : <><span className="sr-only">Results: </span>{resolvedCount?.toLocaleString()}</>}
          </span>
        )}
      </div>
    </div>
  )
}
