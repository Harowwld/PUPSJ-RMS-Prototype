"use client"

import HugeIcon from "@/components/shared/HugeIcon";
import React, { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import PageHeader from "@/components/shared/PageHeader"
import { RefreshButton } from "@/components/shared/RefreshButton"
import { TOTPChallengeModal } from "@/components/shared/TOTPChallengeModal"
import BulkImportQuestionsModal from "@/components/systemadmin/BulkImportQuestionsModal"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export default function SecurityQuestionsTab({ showToast }) {
  const [questions, setQuestions] = useState([
    { id: 1, question: "", is_required: true },
    { id: 2, question: "", is_required: true },
  ])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totpModalOpen, setTotpModalOpen] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [demoAccountsEnabled, setDemoAccountsEnabled] = useState(true)
  const [demoSettingLoading, setDemoSettingLoading] = useState(true)
  const [demoSettingSaving, setDemoSettingSaving] = useState(false)

  const loadDemoAccountSetting = useCallback(async () => {
    try {
      const response = await fetch("/api/system/settings", { cache: "no-store" })
      const result = await response.json()
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Failed to load login settings")
      setDemoAccountsEnabled(String(result.data?.login_demo_accounts_enabled ?? "true").toLowerCase() !== "false")
    } catch (error) {
      showToast?.({ title: "Load Failed", description: error.message || "Could not load demo account visibility." }, true)
    } finally {
      setDemoSettingLoading(false)
    }
  }, [showToast])

  const handleDemoAccountsToggle = async (enabled) => {
    setDemoSettingSaving(true)
    try {
      const response = await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "login_demo_accounts_enabled", value: String(enabled) }),
      })
      const result = await response.json()
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Failed to save login setting")
      setDemoAccountsEnabled(enabled)
      showToast?.({ title: "Saved", description: `Demo Accounts button ${enabled ? "shown" : "hidden"} on the login page.` })
    } catch (error) {
      showToast?.({ title: "Save Failed", description: error.message || "Could not update demo account visibility." }, true)
    } finally {
      setDemoSettingSaving(false)
    }
  }

  const loadQuestions = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true)
    try {
      const res = await fetch("/api/system/security-questions", { cache: "no-store" })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load security questions")
      }

      if (Array.isArray(json.data)) {
        const list = json.data.map((item, idx) => {
          if (typeof item === "string") {
            return { id: idx + 1, question: item, is_required: idx < 2 }
          }
          return {
            id: item.id || idx + 1,
            question: item.question || "",
            is_required: item.is_required !== undefined ? Boolean(item.is_required) : true,
          }
        })
        while (list.length < 2) {
          list.push({
            id: list.length + 1,
            question: "",
            is_required: true,
          })
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

  useEffect(() => {
    queueMicrotask(loadDemoAccountSetting)
  }, [loadDemoAccountSetting])

  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      { id: Date.now(), question: "", is_required: false },
    ])
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

    setQuestions((prev) => {
      const nonEmpties = prev.filter((q) => q.question && q.question.trim().length > 0)
      if (nonEmpties.length === 0) {
        return newQuestions.map((q, idx) => ({
          ...q,
          is_required: idx === 0 ? true : Boolean(q.is_required),
        }))
      }
      return [...prev, ...newQuestions]
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

  return (
    <div className="animate-fade-up font-jakarta flex flex-1 flex-col h-full min-h-0 w-full gap-6">
      <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
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
              <RefreshButton
                onRefresh={() => loadQuestions(true)}
                isLoading={loading}
                title="Refresh Security Questions"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkModalOpen(true)}
                disabled={loading || saving}
                className="h-10 px-5 text-xs font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Import
              </Button>

              <Button
                onClick={() => handleSave()}
                disabled={saving || loading}
                className="flex h-10 items-center justify-center rounded-xl! btn-brand-red text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer px-5 shadow-xs border-0"
              >
                {saving ? (
                  <HugeIcon className="ph-bold ph-spinner animate-spin text-[16px]" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          }
        />

        <div className="mx-6 flex items-center justify-between gap-4 border-b border-border py-4 dark:border-border">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">Demo Accounts button</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">Show or hide the demo account picker on the public login page. Turning it off also disables demo sign-in.</p>
          </div>
          <Switch
            checked={demoAccountsEnabled}
            onCheckedChange={handleDemoAccountsToggle}
            disabled={demoSettingLoading || demoSettingSaving}
            aria-label="Show Demo Accounts button on login page"
          />
        </div>

        {/* Questions Form Area */}
        <div className="p-6">
          {loading ? (
            <div className="w-full space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border dark:border-border bg-gray-50/20 dark:bg-zinc-900/20 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-32 rounded-lg dark:bg-muted" />
                    <Skeleton className="h-7 w-36 rounded-xl dark:bg-muted" />
                  </div>
                  <Skeleton className="h-10.5 w-full rounded-xl dark:bg-muted" />
                  <Skeleton className="h-4 w-48 rounded dark:bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full space-y-4">
              {questions.map((q, i) => {
                const text = q.question || ""
                const trimmed = text.trim()
                const isWeak =
                  trimmed.length > 0 &&
                  (trimmed.length < 10 ||
                    new Set(trimmed.toLowerCase().replace(/\s/g, "")).size < 5)

                return (
                  <div
                    key={q.id || i}
                    className="rounded-2xl border border-border/80 dark:border-border bg-gray-50/30 dark:bg-zinc-900/40 p-4 transition-all hover:border-border dark:hover:border-white/20 space-y-2.5"
                  >
                    {/* Top Row: Question label & Controls */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold font-mono text-xs border border-border dark:border-border shadow-2xs">
                          {i + 1}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
                          Question {i + 1}
                        </span>
                        {q.is_required ? (
                          <span className="text-[10px] font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/50">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-900 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full border border-border dark:border-border">
                            Optional
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Clear Segmented Control [ Required | Optional ] */}
                        <div className="inline-flex items-center bg-gray-200/70 dark:bg-zinc-800 p-0.5 rounded-xl border border-border/60 dark:border-border">
                          <button
                            type="button"
                            onClick={() => !q.is_required && handleToggleRequired(i)}
                            className={cn(
                              "px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                              q.is_required
                                ? "bg-white dark:bg-zinc-700 text-pup-maroon dark:text-red-400 shadow-xs"
                                : "text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                            )}
                          >
                            Required
                          </button>
                          <button
                            type="button"
                            onClick={() => q.is_required && handleToggleRequired(i)}
                            className={cn(
                              "px-3 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                              !q.is_required
                                ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 shadow-xs"
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
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900/50 active:scale-95"
                                aria-label="Remove Question"
                              >
                                <HugeIcon className="ph-bold ph-trash text-sm" />
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
                      onChange={(e) => handleQuestionChange(i, e.target.value)}
                      className={cn(
                        "h-10.5 w-full rounded-xl border bg-white dark:bg-zinc-800 text-xs text-gray-900 dark:text-zinc-100 px-3.5 placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-pup-maroon shadow-2xs",
                        isWeak
                          ? "border-amber-400 dark:border-amber-600 focus-visible:ring-amber-500"
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
                          <HugeIcon className="ph-bold ph-warning-circle text-xs" />
                          {trimmed.length < 10
                            ? `Must be at least 10 characters (${trimmed.length}/10)`
                            : "Question is too repetitive or simple. Provide a more complex challenge."}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                          <HugeIcon className="ph-bold ph-check-circle text-xs" />
                          Valid challenge question
                        </span>
                      )}

                      {trimmed.length > 0 && (
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
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
                  className="w-full h-12 rounded-xl border-2 border-dashed border-border hover:border-pup-maroon/60 dark:border-border dark:hover:border-pup-maroon/60 bg-gray-50/40 hover:bg-pup-maroon/5 dark:bg-zinc-900/20 dark:hover:bg-pup-maroon/10 text-gray-600 dark:text-zinc-400 hover:text-pup-maroon dark:hover:text-pup-maroon transition-all flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer active:scale-[0.99]"
                >
                  Add
                </button>
              </div>
            </div>
          )}
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
        actionLabel="Save"
        isLoading={totpLoading}
      />
    </div>
  )
}
