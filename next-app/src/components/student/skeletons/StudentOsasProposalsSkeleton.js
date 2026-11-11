"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StudentOsasProposalsListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3 select-none font-jakarta animate-in fade-in duration-200">
      {Array.from({ length: count }).map((_, i) => (
        <article
          key={i}
          className="rounded-xl border border-border bg-white p-4 shadow-2xs dark:border-border dark:bg-card"
        >
          {/* Row 1: Title + Status Badge + PDF Action Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Skeleton
              className={cn(
                "h-4 rounded dark:bg-muted",
                i % 3 === 0 ? "w-56" : i % 2 === 0 ? "w-64" : "w-48"
              )}
            />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-full dark:bg-muted" />
              <Skeleton className="h-7 w-7 rounded-lg dark:bg-muted" />
            </div>
          </div>

          {/* Row 2: Organization · Event Date + Post-Event status/link */}
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
              <span className="text-gray-300 dark:text-zinc-700">·</span>
              <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32 rounded-full dark:bg-muted" />
              <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
            </div>
          </div>

          {/* Row 3: Latest Update Metadata, Message Preview, and View Full Timeline CTA */}
          <div className="mt-3 border-t border-border/70 pt-3 dark:border-border/70">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-40 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-28 rounded dark:bg-muted tabular-nums" />
            </div>
            <Skeleton
              className={cn(
                "mt-1.5 h-3.5 rounded dark:bg-muted",
                i % 2 === 0 ? "w-4/5" : "w-3/5"
              )}
            />
            <div className="mt-2.5 flex justify-end">
              <Skeleton className="h-3.5 w-28 rounded dark:bg-muted" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function StudentOsasProposalsSkeleton({ count = 3, showForm = true }) {
  return (
    <div className="flex flex-col w-full flex-[1_0_auto] animate-in fade-in duration-200 select-none font-jakarta">
      {/* ONE Single Card Container encapsulating Header, Stream Switcher, Inline Proposal Form, Toolbar & Proposals List */}
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate">
        {/* 1. Page Header Skeleton (matches PageHeader with Organization Selector Pill + RefreshButton) */}
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <Skeleton className="h-5 w-52 sm:w-64 rounded-md dark:bg-muted" />
              <Skeleton className="h-3.5 w-36 rounded dark:bg-muted" />
            </div>
            <Skeleton className="mt-[4px] h-3.5 w-72 sm:w-96 max-w-full rounded dark:bg-muted" />
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Organization Selector Pill Skeleton */}
            <div className="inline-flex items-center gap-2 h-10 pl-1.5 pr-3 rounded-full border border-border/80 bg-[#f8f9fa] dark:bg-zinc-900/80">
              <Skeleton className="size-7 rounded-full dark:bg-muted shrink-0" />
              <Skeleton className="h-3.5 w-28 sm:w-36 rounded dark:bg-muted" />
            </div>
            <Skeleton className="h-9 w-9 rounded-xl dark:bg-muted shrink-0" />
            {!showForm && <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted shrink-0" />}
          </div>
        </div>

        {/* 2. OSAS Stream Switcher (3-tab SegmentedControl) */}
        <div className="border-t border-b border-border/80 bg-white dark:bg-card px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-grid grid-flow-col auto-cols-fr items-center gap-1 p-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)] shrink-0">
            <Skeleton className="h-7 w-32 rounded-full bg-white dark:bg-zinc-800 shadow-xs" />
            <Skeleton className="h-7 w-40 rounded-full bg-transparent dark:bg-transparent" />
            <Skeleton className="h-7 w-36 rounded-full bg-transparent dark:bg-transparent" />
          </div>
        </div>

        {/* 3. Organization Status Strip + Inline Proposal Form Skeleton */}
        {showForm && (
          <div className="flex flex-col">
            {/* Organization Status Banner */}
            <div className="px-5 sm:px-6 py-3 border-b bg-blue-50/70 dark:bg-blue-500/5 border-blue-200/50 dark:border-blue-500/10 flex items-center gap-2.5">
              <Skeleton className="size-4 rounded-full dark:bg-muted shrink-0" />
              <Skeleton className="h-3.5 w-full max-w-2xl rounded dark:bg-muted" />
            </div>

            <div className="p-5 sm:p-6 bg-gray-50/40 dark:bg-zinc-900/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                    <Skeleton className="h-3 w-12 rounded dark:bg-muted" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
              </div>

              {/* Proposal PDF Dropzone Skeleton */}
              <div className="mt-4 space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded dark:bg-muted" />
                <div className="rounded-xl border border-dashed border-border dark:border-border bg-white/60 dark:bg-zinc-900/40 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="size-9 rounded-xl dark:bg-muted shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <Skeleton className="h-3.5 w-48 sm:w-64 rounded dark:bg-muted" />
                      <Skeleton className="h-3 w-36 rounded dark:bg-muted" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24 rounded-xl dark:bg-muted shrink-0" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
                <Skeleton className="h-3.5 w-64 sm:w-80 rounded dark:bg-muted" />
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Skeleton className="h-9 w-16 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-9 w-36 rounded-xl dark:bg-muted" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Canonical 2-Zone DataViewToolbar Skeleton */}
        <div className="border-t border-border dark:border-border px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-card">
          <Skeleton className="h-9 w-72 sm:w-80 shrink-0 rounded-xl dark:bg-muted" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-28 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
            <Skeleton className="h-9 w-24 rounded-xl dark:bg-muted" />
          </div>
        </div>

        {/* 5. Proposals List Skeleton */}
        <div className="border-t border-border dark:border-border flex-1 p-5">
          <StudentOsasProposalsListSkeleton count={count} />
        </div>
      </Card>
    </div>
  );
}
