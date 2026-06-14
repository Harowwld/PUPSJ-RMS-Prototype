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
              titleClassName="text-[15px]"
              title="Security Questions"
              description="Define verification challenges for personnel account recovery and setup."
              actions={
                <Button
                  onClick={handleSaveSecurityQuestions}
                  disabled={securitySaving}
                  className="btn-brand-red active:scale-95 sm:w-auto transition-all dark:shadow-none"
                >
                  <i className={`ph-bold ${securitySaving ? "ph-spinner animate-spin" : "ph-check"} mr-1.5`}></i>
                  {securitySaving ? "Saving..." : "Save Questions"}
                </Button>
              }
              className="p-0"
            />
          </div>

          <div className="max-w-4xl mt-2">
            <div className="flex flex-col gap-[20px]">
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
                    className={`mt-[4px] h-[36px] rounded-[8px] border-[0.5px] bg-white text-[13px] font-normal text-[#111111] dark:text-zinc-100 px-[12px] transition-all focus-visible:ring-0 focus-visible:border-black/35 dark:focus-visible:border-white/35 ${ q && q.trim().length > 0 && (q.trim().length < 10 || new Set(q.toLowerCase().replace(/\s/g, "")).size < 5) ? "border-amber-300 dark:border-amber-600" : "border-black/15 dark:border-white/15" } dark:bg-card`}
                    value={q}
                    onChange={(e) => {
                      const updated = [...securityQuestions]
                      updated[i] = e.target.value
                      setSecurityQuestions(updated)
                    }}
                  />
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="mt-[8px] flex h-[36px] w-fit items-center rounded-[8px] border-[0.5px] border-black/15 bg-transparent px-[16px] text-[13px] font-normal text-[#8E8E93] transition-colors hover:text-[#111111] hover:border-black/30 dark:hover:text-zinc-200 dark:hover:border-white/30 cursor-pointer"
              >
                <i className="ph-bold ph-plus text-[13px] text-[#8E8E93]"></i>
                <span className="ml-[6px]">Add another question</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}



