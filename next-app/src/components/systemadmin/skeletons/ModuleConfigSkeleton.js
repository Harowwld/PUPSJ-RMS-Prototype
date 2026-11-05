"use client"

import { Fragment, useEffect, useRef, useState } from "react"
import { Building01Icon, TableIcon } from "hugeicons-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table } from "@/components/ui/table"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import PageHeader from "@/components/shared/PageHeader"
import { cn } from "@/lib/utils"

function Placeholder({ className }) {
  return <Skeleton aria-hidden="true" className={cn("dark:bg-muted", className)} />
}

function DepartmentSelectorSkeleton() {
  return (
    <div className="border-b border-border bg-gray-50/40 p-5 dark:bg-zinc-900/30">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-300">Select Department</span>
            <Placeholder className="h-3 w-6 rounded" />
            <Placeholder className="hidden h-3 w-52 rounded sm:block" />
          </div>
        </div>
        <div className="flex items-stretch gap-3 overflow-hidden pb-2 pt-0.5">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex w-[240px] min-w-[240px] flex-col justify-between gap-3 rounded-xl border border-border bg-white p-4 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Placeholder className="h-9 w-9 shrink-0 rounded-full" />
                  <div className="space-y-1.5">
                    <Placeholder className="h-3 w-16 rounded" />
                    <Placeholder className="h-2.5 w-12 rounded" />
                  </div>
                </div>
                <Placeholder className="h-5 w-10 shrink-0 rounded-full" />
              </div>
              <div className="border-t border-border/40 pt-2">
                <Placeholder className="h-3 w-36 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function FeatureCardSkeleton() {
  return (
    <div className="flex min-h-[172px] flex-col justify-between gap-4 rounded-2xl border border-border bg-white p-4 dark:bg-zinc-900">
      <div>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Placeholder className="h-8 w-8 shrink-0 rounded-full" />
            <div className="space-y-1.5">
              <Placeholder className="h-3.5 w-28 rounded" />
              <Placeholder className="h-2.5 w-36 rounded" />
            </div>
          </div>
          <Placeholder className="h-5 w-12 shrink-0 rounded-full" />
        </div>
        <div className="space-y-1.5">
          <Placeholder className="h-3 w-full rounded" />
          <Placeholder className="h-3 w-3/4 rounded" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <Placeholder className="h-3 w-32 rounded" />
        <Placeholder className="h-6 w-11 rounded-full" />
      </div>
    </div>
  )
}

function FeatureGroupSkeleton({ label }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2.5">
          <Placeholder className="h-7 w-7 rounded-full" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-50">{label}</h4>
              <Placeholder className="h-4 w-16 rounded-full" />
            </div>
            <Placeholder className="h-2.5 w-72 max-w-full rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Placeholder className="h-7 w-24 rounded-lg" />
          <Placeholder className="h-7 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => <FeatureCardSkeleton key={index} />)}
      </div>
    </section>
  )
}

function DepartmentViewSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col">
      <DepartmentSelectorSkeleton />
      <div className="flex flex-[1_0_auto] flex-col bg-white dark:bg-card">
        <div className="flex flex-col justify-between gap-4 border-b border-border bg-gray-50/40 p-5 dark:bg-zinc-950/20 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <Placeholder className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2"><Placeholder className="h-4 w-52 max-w-full rounded" /><Placeholder className="h-5 w-14 rounded-full" /></div>
              <Placeholder className="h-3 w-72 max-w-full rounded" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Placeholder className="h-9 w-32 rounded-xl" />
            <Placeholder className="h-9 w-28 rounded-xl" />
          </div>
        </div>
        <div className="flex flex-[1_0_auto] flex-col gap-8 p-6">
          <FeatureGroupSkeleton label="Supervisor & Department Head Tools" />
          <FeatureGroupSkeleton label="Staff & Frontline Tools" />
        </div>
      </div>
    </div>
  )
}

function MatrixViewSkeleton({ groupBy, officeCount }) {
  const viewportRef = useRef(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  useEffect(() => {
    const element = viewportRef.current
    if (!element) return
    const measure = () => setViewportWidth(element.clientWidth)
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    observer?.observe(element)
    window.addEventListener("resize", measure, { passive: true })
    measure()
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])
  const featureWidth = Math.max(420, Math.min(viewportWidth * 0.6, viewportWidth - officeCount * 180))
  const officeWidth = Math.max(180, (viewportWidth - featureWidth) / officeCount)
  const columns = Array.from({ length: officeCount }, () => ({ kind: "category", width: officeWidth }))
  const groups = groupBy === "none" ? [null] : groupBy === "required" ? ["Required System Features", "Optional Features"] : ["Supervisor & Department Head Tools", "Staff & Frontline Tools"]
  return (
    <div ref={viewportRef} className="w-full flex-[1_0_auto] overflow-x-auto show-scrollbar pb-2">
      <Table layout="matrix" columns={[{ kind: "text", width: featureWidth, maxWidth: featureWidth }, ...columns]}>
        <thead className="sticky top-0 z-20 border-b border-border bg-gray-50/90 dark:bg-zinc-900/90">
          <tr>
            <th className="sticky left-0 z-30 min-w-[420px] bg-gray-50/95 p-4 pl-6 text-left text-xs font-semibold dark:bg-zinc-900/95">System Feature</th>
            {columns.map((_, index) => <th key={index} className="min-w-[150px] p-4 text-center"><Placeholder className="mx-auto h-3.5 w-20 rounded" /></th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white dark:divide-border dark:bg-card">
          {groups.map((group, groupIndex) => <Fragment key={groupIndex}>
            {group && <tr className="bg-gray-100/70 dark:bg-zinc-950/60"><td colSpan={officeCount + 1} className="border-y border-border/50 px-6 py-2.5 text-xs font-semibold text-gray-800 dark:text-zinc-200">{group} <Placeholder className="ml-2 inline-block h-3 w-5 rounded align-middle" /></td></tr>}
            {Array.from({ length: group ? 3 : 6 }, (_, rowIndex) => <tr key={rowIndex}>
              <td className="sticky left-0 z-10 min-w-[420px] border-r border-border bg-white p-4 pl-6 dark:bg-zinc-900/95">
                <div className="flex min-w-0 items-start gap-3">
                  <Placeholder className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-3"><Placeholder className="h-3.5 w-32 max-w-[45%] rounded" /><div className="flex min-w-0 max-w-[55%] items-center gap-2"><Placeholder className="h-4 w-14 shrink-0 rounded-full" /><Placeholder className="h-3 w-32 max-w-full rounded" /></div></div>
                    <Placeholder className="h-3 w-64 max-w-full rounded" />
                  </div>
                </div>
              </td>
              {columns.map((_, columnIndex) => <td key={columnIndex} className="min-w-[150px] p-4 text-center"><Placeholder className="mx-auto h-5 w-9 rounded-full" /></td>)}
            </tr>)}
          </Fragment>)}
        </tbody>
      </Table>
    </div>
  )
}

export default function ModuleConfigSkeleton({ viewMode = "office", officeFilter = "Active", groupBy = "category", officeCount = 4 }) {
  const visibleOfficeCount = Math.max(1, officeCount)
  return (
    <div className="flex w-full flex-[1_0_auto] flex-col gap-6 font-jakarta animate-fade-up select-none">
      <Card className="isolate flex h-auto w-full flex-[1_0_auto] flex-col gap-0 overflow-visible rounded-2xl border border-border bg-white p-0 shadow-sm dark:bg-card dark:shadow-none">
        <PageHeader
          title={<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><span>Department Features &amp; Permissions</span><Placeholder className="h-3.5 w-44 rounded" /></div>}
          description="Turn system features on or off for each department."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={<Placeholder className="h-9 w-9 shrink-0 rounded-xl" />}
        />
        <div aria-hidden="true" className="flex items-center justify-between gap-4 overflow-x-auto border-b border-border/80 px-6 py-2.5 bg-gray-50/40 dark:bg-zinc-900/30 scrollbar-none dark:border-white/10">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08]">
            {["Active", "Archived"].map((label) => (
              <div key={label} className={cn("inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full", officeFilter === label ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400")}>
                <span>{label}</span>
                <Placeholder className="h-3 w-5 rounded-full" />
              </div>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] ml-auto">
            {[{ mode: "office", label: "By Department", icon: Building01Icon }, { mode: "matrix", label: "Compare Features", icon: TableIcon }].map(({ mode, label, icon: Icon }) => (
              <div key={mode} className={cn("inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold rounded-full", viewMode === mode ? "bg-white text-gray-950 dark:bg-zinc-800 dark:text-white shadow-xs" : "text-gray-500 dark:text-zinc-400")}>
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <DataViewToolbar label="Feature search and filters" className="gap-2 bg-gray-50/40 p-4 dark:bg-zinc-900/30 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="relative w-72 sm:w-80 shrink-0"><Placeholder className="h-9 w-full rounded-xl" /><Placeholder className="absolute right-2.5 top-1/2 h-3 w-6 -translate-y-1/2 rounded" /></div>
            {viewMode === "matrix" && <Placeholder className="h-9 w-[72px] shrink-0 rounded-xl" />}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Placeholder className="h-9 w-20 shrink-0 rounded-xl" />
            {viewMode === "matrix" && <><Placeholder className="h-9 w-36 shrink-0 rounded-xl" /><Placeholder className="h-9 w-32 shrink-0 rounded-xl" />{visibleOfficeCount > 1 && <Placeholder className="h-9 w-24 shrink-0 rounded-xl" />}</>}
          </div>
        </DataViewToolbar>
        <div className="flex flex-col justify-between gap-4 border-t border-border bg-gray-50/40 px-6 py-4 dark:bg-zinc-900/30 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3.5">
            <Placeholder className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Public Login Demo Accounts</span><span className="rounded-full border border-amber-200/60 bg-amber-100/80 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/30 dark:text-amber-300">Prototype Access</span></div>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Show or hide the 1-click demo persona switcher on the public login page. Disabling also blocks demo sign-in requests.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 self-end sm:self-center"><Placeholder className="h-4 w-14 rounded" /><Placeholder className="h-6 w-11 rounded-full" /></div>
        </div>
        <div aria-busy="true" className="flex flex-[1_0_auto] flex-col overflow-hidden border-t border-border bg-white dark:bg-card">
          {viewMode === "matrix" ? <MatrixViewSkeleton groupBy={groupBy} officeCount={visibleOfficeCount} /> : <DepartmentViewSkeleton />}
        </div>

      </Card>
    </div>
  )
}
