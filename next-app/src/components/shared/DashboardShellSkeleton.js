"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useLayoutZoom } from "@/hooks/useLayoutZoom"

/**
 * Shell skeleton for dashboard pages that use the shared Sidebar layout.
 * Mirrors the Sidebar structure (logo row, command palette, nav sections,
 * profile row) without the removed page header.
 */
export default function DashboardShellSkeleton({ items = [], children }) {
  const { zoomStyle } = useLayoutZoom()

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-jakarta dark:bg-zinc-950/30 select-none">
      {/* Shared dashboard liquid-gradient background */}
      <div className="liquid-container pointer-events-none opacity-20 dark:opacity-10">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      {/* Main Body with Sidebar + Main Workspace (no page header in this layout) */}
      <div
        className="flex min-h-0 overflow-hidden flex-col md:flex-row"
        style={zoomStyle}
      >
        {/* Mobile Top Bar (< md) — shared Sidebar renders this in place of a page header */}
        <div className="md:hidden flex h-[52px] w-full shrink-0 items-center justify-between border-b border-gray-200/80 bg-white/80 px-3 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-lg dark:bg-muted" />
            <Skeleton className="h-[22px] w-[22px] rounded dark:bg-muted" />
            <Skeleton className="h-4 w-[88px] rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-9 w-9 rounded-lg dark:bg-muted" />
            <Skeleton className="h-8 w-8 rounded-full dark:bg-muted" />
          </div>
        </div>

        {/* Sidebar Skeleton — mirrors shared Sidebar */}
        <aside className="hidden md:flex sticky top-0 h-full w-[275px] shrink-0 flex-col overflow-hidden bg-white/25 px-3 py-3 backdrop-blur-xl dark:bg-zinc-950/25">
          {/* 1. Top Row: Logo + Collapse Button */}
          <div className="mb-4 flex h-[40px] w-full shrink-0 items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-[22px] w-[22px] shrink-0 rounded dark:bg-muted" />
              <Skeleton className="h-4 w-[88px] rounded dark:bg-muted" />
            </div>
            <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-lg dark:bg-muted" />
          </div>

          {/* 2. Command Palette Trigger */}
          <div className="mb-2 w-full shrink-0">
            <Skeleton className="h-[36px] w-full rounded-xl dark:bg-muted" />
          </div>

          {/* 3. Navigation Items */}
          <div className="flex min-h-0 w-full flex-1 flex-col gap-[2px] overflow-y-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((item, idx) => {
              if (item.type === "header") {
                return (
                  <div key={`header-${idx}`} className="mb-1 mt-3 h-[22px] shrink-0 px-2">
                    <Skeleton className="h-2.5 w-[124px] rounded dark:bg-muted" />
                  </div>
                )
              }

              return (
                <div
                  key={item.key}
                  className="flex h-[40px] w-full shrink-0 items-center gap-1.5 rounded-[8px] px-1"
                >
                  <Skeleton className="h-[21px] w-[21px] shrink-0 rounded dark:bg-muted" />
                  <Skeleton className="h-3.5 w-[140px] rounded dark:bg-muted" />
                </div>
              )
            })}
          </div>

          {/* 4. Bottom: Profile Menu */}
          <div className="mt-auto flex w-full shrink-0 justify-center border-t border-gray-200/80 pt-2 dark:border-white/10">
            <div className="flex w-full items-center gap-2.5 rounded-xl p-1.5">
              <Skeleton className="h-9 w-9 shrink-0 rounded-full dark:bg-muted" />
              <div className="flex min-w-0 flex-1 flex-col gap-1 leading-tight">
                <Skeleton className="h-3 w-[104px] rounded dark:bg-muted" />
                <Skeleton className="h-2.5 w-[76px] rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-3 w-3 shrink-0 rounded dark:bg-muted" />
            </div>
          </div>
        </aside>

        {/* Main Content Skeleton Area */}
        <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-white/25 dark:bg-zinc-950/25 backdrop-blur-xs flex flex-col">
          <div className="flex w-full flex-[1_0_auto] flex-col p-4 md:pl-0 [&>*]:flex-[1_0_auto]">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
