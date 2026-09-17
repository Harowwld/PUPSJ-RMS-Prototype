"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function ScanUploadSkeleton() {
  return (
    <div className="flex flex-col gap-6 h-auto lg:flex-row lg:items-stretch animate-fade-up font-jakarta select-none">
      {/* Left Column: Dropzone & Document Canvas Preview */}
      <section className="w-full lg:w-[48%] flex min-h-[580px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
          <Skeleton className="h-4 w-32 rounded dark:bg-muted" />
          <Skeleton className="h-4 w-20 rounded dark:bg-muted" />
        </div>

        {/* Dropzone Canvas Placeholder */}
        <div className="flex-1 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 p-8 flex flex-col items-center justify-center dark:border-zinc-800 dark:bg-zinc-900/40">
          <Skeleton className="h-14 w-14 rounded-2xl dark:bg-muted mb-4" />
          <Skeleton className="h-4 w-48 rounded dark:bg-muted mb-2" />
          <Skeleton className="h-3 w-64 rounded dark:bg-muted mb-6" />
          <Skeleton className="h-9 w-40 rounded-xl dark:bg-muted" />
        </div>
      </section>

      {/* Right Column: Metadata Form Fields */}
      <section className="w-full lg:w-[52%] flex min-h-[580px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
            <div>
              <Skeleton className="h-5 w-40 rounded dark:bg-muted" />
              <Skeleton className="h-3 w-56 rounded dark:bg-muted mt-1.5" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full dark:bg-muted" />
          </div>

          <div className="space-y-4">
            {/* Student Number & Name */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
            </div>

            {/* Program & Year */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
              </div>
            </div>

            {/* Storage Location: Room, Cabinet, Drawer */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16 rounded dark:bg-muted" />
                <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
              </div>
            </div>

            {/* Document Type */}
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded dark:bg-muted" />
              <Skeleton className="h-10 w-full rounded-lg dark:bg-muted" />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Skeleton className="h-11 w-full rounded-xl dark:bg-muted mt-6" />
      </section>
    </div>
  )
}
