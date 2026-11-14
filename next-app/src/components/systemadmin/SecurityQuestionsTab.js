"use client"
import useViewPreference from "@/hooks/useViewPreference"
import DashboardSearch from "@/components/systemadmin/DashboardSearch"


import React, { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SegmentedControl } from "@/components/ui/tabs"
import DataViewToolbar from "@/components/shared/DataViewToolbar"
import ActiveFilterChips from "@/components/shared/ActiveFilterChips"
import SecurityQuestionsSkeleton from "@/components/systemadmin/skeletons/SecurityQuestionsSkeleton"
import PageHeader from "@/components/shared/PageHeader"
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal"
import BulkImportQuestionsModal from "@/components/systemadmin/BulkImportQuestionsModal"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { SUPERADMIN_BADGE_BASE as BADGE_BASE, BADGE_PALETTES } from "@/lib/badgeStyles"
import { Alert01Icon, Alert02Icon, CheckmarkCircle01Icon, Delete01Icon, Loading01Icon, Search01Icon, Shield01Icon, Tick01Icon } from "hugeicons-react";

function normalizeQuestions(items) {
  const list = items.map((item, idx) => typeof item === "string"
    ? { id: idx + 1, question: item, is_required: idx < 2 }
    : {
        id: item.id || idx + 1,
        question: item.question || "",
        is_required: item.is_required !== undefined ? Boolean(item.is_required) : true,
      })
  while (list.length < 2) {
    list.push({ id: list.length + 1, question: "", is_required: true })
  }
  return list
}

function questionSnapshot(items) {
  return JSON.stringify(items.map(({ id, question, is_required }) => [id, question, Boolean(is_required)]))
}


export default function SecurityQuestionsTab({ showToast, onDirtyChange }) {
  const [questions, setQuestions] = useState([
    { id: 1, question: "", is_required: true },
    { id: 2, question: "", is_required: true },
  ])
  const [savedQuestions, setSavedQuestions] = useState(null)
  const isDirty = savedQuestions !== null && questionSnapshot(questions) !== questionSnapshot(savedQuestions)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [scope, setScope] = useViewPreference("security", "scope", "all")
  const [search, setSearch] = useViewPreference("security", "search", "")
  const [focusedIndex, setFocusedIndex] = useState(null)

  const loadQuestions = useCallback(async () => {
    try {
      const res = await fetch("/api/system/security-questions", { cache: "no-store" })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load security questions")
      }

      if (Array.isArray(json.data)) {
        const list = normalizeQuestions(json.data)
        setQuestions(list)
        setSavedQuestions(list)
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

  useEffect(() => { onDirtyChange?.(isDirty) }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warnBeforeLeaving = (event) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warnBeforeLeaving)
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving)
  }, [isDirty])

  const handleAddQuestion = () => {
    setScope("all")
    setSearch("")
    setQuestions((prev) => [
      ...prev,
      { id: `draft-${crypto.randomUUID()}`, question: "", is_required: false },
    ])
  }

  const handleDiscardDraft = () => {
    if (!savedQuestions) return
    setQuestions(normalizeQuestions(savedQuestions))
    setFocusedIndex(null)
    showToast?.({
      title: "Draft Changes Discarded",
      description: "Reverted to saved security questions.",
    })
  }

  const handleRemoveQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleQuestionChange = (index, value) => {
    setQuestions((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], question: value }
      return copy
    })
  }

  const handleToggleRequired = (index) => {
    setQuestions((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], is_required: !copy[index].is_required }
      return copy
    })
  }

  const handleBulkImport = (newQuestions) => {
    if (!newQuestions || newQuestions.length === 0) return

    setScope("all")
    setSearch("")

    setQuestions((prev) => {
      const nonEmpties = prev.filter((q) => q.question && q.question.trim().length > 0)
      if (nonEmpties.length === 0) {
        return newQuestions.map((q, idx) => ({
          ...q,
          id: `draft-${crypto.randomUUID()}`,
          is_required: idx === 0 ? true : Boolean(q.is_required),
        }))
      }
      return [...prev, ...newQuestions.map((q) => ({ ...q, id: `draft-${crypto.randomUUID()}` }))]
    })

    showToast?.({
      title: "Questions Imported",
      description: `Added ${newQuestions.length} challenge question${newQuestions.length > 1 ? "s" : ""} to the list. Click "Save" to apply changes.`,
    })
  }

  const handleSave = async (totpToken = null) => {
    const cleanQuestions = questions
      .map((q) => ({
        id: q.id,
        question: String(q.question || "").trim(),
        is_required: Boolean(q.is_required),
      }))
      .filter((q) => q.question.length > 0)

    if (cleanQuestions.length === 0) {
      showToast?.({
        title: "Validation Error",
        description: "At least one security challenge question is required.",
        variant: "destructive",
      })
      return
    }

    const requiredCount = cleanQuestions.filter((q) => q.is_required).length
    if (requiredCount < 1) {
      showToast?.({
        title: "Validation Error",
        description: "At least one question must be marked as Required for account recovery.",
        variant: "destructive",
      })
      return
    }

    for (let i = 0; i < cleanQuestions.length; i++) {
      const q = cleanQuestions[i].question
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
        body: JSON.stringify({ questions: cleanQuestions }),
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

      const savedList = normalizeQuestions(json.data)
      setQuestions(savedList)
      setSavedQuestions(savedList)
      setTotpModalOpen(false)
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

  if (loading) return <SecurityQuestionsSkeleton />

  const counts = {
    all: questions.length,
    required: questions.filter((question) => question.is_required).length,
    optional: questions.filter((question) => !question.is_required).length,
  }
  const visibleQuestions = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question, index }) => (scope === "all" || (scope === "required") === question.is_required)
      && (question.question.toLowerCase().includes(search.trim().toLowerCase()) || focusedIndex === index))

  return (
    <div className="animate-fade-up font-jakarta flex flex-[1_0_auto] flex-col w-full gap-6">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta flex-[1_0_auto]">
        <PageHeader
          icon=" Shield01Icon"
          title={
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span>Security Questions</span>
              <span className="text-[11px] font-normal tracking-normal text-gray-500 dark:text-zinc-400 tabular-nums">
                {counts.all} questions · {counts.required} required
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none"
                role="status"
                aria-live="polite"
              >
                {isDirty ? (
                  <>
                    <Alert02Icon size={13} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">Draft</span>
                    <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-gray-500 dark:text-zinc-400">Unsaved question changes</span>
                  </>
                ) : (
                  <>
                    <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                      <Tick01Icon size={8} className="stroke-[3]" />
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-zinc-100">Status</span>
                    <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
                    <span className="font-medium text-gray-500 dark:text-zinc-400">All questions saved</span>
                  </>
                )}
              </span>
            </div>
          }
          description="Define institutional verification challenges for staff account recovery. Mark mandatory challenges as Required (minimum 10 characters)."
          showBorder={false}
          className="p-6"
          titleClassName="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
          descriptionClassName="text-[13px] font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
          actions={
            <div className="flex shrink-0 items-center gap-2">
              <Button type="button" variant="outline" onClick={() => setBulkModalOpen(true)} disabled={saving} className="h-9 px-4">Import Questions</Button>
              <Button onClick={() => handleSave()} disabled={saving || !isDirty} className="h-9 px-4 cursor-pointer">
                {saving ? <span className="flex items-center gap-1.5"><Loading01Icon size={14} className="animate-spin" />Saving Questions...</span> : "Save Questions"}
              </Button>
            </div>
          }
          secondaryActions={
            isDirty ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDiscardDraft}
                disabled={saving}
                className="h-9 px-4"
              >
                Discard Draft
              </Button>
            ) : null
          }
        />

        <div role="group" aria-label="Question scope" className="flex items-center px-6 py-2.5 border-b border-border/80 dark:border-white/10 bg-white dark:bg-card overflow-x-auto scrollbar-none">
          <SegmentedControl
            value={scope}
            onValueChange={setScope}
            variant="capsule"
            className="inline-grid grid-flow-col auto-cols-fr"
            items={[
              { value: "all", label: "All", badge: counts.all },
              { value: "required", label: "Required", badge: counts.required },
              { value: "optional", label: "Optional", badge: counts.optional },
            ]}
          />
        </div>

        <DataViewToolbar label="Security question search" className="gap-2 bg-white p-4 dark:bg-card sm:px-5 sm:py-3">
          <DashboardSearch value={search} onChange={setSearch} count={visibleQuestions.length} label="Search security questions" placeholder="Search questions..." />
        </DataViewToolbar>
        <ActiveFilterChips searchQuery={search} onClearSearch={() => setSearch("")} onClearAll={() => setSearch("")} className="border-t border-border dark:border-border px-5 py-2.5" />

        {/* Questions Form Area */}
        <div className="p-6 flex-[1_0_auto] flex flex-col border-t border-border dark:border-border">
          <div className="w-full space-y-4">
              {visibleQuestions.length === 0 && <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-xs text-gray-500 dark:text-zinc-400">No questions match this view. Change the scope or search to find a question.</div>}
              {visibleQuestions.map(({ question: q, index: i }) => {
                const text = q.question || ""
                const trimmed = text.trim()
                const isWeak =
                  trimmed.length > 0 &&
                  (trimmed.length < 10 ||
                    new Set(trimmed.toLowerCase().replace(/\s/g, "")).size < 5)

                return (
                  <div
                    key={q.id || i}
                    className="rounded-2xl border border-border dark:border-border bg-gray-50/30 dark:bg-zinc-900/40 p-4 transition-[color,background-color,border-color,box-shadow,opacity,transform] hover:border-border dark:hover:border-white/20 space-y-2.5"
                  >
                    {/* Top Row: Question label & Controls */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold font-sans tabular-nums text-xs border border-border dark:border-border shadow-2xs">
                          {i + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          Question {i + 1}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-xs font-jakarta select-none">
                          {q.is_required ? (
                            <span className="size-3.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white inline-flex items-center justify-center shrink-0">
                              <Tick01Icon size={8} className="stroke-[3]" />
                            </span>
                          ) : (
                            <Shield01Icon size={12} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                          )}
                          <span className="font-semibold text-gray-900 dark:text-zinc-100">Challenge</span>
                          <span className="h-3.5 w-px bg-black/[0.1] dark:bg-white/15 shrink-0" aria-hidden="true" />
                          <span className="font-medium text-gray-500 dark:text-zinc-400">
                            {q.is_required ? "Required" : "Optional"}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Clear Segmented Control [ Required | Optional ] */}
                        <div className="inline-flex items-center bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
                          <button
                            type="button"
                            onClick={() => !q.is_required && handleToggleRequired(i)}
                            className={cn(
                              "px-3 py-1 text-[11px] font-semibold rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] cursor-pointer",
                              q.is_required
                                ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                          >
                            Required
                          </button>
                          <button
                            type="button"
                            onClick={() => q.is_required && handleToggleRequired(i)}
                            className={cn(
                              "px-3 py-1 text-[11px] font-semibold rounded-full transition-[color,background-color,border-color,box-shadow,opacity,transform] cursor-pointer",
                              !q.is_required
                                ? "bg-white dark:bg-zinc-800 text-gray-950 dark:text-white shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                          >
                            Optional
                          </button>
                        </div>

                        {/* Delete button */}
                        {questions.length > 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(i)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-[color,background-color,border-color,box-shadow,opacity,transform] cursor-pointer border-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus-visible:ring-red-400 active:scale-95"
                                aria-label="Remove Question"
                              >
                                <Delete01Icon size="1em" className="text-sm" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p>Remove Question</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Full Width Input field */}
                    <Input
                      type="text"
                      placeholder="e.g., What was the name of your first elementary school?"
                      value={text}
                      onFocus={() => setFocusedIndex(i)}
                      onBlur={() => setFocusedIndex(null)}
                      onChange={(e) => handleQuestionChange(i, e.target.value)}
                      aria-label={`Question ${i + 1} text`}
                      className={cn(
                        "h-10.5 w-full rounded-xl border bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 px-3.5 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all focus:outline-none focus:border-pup-maroon focus:ring-1 focus:ring-pup-maroon focus-visible:outline-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:focus:border-red-500/80 dark:focus:ring-red-500/80 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 shadow-2xs",
                        isWeak
                          ? "border-amber-400 dark:border-amber-600 focus:ring-amber-500 focus-visible:ring-amber-500"
                          : "border-border dark:border-border"
                      )}
                    />

                    {/* Inline Guidance / Validation Text */}
                    <div className="flex items-center justify-between px-1 text-[11px]">
                      {trimmed.length === 0 ? (
                        <span className="text-gray-400 dark:text-zinc-500">
                          {q.is_required
                            ? "Required challenge: Staff must answer this during account recovery setup."
                            : "Optional challenge: Staff may choose to configure this as an alternate."}
                        </span>
                      ) : isWeak ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5">
                          <Alert01Icon size="1em" className="text-xs" />
                          {trimmed.length < 10
                            ? `Must be at least 10 characters (${trimmed.length}/10)`
                            : "Question is too repetitive or simple. Provide a more complex challenge."}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                          <CheckmarkCircle01Icon size="1em" className="text-xs" />
                          Valid challenge question
                        </span>
                      )}

                      {trimmed.length > 0 && (
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans tabular-nums">
                          {trimmed.length} chars
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Broken Lines (Dashed) Add Security Question Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  title="Add Security Question"
                  className="w-full h-12 rounded-xl border-2 border-dashed border-border hover:border-gray-900/40 dark:border-border dark:hover:border-white/30 bg-gray-50/40 hover:bg-gray-100/60 dark:bg-zinc-900/20 dark:hover:bg-zinc-800/50 text-gray-600 dark:text-zinc-400 hover:text-gray-950 dark:hover:text-zinc-100 transition-[color,background-color,border-color,box-shadow,opacity,transform] flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer active:scale-[0.99]"
                >
                  Add Security Question
                </button>
              </div>
          </div>
        </div>
      </Card>

      {/* Bulk Import Questions Modal */}
      <BulkImportQuestionsModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        existingQuestions={questions}
        onImport={handleBulkImport}
      />

      {/* TOTP Challenge Modal */}
      <TOTPChallengeModal
        open={totpModalOpen}
        onOpenChange={setTotpModalOpen}
        onConfirm={handleTOTPConfirm}
        title="Security Authorization Required"
        description="Enter the 6-digit code from your authenticator app to authorize updating institutional security questions."
        actionLabel="Confirm Authorization"
        isLoading={totpLoading}
      />
    </div>
  )
}
