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

export default function SecurityQuestionsTab({
  loading,
  securityQuestions,
  setSecurityQuestions,
  securitySaving,
  handleSaveSecurityQuestions,
}) {
  // Determine how many questions to show initially
  // We show at least 2, and then any that have content
  const [visibleCount, setVisibleCount] = useState(2)

  useEffect(() => {
    if (securityQuestions) {
      const lastFilledIndex = securityQuestions.findLastIndex(q => q && q.trim() !== "")
      setVisibleCount(Math.max(2, lastFilledIndex + 1))
    }
  }, [securityQuestions])

  const handleAddQuestion = () => {
    if (visibleCount < 5) {
      setVisibleCount(prev => prev + 1)
    }
  }

  const handleRemoveQuestion = (index) => {
    if (visibleCount > 2) {
      const updated = [...securityQuestions]
      updated[index] = ""
      // Shift questions up
      const shifted = updated.filter((_, i) => i !== index)
      shifted.push("")
      setSecurityQuestions(shifted)
      setVisibleCount(prev => prev - 1)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 font-inter">
      {loading ? (
        <div className="space-y-4 rounded-brand border border-gray-300 bg-white p-6 shadow-sm">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <Card className="flex flex-1 flex-col overflow-hidden rounded-brand border border-gray-300 bg-white shadow-sm">
          <div className="flex shrink-0 flex-col items-center justify-between gap-4 rounded-t-brand border-b border-gray-100 bg-gray-50/50 p-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-pup-maroon shadow-sm">
                <i className="ph-duotone ph-lock-key text-2xl"></i>
              </div>
              <div>
                <CardTitle className="text-xl leading-none font-black tracking-tight text-gray-900">
                  Global Security Questions
                </CardTitle>
                <CardDescription className="mt-1.5 text-sm font-medium text-gray-500">
                  Define verification challenges for personnel account recovery and setup.
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleSaveSecurityQuestions}
              disabled={securitySaving}
              className="flex h-10 w-full items-center gap-2 bg-linear-to-b from-red-800 to-pup-maroon border-4 border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md px-6 font-black text-white shadow-sm active:scale-95 sm:w-auto transition-all"
            >
              <i className={`ph-bold ${securitySaving ? "ph-spinner animate-spin" : "ph-check"}`}></i>
              {securitySaving ? "SAVING..." : "SAVE QUESTIONS"}
            </Button>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl space-y-8">
              <div className="grid grid-cols-1 gap-6">
                {securityQuestions.slice(0, visibleCount).map((q, i) => (
                  <div key={i} className="group animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-[10px] font-black text-gray-500 transition-colors group-focus-within:border-red-100 group-focus-within:bg-red-50 group-focus-within:text-pup-maroon">
                          {i + 1}
                        </span>
                        <label className="text-[11px] font-black tracking-widest text-gray-500 uppercase transition-colors group-focus-within:text-gray-900">
                          Security Challenge Question{" "}
                          {i < 2 ? (
                            <span className="text-pup-maroon">*</span>
                          ) : (
                            <span className="ml-1 text-gray-400 normal-case">(Optional)</span>
                          )}
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        {q && q.trim().length > 0 && (
                          <div className="flex items-center gap-1.5">
                            {q.trim().length < 10 || new Set(q.toLowerCase().replace(/\s/g, "")).size < 5 ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase tracking-tight">
                                    <i className="ph-bold ph-warning-circle text-xs"></i>
                                    Weak Challenge
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-amber-50 text-amber-900 border-amber-200">
                                  <p className="text-[10px] font-bold uppercase">
                                    Question must be at least 10 chars and meaningful.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-tight">
                                <i className="ph-bold ph-check-circle text-xs"></i>
                                Strong
                              </span>
                            )}
                          </div>
                        )}
                        {i >= 2 && (
                          <button
                            onClick={() => handleRemoveQuestion(i)}
                            className="text-[10px] font-bold text-gray-400 hover:text-red-600 transition-colors uppercase"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <Input
                      type="text"
                      placeholder="e.g. What was the name of your first elementary school?"
                      className={`h-12 rounded-brand border bg-white text-sm shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-pup-maroon ${
                        q && q.trim().length > 0 && (q.trim().length < 10 || new Set(q.toLowerCase().replace(/\s/g, "")).size < 5)
                          ? "border-amber-200 focus-visible:border-amber-500 focus-visible:ring-amber-500"
                          : "border-gray-300"
                      }`}
                      value={q}
                      onChange={(e) => {
                        const updated = [...securityQuestions]
                        updated[i] = e.target.value
                        setSecurityQuestions(updated)
                      }}
                    />
                  </div>
                ))}

                {visibleCount < 5 && (
                  <button
                    onClick={handleAddQuestion}
                    className="flex w-fit items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-3 text-xs font-bold text-gray-500 transition-all hover:border-gray-300 hover:bg-red-50/30 hover:text-pup-maroon"
                  >
                    <i className="ph-bold ph-plus"></i>
                    ADD ANOTHER QUESTION
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
