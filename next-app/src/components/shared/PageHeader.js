"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CardTitle, CardDescription } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/**
 * A standardized header component for pages and tabs.
 * 
 * @param {string} icon - Phosphor icon class (e.g., "ph-hard-drives")
 * @param {string} title - Header title
 * @param {string} description - Header description
 * @param {React.ReactNode} leftAction - Optional slot for elements to the left of the icon (e.g., sidebar toggle)
 * @param {string} searchPlaceholder - Placeholder for the search input
 * @param {string} searchLabel - Optional label for the search input (defaults to "Search")
 * @param {string} searchValue - Current search value
 * @param {function} onSearchChange - Change handler for search
 * @param {React.ReactNode} filters - Slot for filter controls (e.g., segmented toggles)
 * @param {React.ReactNode} actions - Slot for action buttons (e.g., Add, Export, Refresh)
 */
export default function PageHeader({
  icon,
  title,
  description,
  leftAction,
  searchPlaceholder,
  searchLabel = "Search",
  searchValue,
  onSearchChange,
  filters,
  actions,
  extraChips, // Optional array of { label, value, onClear }
}) {
  return (
    <div className="border-b border-gray-100 bg-gray-50/50 p-6 rounded-t-brand select-none">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          {leftAction}
          
          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
              <i className={`ph-duotone ${icon} text-2xl`}></i>
            </div>
          )}
          
          <div>
            <CardTitle className="flex items-center gap-2 text-xl leading-none font-black tracking-tight text-gray-900 uppercase">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="mt-1.5 text-sm font-medium text-gray-500">
                {description}
              </CardDescription>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end lg:flex-1 lg:justify-end">
          {/* Filters & Search */}
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-end">
            {filters}
            
            {(onSearchChange || searchValue !== undefined) && (
              <div className="w-full sm:w-64">
                <div className="mb-1 flex items-center justify-between">
                  <label className="mb-1 block text-[10px] font-bold text-gray-700 uppercase tracking-wide">
                    {searchLabel}
                  </label>
                </div>
                <div className="relative">
                  <i className="ph-bold ph-magnifying-glass absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"></i>
                  <Input
                    placeholder={searchPlaceholder || "Search..."}
                    className="h-10 rounded-brand border border-gray-300 bg-white pl-9 text-sm focus-visible:border-gray-300 focus-visible:ring-pup-maroon"
                    value={searchValue || ""}
                    onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
