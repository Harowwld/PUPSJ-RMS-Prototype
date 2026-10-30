"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import PageHeader from "@/components/shared/PageHeader"

export default function SecurityQuestionsSkeleton() {
  return (
    <div className="flex flex-[1_0_auto] flex-col gap-6 w-full animate-fade-up font-jakarta select-none">
      <Card className="flex flex-[1_0_auto] h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-shield-check"
          title="Global Security Questions"
          description="Define institutional verification challenges for staff account recovery. Mark mandatory challenges as Required (minimum 10 characters)."
          showBorder={true}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-900 dark:text-zinc-300 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-32 rounded-xl dark:bg-muted" />
              <Skeleton className="h-10 w-36 rounded-xl dark:bg-muted" />
            </div>
          }
        />

        {/* Questions Form Area */}
        <div className="p-6 flex-[1_0_auto] flex flex-col space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border dark:border-border bg-gray-50/30 dark:bg-zinc-900/40 p-4 space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded-lg dark:bg-muted" />
                  <Skeleton className="h-4 w-24 rounded dark:bg-muted" />
                  <Skeleton className="h-5 w-16 rounded-full dark:bg-muted" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-36 rounded-xl dark:bg-muted" />
                  <Skeleton className="h-8 w-8 rounded-xl dark:bg-muted" />
                </div>
              </div>
              <Skeleton className="h-10.5 w-full rounded-xl dark:bg-muted" />
              <div className="flex justify-between items-center px-1">
                <Skeleton className="h-3.5 w-64 rounded dark:bg-muted" />
                <Skeleton className="h-3.5 w-14 rounded dark:bg-muted" />
              </div>
            </div>
          ))}

          {/* Add Question Button Skeleton */}
          <div className="pt-2">
            <Skeleton className="w-full h-12 rounded-xl dark:bg-muted" />
          </div>
        </div>
      </Card>
    </div>
  )
}
