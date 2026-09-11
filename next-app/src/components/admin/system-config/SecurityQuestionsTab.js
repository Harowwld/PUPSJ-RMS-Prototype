import { useState, useEffect } from "react"
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import PageHeader from "@/components/shared/PageHeader"

export default function SecurityQuestionsTab({
  loading,
  securityQuestions,
  setSecurityQuestions,
  securitySaving,
  handleSaveSecurityQuestions,
}) {
  const handleAddQuestion = () => {
    setSecurityQuestions(prev => [...prev, ""])
  }

  const handleRemoveQuestion = (index) => {
    if (securityQuestions.length > 2) {
      setSecurityQuestions(prev => prev.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 font-inter animate-fade-up px-[28px] pb-[28px]">
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 mt-[20px]">
            <Skeleton className="h-12 w-12 rounded-xl dark:bg-muted" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 dark:bg-muted" />
              <Skeleton className="h-4 w-72 dark:bg-muted" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24 dark:bg-muted" />
                <Skeleton className="h-10 w-full dark:bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-[20px]">
            <PageHeader
              icon="ph-lock-key"
              showBorder={false}
              titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
              descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
              title="Security Questions"
              description="Define verification challenges for personnel account recovery and setup."
              actions={
                <Button
                  onClick={handleSaveSecurityQuestions}
                  disabled={securitySaving}
                  className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs px-5 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-xs border-0"
                >
                  {securitySaving && <i className="ph-bold ph-spinner animate-spin mr-1.5 text-xs"></i>}
                  {securitySaving ? "Saving..." : "Save"}
                </Button>
              }
              className="p-0"
            />
          </div>

          <div className="max-w-4xl mt-2">
            <div className="flex flex-col gap-5">
              {securityQuestions.map((q, i) => (
                <div key={i} className="group flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-[6px]">
                      <span className="text-[12px] font-medium text-[#8E8E93] select-none">
                        {i + 1}
                      </span>
                      <label className="text-[12px] font-medium text-[#8E8E93]">
                        Security Challenge Question
                        {i < 2 ? (
                          <span className="ml-[2px] text-[12px] font-normal text-[#E5484D]">*</span>
                        ) : (
                          <span className="ml-[6px] text-[12px] font-normal text-[#C7C7CC]">(Optional)</span>
                        )}
                      </label>
                    </div>
                    <div className="flex items-center gap-[12px]">
                      {q && q.trim().length > 0 && (
                        <div className="flex items-center">
                          {q.trim().length < 10 || new Set(q.toLowerCase().replace(/\s/g, "")).size < 5 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[12px] font-medium text-[#FF9500] cursor-help">
                                  Weak Challenge
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900/50">
                                <p className="text-[10px] font-semibold">
                                  Question must be at least 10 chars and meaningful.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-[12px] font-medium text-[#30D158]">
                              Strong
                            </span>
                          )}
                        </div>
                      )}
                      {i >= 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(i)}
                          className="text-[12px] font-normal text-[#8E8E93] hover:text-[#E5484D] transition-colors bg-transparent border-0 p-0 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <Input
                    type="text"
                    placeholder="e.g. What was the name of your first elementary school?"
                    className={`mt-1.5 h-10 rounded-xl border bg-white dark:bg-zinc-800 text-xs font-normal text-gray-900 dark:text-zinc-100 px-3 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs ${ q && q.trim().length > 0 && (q.trim().length < 10 || new Set(q.toLowerCase().replace(/\s/g, "")).size < 5) ? "border-amber-400 dark:border-amber-600" : "border-gray-200 dark:border-white/10" }`}
                    value={q}
                    onChange={(e) => {
                      const updated = [...securityQuestions]
                      updated[i] = e.target.value
                      setSecurityQuestions(updated)
                    }}
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddQuestion}
                className="mt-2 flex h-10 w-fit items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 px-4 text-xs font-semibold text-gray-700 dark:text-zinc-200 shadow-xs hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all"
              >
                Add
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}



