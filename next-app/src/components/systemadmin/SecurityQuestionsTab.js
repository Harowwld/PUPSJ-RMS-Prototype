"use client"
import { Reorder } from "framer-motion";

import HugeIcon from "@/components/shared/HugeIcon";
import React, { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export default function SecurityQuestionsTab({ showToast }) {
  const [questions, setQuestions] = useState(["", ""])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [kpiOrder, setKpiOrder] = useState(["total", "enforced"])

  const loadQuestions = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true)
    try {
      const res = await fetch("/api/system/security-questions", { cache: "no-store" })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load security questions")
      }

      if (Array.isArray(json.data)) {
        const list = [...json.data]
        while (list.length < 2) {
          list.push("")
        }
        setQuestions(list)
      }

      
    } catch (err) {
      showToast?.({
        title: "Load Failed",
        description: err.message || "Unable to fetch security questions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    queueMicrotask(loadQuestions)
  }, [loadQuestions])

  const handleAddQuestion = () => {
    setQuestions((prev) => [...prev, ""])
  }

  const handleRemoveQuestion = (index) => {
    if (questions.length > 2) {
      setQuestions((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleQuestionChange = (index, value) => {
    setQuestions((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  const handleSave = async (totpToken = null) => {
    const filtered = questions.map((q) => String(q || "").trim()).filter(Boolean)

    if (filtered.length < 2) {
      showToast?.({
        title: "Validation Error",
        description: "At least two security questions are required by institution policy.",
        variant: "destructive",
      })
      return
    }

    for (let i = 0; i < filtered.length; i++) {
      const q = filtered[i]
      if (q.length < 10) {
        showToast?.({
          title: "Question Too Short",
          description: `Question ${i + 1} must contain at least 10 characters.`,
          variant: "destructive",
        })
        return
      }
      const uniqueChars = new Set(q.toLowerCase().replace(/\s/g, "")).size
      if (uniqueChars < 5) {
        showToast?.({
          title: "Weak Challenge",
          description: `Question ${i + 1} is too repetitive or simple. Provide a more complex challenge.`,
          variant: "destructive",
        })
        return
      }
    }

    setSaving(true)
    const headers = { "Content-Type": "application/json" }
    if (totpToken) {
      headers["X-TOTP-Token"] = totpToken
    }

    try {
      const res = await fetch("/api/system/security-questions", {
        method: "PUT",
        headers,
        body: JSON.stringify({ questions: filtered }),
      })

      const json = await res.json().catch(() => null)

      if (res.status === 403 && json?.requiresTOTP) {
        setSaving(false)
        if (totpToken) {
          throw new Error(json?.error || "Invalid verification code")
        }
        setTotpModalOpen(true)
        return
      }

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update security questions")
      }

      showToast?.({
        title: "Security Questions Updated",
        description: "Institutional account recovery questions have been successfully saved.",
      })

      setTotpModalOpen(false)
      loadQuestions()
    } catch (err) {
      if (totpToken) throw err
      showToast?.({
        title: "Update Failed",
        description: err.message || "Failed to save security questions.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTOTPConfirm = async (token) => {
    setTotpLoading(true)
    try {
      await handleSave(token)
      setTotpLoading(false)
      setTotpModalOpen(false)
    } catch (err) {
      setTotpLoading(false)
      throw err
    }
  }

  const activeQuestionsCount = questions.filter((q) => q.trim().length > 0).length

  return (
    <div className="animate-fade-up font-jakarta flex flex-1 flex-col h-full min-h-0 w-full gap-6">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
        {/* Header */}
        <PageHeader
          icon="ph-bold ph-shield-check"
          title="Global Security Questions"
          description="Define institutional verification challenges for staff account recovery and password resets system-wide."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex items-center gap-2">
              <RefreshButton
                onRefresh={() => loadQuestions(true)}
                isLoading={loading}
                title="Refresh Security Questions"
              />

              <div className="h-6 w-px bg-gray-200 dark:bg-zinc-800" />

              <Button
                onClick={() => handleSave()}
                disabled={saving || loading}
                className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs border-0"
              >
                {saving ? (
                  <HugeIcon  className="ph-bold ph-spinner animate-spin text-[16px]"></HugeIcon>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          }
        />

        {/* Top Summary Stat Cards */}
        <div className="px-6 pb-6">
          <Reorder.Group as="div" axis="x" values={kpiOrder} onReorder={setKpiOrder} className="grid grid-cols-1 gap-4 md:grid-cols-2 items-start relative z-20">
            {kpiOrder.map(key => {
              if (key === "total") return (
            <Reorder.Item as="div" value="total" key="total" className="relative group rounded-xl">
              <div className="relative overflow-hidden rounded-[18px] border border-gray-100 dark:border-white/5 cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900">
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                      Configured Challenges
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 w-fit">
                      2 Required
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#10b981]">
                    <HugeIcon className="ph-bold text-[15px] ph-shield-check" />
                  </div>
                </div>
                
                <div className="flex justify-between items-end p-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                      {loading ? "..." : activeQuestionsCount}
                    </span>
                    <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 mb-0.5">
                      Staff must configure and answer these challenges upon onboarding.
                    </span>
                  </div>
                  <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                </div>
              </div>
            </Reorder.Item>
              );
              if (key === "enforced") return (
            <Reorder.Item as="div" value="enforced" key="enforced" className="relative group rounded-xl">
              <div className="relative overflow-hidden rounded-[18px] border border-gray-100 dark:border-white/5 cursor-pointer select-none transition-all shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_15px_rgb(0,0,0,0.06)] flex flex-col justify-between min-h-[110px] bg-gray-50 dark:bg-zinc-900">
                <div className="flex justify-between items-start p-4 pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-medium text-gray-500 dark:text-zinc-400 capitalize">
                      Entropy & Policy Standard
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 w-fit">
                      Enforced
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white shadow-sm shrink-0 bg-[#3b82f6]">
                    <HugeIcon className="ph-bold text-[15px] ph-lock-key" />
                  </div>
                </div>
                
                <div className="flex justify-between items-end p-4 pt-1">
                  <div className="flex flex-col gap-1">
                    <span className="text-[28px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                      10+ Chars
                    </span>
                    <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 mb-0.5">
                      Guarantees high-entropy challenges resisting brute-force attacks.
                    </span>
                  </div>
                  <HugeIcon className="ph-bold ph-dots-six-vertical cursor-grab active:cursor-grabbing hover:text-gray-400 dark:hover:text-zinc-500 text-gray-300 dark:text-zinc-700 text-lg mb-0.5" />
                </div>
              </div>
            </Reorder.Item>
              );
              return null;
            })}
          </Reorder.Group>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-white/10" />

        {/* Questions Form Area */}
        <div className="p-6">
          {loading ? (
            <div className="max-w-3xl space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-40 rounded dark:bg-muted" />
                  <Skeleton className="h-10 w-full rounded-xl dark:bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <div className="max-w-3xl space-y-5">
              {questions.map((q, i) => {
                const trimmed = q.trim()
                const isWeak = trimmed.length > 0 && (trimmed.length < 10 || new Set(trimmed.toLowerCase().replace(/\s/g, "")).size < 5)

                return (
                  <div key={i} className="group flex flex-col">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium text-gray-400 dark:text-zinc-500 select-none font-mono">
                          {i + 1}
                        </span>
                        <label className="text-[12px] font-medium text-gray-700 dark:text-zinc-300">
                          Security Challenge Question
                          {i < 2 ? (
                            <span className="ml-1 text-[12px] font-semibold text-red-500">*</span>
                          ) : (
                            <span className="ml-1.5 text-[11px] font-normal text-gray-400 dark:text-zinc-500">
                              (Optional)
                            </span>
                          )}
                        </label>
                      </div>

                      <div className="flex items-center gap-3">
                        {trimmed.length > 0 && (
                          <div>
                            {isWeak ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 cursor-help">
                                    <HugeIcon  className="ph-bold ph-warning text-xs" />
                                    Weak Challenge
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-amber-50 text-amber-900 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900/50 text-xs">
                                  <p className="font-semibold">Minimum 10 characters and 5 unique characters required.</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                <HugeIcon  className="ph-bold ph-check text-xs" />
                                Strong
                              </span>
                            )}
                          </div>
                        )}

                        {i >= 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(i)}
                            className="text-[11px] font-medium text-gray-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400 transition-colors bg-transparent border-0 p-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <Input
                      type="text"
                      placeholder="e.g., What was the name of your first elementary school?"
                      value={q}
                      onChange={(e) => handleQuestionChange(i, e.target.value)}
                      className={cn(
                        "h-10 rounded-xl border bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 px-3 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-xs",
                        isWeak
                          ? "border-amber-400 dark:border-amber-600"
                          : "border-gray-200 dark:border-white/10"
                      )}
                    />
                  </div>
                )
              })}

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddQuestion}
                  className="h-9 px-4 text-xs font-semibold rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* TOTP Challenge Modal */}
      <TOTPChallengeModal
        open={totpModalOpen}
        onOpenChange={setTotpModalOpen}
        onConfirm={handleTOTPConfirm}
        title="Security Authorization Required"
        description="Enter the 6-digit code from your authenticator app to authorize updating institutional security questions."
        actionLabel="Save"
        isLoading={totpLoading}
      />
    </div>
  )
}
