"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

export default function ModuleConfigTab({ showToast }) {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState({}) // { [officeId-moduleId]: boolean }

  const fetchMatrix = useCallback(async () => {
    try {
      const res = await fetch("/api/modules/matrix")
      const json = await res.json()
      if (res.ok && json.ok) {
        setMatrix(json.data)
      } else {
        showToast(json.error || "Failed to fetch module matrix", true)
      }
    } catch (err) {
      showToast("Network error fetching module matrix", true)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  const handleToggle = async (officeId, moduleId, currentEnabled, isSystem) => {
    if (isSystem) return

    const toggleKey = `${officeId}-${moduleId}`
    setToggling(prev => ({ ...prev, [toggleKey]: true }))

    try {
      // Find all currently enabled modules for this office
      const officeAssignments = matrix.assignments[officeId] || {}
      const currentEnabledIds = Object.keys(officeAssignments).filter(
        modId => officeAssignments[modId]?.enabled
      )

      let nextEnabledIds = []
      if (currentEnabled) {
        // Disable: remove it
        nextEnabledIds = currentEnabledIds.filter(id => id !== moduleId)
      } else {
        // Enable: add it
        nextEnabledIds = [...currentEnabledIds, moduleId]
      }

      // Also ensure system modules are in the list (since setOfficeModules replaces the set)
      matrix.modules.forEach(m => {
        if (m.is_system && !nextEnabledIds.includes(m.id)) {
          nextEnabledIds.push(m.id)
        }
      })

      const res = await fetch(`/api/offices/${officeId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleIds: nextEnabledIds }),
      })

      const json = await res.json()
      if (res.ok && json.ok) {
        showToast("Modules configuration updated")
        // Optimistically update local matrix state
        setMatrix(prev => {
          const nextAssignments = { ...prev.assignments }
          nextAssignments[officeId] = {
            ...nextAssignments[officeId],
            [moduleId]: {
              ...nextAssignments[officeId]?.[moduleId],
              enabled: !currentEnabled,
            },
          }
          return { ...prev, assignments: nextAssignments }
        })
      } else {
        showToast(json.error || "Failed to update module assignment", true)
      }
    } catch (err) {
      showToast("Network error toggling module", true)
    } finally {
      setToggling(prev => {
        const next = { ...prev }
        delete next[toggleKey]
        return next
      })
    }
  }

  const groupedModules = useMemo(() => {
    if (!matrix?.modules) return { admin: [], staff: [] }
    const admin = matrix.modules.filter(m => m.category === "admin")
    const staff = matrix.modules.filter(m => m.category === "staff")
    return { admin, staff }
  }, [matrix])

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48 rounded-md" />
        <Skeleton className="h-4 w-96 rounded-md" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  const { offices, modules } = matrix

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <PageHeader
        title="Module Config Matrix"
        description="Configure module visibility and operations dynamically per office partition."
      />

      <div className="overflow-x-auto rounded-2xl border border-gray-200/60 dark:border-white/5 bg-white/60 dark:bg-zinc-900/40 shadow-[0_4px_16px_rgba(0,0,0,0.02)] backdrop-blur-xs">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-200/80 dark:border-white/5 bg-gray-50/55 dark:bg-zinc-950/20">
              <th className="p-4 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider min-w-[280px]">
                Module Name & Description
              </th>
              {offices.map(o => (
                <th 
                  key={o.id}
                  className="p-4 text-xs font-bold text-center uppercase tracking-wider"
                  style={{ color: o.accent_color }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-[13px] font-extrabold">{o.short_name}</span>
                    <span className="text-[9px] text-gray-400 dark:text-zinc-500 mt-[2px]">{o.status}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {/* Admin Modules Header */}
            <tr className="bg-gray-100/50 dark:bg-zinc-950/30">
              <td 
                colSpan={offices.length + 1}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400"
              >
                Administrator Tools & Operations
              </td>
            </tr>

            {groupedModules.admin.map(m => (
              <ModuleRow
                key={m.id}
                m={m}
                offices={offices}
                assignments={matrix.assignments}
                toggling={toggling}
                onToggle={handleToggle}
              />
            ))}

            {/* Staff Modules Header */}
            <tr className="bg-gray-100/50 dark:bg-zinc-950/30">
              <td 
                colSpan={offices.length + 1}
                className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400"
              >
                Staff Workspace & Digitization Modules
              </td>
            </tr>

            {groupedModules.staff.map(m => (
              <ModuleRow
                key={m.id}
                m={m}
                offices={offices}
                assignments={matrix.assignments}
                toggling={toggling}
                onToggle={handleToggle}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ModuleRow({ m, offices, assignments, toggling, onToggle }) {
  return (
    <tr className="hover:bg-gray-50/30 dark:hover:bg-white/2 transition-colors duration-150">
      <td className="p-4 align-top">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-7 w-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-500 dark:text-zinc-400">
            <i className={cn(m.icon || "ti ti-cube", "text-base")}></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-900 dark:text-zinc-50">{m.name}</span>
              {Boolean(m.is_system) && (
                <span className="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[4px] tracking-wide">
                  System
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-lg leading-normal">
              {m.description || "No description provided."}
            </p>
          </div>
        </div>
      </td>

      {offices.map(o => {
        const toggleKey = `${o.id}-${m.id}`
        const isToggling = toggling[toggleKey]
        const enabled = Boolean(assignments[o.id]?.[m.id]?.enabled) || Boolean(m.is_system)
        const isSystem = Boolean(m.is_system)

        return (
          <td key={o.id} className="p-4 text-center align-middle">
            <div className="inline-flex items-center justify-center">
              {isToggling ? (
                <div className="w-9 h-5 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={enabled} 
                    disabled={isSystem}
                    onChange={() => onToggle(o.id, m.id, enabled, isSystem)}
                    className="sr-only peer"
                  />
                  <div className={cn(
                    "w-9 h-5 bg-gray-200 peer-focus:outline-hidden dark:bg-zinc-700 rounded-full peer",
                    "peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:bg-zinc-900 dark:after:border-zinc-700",
                    isSystem 
                      ? "peer-checked:bg-blue-400 opacity-60 cursor-not-allowed"
                      : "peer-checked:bg-slate-900 dark:peer-checked:bg-zinc-100"
                  )}></div>
                </label>
              )}
            </div>
          </td>
        )
      })}
    </tr>
  )
}
