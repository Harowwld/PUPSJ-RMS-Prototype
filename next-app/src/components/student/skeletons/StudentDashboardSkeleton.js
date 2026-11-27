"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import StudentRequestsTableSkeleton from "./StudentRequestsTableSkeleton"
import StudentOsasProposalsSkeleton from "./StudentOsasProposalsSkeleton"
import StudentComplianceSkeleton from "./StudentComplianceSkeleton"
import StudentOverviewSkeleton from "./StudentOverviewSkeleton"
import StudentActivitySkeleton from "./StudentActivitySkeleton"

function StudentSettingsSkeleton() {
  return (
    <Card className="flex flex-[1_0_auto] flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none min-h-[600px] isolate font-jakarta select-none">
      <div className="p-6 border-b border-border dark:border-border flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="w-44 h-6 rounded-md dark:bg-muted" />
          <Skeleton className="w-72 h-4 rounded dark:bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] flex-1">
        <div className="p-3 sm:p-4 border-b lg:border-b-0 lg:border-r border-border dark:border-border/60 space-y-3 bg-gray-50/50 dark:bg-zinc-900/40">
          <div className="px-3 pt-1">
            <Skeleton className="w-16 h-3 rounded dark:bg-muted" />
          </div>
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-10 rounded-xl dark:bg-muted" />
            ))}
          </div>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-1.5">
            <Skeleton className="w-32 h-6 rounded dark:bg-muted" />
            <Skeleton className="w-80 h-4 rounded dark:bg-muted" />
          </div>
          <Skeleton className="w-full h-36 rounded-2xl dark:bg-muted" />
          <Skeleton className="w-full h-32 rounded-xl dark:bg-muted" />
          <Skeleton className="w-full h-32 rounded-xl dark:bg-muted" />
        </div>
      </div>
    </Card>
  )
}

export default function StudentDashboardSkeleton({ view = "overview" }) {
  const activeView = view || "overview"

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-slate-50/30 font-jakarta dark:bg-zinc-950/30 select-none">
      {/* Shared dashboard liquid-gradient background */}
      <div className="liquid-container pointer-events-none opacity-20 dark:opacity-10">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      {/* Main Body with Sidebar + Main Workspace */}
      <div className="flex-1 h-full w-full flex min-h-0 overflow-hidden flex-col md:flex-row">
        {/* Mobile Top Bar Skeleton (< md) — shared Sidebar renders this in place of a page header */}
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

        {/* Sidebar Skeleton — mirrors shared Sidebar: logo row, command palette, nav, feedback card, profile */}
        <aside className="hidden md:flex sticky top-0 h-full w-[275px] shrink-0 flex-col overflow-hidden bg-white/25 px-3 py-3 backdrop-blur-xl dark:bg-zinc-950/25">
          {/* 1. Top Row: Logo + Collapse Button */}
          <div className="mb-4 flex h-[40px] w-full shrink-0 items-center justify-between px-1">
            <div className="flex items-center min-w-0">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                <Skeleton className="h-[22px] w-[22px] shrink-0 rounded dark:bg-muted" />
              </div>
              <Skeleton className="ml-1.5 h-4 w-[88px] rounded dark:bg-muted" />
            </div>
            <Skeleton className="h-[34px] w-[34px] shrink-0 rounded-lg dark:bg-muted" />
          </div>

          {/* 2. Command Palette Trigger */}
          <div className="mb-2 w-full shrink-0">
            <div className="flex h-[38px] w-full items-center justify-between rounded-xl border border-black/[0.06] bg-black/[0.04] pl-1 pr-2.5 dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-center min-w-0">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                  <Skeleton className="h-4 w-4 shrink-0 rounded dark:bg-muted" />
                </div>
                <Skeleton className="ml-1.5 h-3.5 w-[130px] rounded dark:bg-muted" />
              </div>
              <Skeleton className="h-5 w-8 rounded-full dark:bg-muted" />
            </div>
          </div>

          {/* 3. Navigation Items */}
          <div className="flex min-h-0 w-full flex-1 flex-col gap-[2px] overflow-y-auto pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {/* Overview item */}
            <div className="flex h-[40px] w-full shrink-0 items-center rounded-xl px-1">
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                <Skeleton className="h-[21px] w-[21px] shrink-0 rounded dark:bg-muted" />
              </div>
              <Skeleton className="ml-1.5 h-3.5 w-[84px] rounded dark:bg-muted" />
            </div>

            {/* Section header: Academic Records */}
            <div className="mb-1 mt-3 flex h-[22px] shrink-0 items-center px-2">
              <Skeleton className="h-2.5 w-[116px] rounded dark:bg-muted" />
            </div>

            {/* Document Requests */}
            <div className="flex h-[40px] w-full shrink-0 items-center justify-between rounded-xl px-1">
              <div className="flex items-center min-w-0">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                  <Skeleton className="h-[21px] w-[21px] shrink-0 rounded dark:bg-muted" />
                </div>
                <Skeleton className="ml-1.5 h-3.5 w-[134px] rounded dark:bg-muted" />
              </div>
              <Skeleton className="mr-1 h-4 w-4 rounded-full dark:bg-muted" />
            </div>

            {/* Document Checklist */}
            <div className="flex h-[40px] w-full shrink-0 items-center justify-between rounded-xl px-1">
              <div className="flex items-center min-w-0">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                  <Skeleton className="h-[21px] w-[21px] shrink-0 rounded dark:bg-muted" />
                </div>
                <Skeleton className="ml-1.5 h-3.5 w-[134px] rounded dark:bg-muted" />
              </div>
              <Skeleton className="mr-1 h-4 w-4 rounded-full dark:bg-muted" />
            </div>

            {/* Section header: Student Affairs */}
            <div className="mb-1 mt-3 flex h-[22px] shrink-0 items-center px-2">
              <Skeleton className="h-2.5 w-[108px] rounded dark:bg-muted" />
            </div>

            {/* OSAS Submissions */}
            <div className="flex h-[40px] w-full shrink-0 items-center justify-between rounded-xl px-1">
              <div className="flex items-center min-w-0">
                <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                  <Skeleton className="h-[21px] w-[21px] shrink-0 rounded dark:bg-muted" />
                </div>
                <Skeleton className="ml-1.5 h-3.5 w-[124px] rounded dark:bg-muted" />
              </div>
            </div>
          </div>

          {/* 4. Bottom: Feedback Card + Profile Menu */}
          <div className="mt-auto flex w-full shrink-0 flex-col">
            <div className="w-full shrink-0 pb-2">
              <div className="mx-1 overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton className="h-[18px] w-[68px] rounded-full dark:bg-muted" />
                  <Skeleton className="size-6 rounded-full dark:bg-muted" />
                </div>
                <div className="mb-2 space-y-1.5">
                  <Skeleton className="h-3.5 w-[136px] rounded dark:bg-muted" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-4 w-10 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-2.5 w-full rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-4/5 rounded dark:bg-muted" />
                </div>
                <div className="flex items-center justify-center gap-1.5 py-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="size-5 rounded dark:bg-muted" />
                  ))}
                </div>
                <Skeleton className="mt-1 h-8 w-full rounded-xl dark:bg-muted" />
              </div>
            </div>

            <div className="flex w-full shrink-0 justify-center border-t border-gray-200/80 pt-2 dark:border-white/10">
              <div className="flex w-full items-center rounded-full border border-black/[0.06] bg-black/[0.02] p-1 sm:pr-3 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex h-9 w-[38px] shrink-0 items-center justify-center">
                  <Skeleton className="size-8 shrink-0 rounded-full dark:bg-muted" />
                </div>
                <div className="ml-2 flex min-w-0 flex-1 flex-col gap-1 leading-tight">
                  <Skeleton className="h-3 w-[104px] rounded dark:bg-muted" />
                  <Skeleton className="h-2.5 w-[64px] rounded dark:bg-muted" />
                </div>
                <Skeleton className="mr-1 ml-1 h-3.5 w-3.5 shrink-0 rounded dark:bg-muted" />
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Skeleton Area — matches student/page.js main layout */}
        <main className="relative w-full min-w-0 min-h-0 flex-1 overflow-y-auto bg-white dark:bg-zinc-950/50 flex flex-col">
          <div className="p-2 md:pl-1 flex flex-[1_0_auto] min-h-full flex-col w-full">
            <div className="w-full flex flex-[1_0_auto] flex-col [&>*]:flex-[1_0_auto]">
              {activeView === "osas" ? (
                <StudentOsasProposalsSkeleton />
              ) : activeView === "compliance" ? (
                <StudentComplianceSkeleton />
              ) : activeView === "odrs" ? (
                <StudentRequestsTableSkeleton />
              ) : activeView === "activity" ? (
                <StudentActivitySkeleton />
              ) : activeView === "settings" ? (
                <StudentSettingsSkeleton />
              ) : (
                <StudentOverviewSkeleton />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

