"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function AccountSetupModal({ authUser }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1) // 1 = Password, 2 = Security

  const needsPassword = authUser?.mustChangePassword
  const needsSecurity = authUser?.mustSetSecurityQuestions

  // Password state
  const [pwCurrent, setPwCurrent] = useState("")
  const [pwNext, setPwNext] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState("")
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })

  // Security state
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [secLoading, setSecLoading] = useState(false)
  const [secSubmitting, setSecSubmitting] = useState(false)
  const [secError, setSecError] = useState("")

  useEffect(() => {
    if (needsPassword || needsSecurity) {
      setOpen(true)
      if (needsPassword) {
        setStep(1)
      } else {
        setStep(2)
        fetchQuestions()
      }
    } else {
      setOpen(false)
    }
  }, [needsPassword, needsSecurity])

  const fetchQuestions = async () => {
    setSecLoading(true)
    try {
      const res = await fetch("/api/staff/security")
      const json = await res.json()
      if (json.ok && json.data?.questions) {
        setQuestions(json.data.questions)
      }
    } catch (e) {
      console.error(e)
    }
    setSecLoading(false)
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (pwLoading) return
    if (!pwCurrent || !pwNext || !pwConfirm) {
      setPwError("Please fill all fields")
      return
    }
    if (pwNext !== pwConfirm) {
      setPwError("New passwords do not match")
      return
    }
    if (pwNext === pwCurrent) {
      setPwError("New password cannot be the same as the current password")
      return
    }
    if (pwNext.length < 6) {
      setPwError("Password must be at least 6 characters")
      return
    }

    setPwError("")
    setPwLoading(true)

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNext,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || "Failed to change password")

      toast.success("Password Updated", {
        description: "Your new credentials are now active.",
      })

      if (needsSecurity) {
        setStep(2)
        fetchQuestions()
      } else {
        setOpen(false)
        setTimeout(() => window.location.reload(), 1000)
      }
    } catch (err) {
      setPwError(err?.message || "Failed to change password")
    } finally {
      setPwLoading(false)
    }
  }

  const submitSecurity = async (e) => {
    e.preventDefault()
    if (secSubmitting) return
    
    // Validation: Only require answers if they haven't been answered before
    const requiredQuestions = questions.filter((q) => q.is_required)
    for (const q of requiredQuestions) {
      const hasCurrentInput = !!(answers[q.id] && answers[q.id].trim());
      if (!q.hasAnswer && !hasCurrentInput) {
        setSecError(`Please provide an answer for: ${q.question}`)
        return
      }
    }

    setSecError("")
    setSecSubmitting(true)
    try {
      // Send all questions that have either a new answer or were previously answered
      // Empty string for a previously answered optional question will trigger deletion on backend
      const payload = questions
        .map((q) => ({
          questionId: q.id,
          answer: (answers[q.id] || "").trim(),
        }))
        .filter((ans) => ans.answer !== "" || questions.find(q => q.id === ans.questionId)?.hasAnswer);

      const res = await fetch("/api/staff/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to save answers")

      toast.success("Account Setup Complete", {
        description: "Your account is now fully secured.",
      })
      setOpen(false)
      setTimeout(() => window.location.reload(), 1000)
    } catch (err) {
      setSecError(err?.message || "Failed to save answers")
    } finally {
      setSecSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="flex h-[85vh] max-h-screen flex-col overflow-hidden rounded-brand border border-gray-200 bg-white p-0 shadow-2xl sm:max-w-2xl md:h-[600px] md:flex-row transition-colors dark:border-white/10 dark:bg-card dark:shadow-none"
        hideClose
      >
        {/* Sidebar Tabs */}
        <div className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-r border-gray-200 bg-gray-50 p-6 md:w-1/3 dark:border-white/10 dark:bg-card">
          <div className="mb-2">
            <h3 className="px-1 text-xs font-semibold tracking-widest text-gray-500 dark:text-zinc-400">
              Account Setup
            </h3>
            <p className="mt-0.5 px-1 text-[11px] font-medium text-gray-400 dark:text-zinc-500">
              Complete these steps to access your dashboard securely.
            </p>
          </div>

          <div
            className={`flex flex-col gap-1 rounded-brand px-4 py-3 transition-all ${step === 1 ? "scale-100 border border-gray-200 bg-white opacity-100 shadow-sm" : "scale-95 opacity-40 grayscale"} dark:border-white/10 dark:bg-card`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i
                  className={`text-lg ${needsPassword && step > 1 ? "ph-fill ph-check-circle text-emerald-500" : "ph-duotone ph-password text-pup-maroon dark:text-primary"}`}
                ></i>
                <span className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Step 1</span>
              </div>
              {needsPassword && step > 1 && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                  Done
                </span>
              )}
            </div>
            <span className="pl-7 text-xs font-semibold text-gray-600 dark:text-zinc-300">
              Change Password
            </span>
            <p className="mt-0.5 pl-7 text-[10px] text-gray-500 dark:text-zinc-400">
              Update your default system password.
            </p>
          </div>

          <div
            className={`flex flex-col gap-1 rounded-brand px-4 py-3 transition-all ${step === 2 ? "scale-100 border border-gray-200 bg-white opacity-100 shadow-sm" : "scale-95 opacity-40 grayscale"} dark:border-white/10 dark:bg-card`}
          >
            <div className="flex items-center gap-2">
              <i className="ph-duotone ph-shield-check text-lg text-pup-maroon dark:text-primary"></i>
              <span className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Step 2</span>
            </div>
            <span className="pl-7 text-xs font-semibold text-gray-600 dark:text-zinc-300">
              Security Answers
            </span>
            <p className="mt-0.5 pl-7 text-[10px] text-gray-500 dark:text-zinc-400">
              Set up your account recovery questions.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex w-full flex-col bg-white md:w-2/3 dark:bg-card">
          {step === 1 && (
            <>
              <DialogHeader className="shrink-0 border-b border-gray-100 bg-white p-6 dark:border-white/10 dark:bg-card">
                <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Update Default Password
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm font-medium text-gray-600 dark:text-zinc-300">
                  You are logging in for the first time. Please change your
                  default password to continue using the system securely.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={submitPassword}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="flex-1 space-y-5 overflow-y-auto p-6">
                  {pwError && (
                    <div className="flex items-center gap-2 rounded-brand border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                      <i className="ph-bold ph-warning-circle text-lg"></i>
                      {pwError}
                    </div>
                  )}
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                        Current Password <span className="text-pup-maroon dark:text-primary">*</span>
                      </label>
                      <div className="relative group">
                        <Input
                          type={showPw.current ? "text" : "password"}
                          className="h-11 rounded-brand border-gray-300 bg-gray-50 pr-10 text-sm font-semibold text-gray-900 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:ring-red-500/20"
                          value={pwCurrent}
                          onChange={(e) => setPwCurrent(e.target.value)}
                          placeholder="e.g. pupstaff"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(prev => ({ ...prev, current: !prev.current }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500 dark:hover:text-red-500"
                        >
                          <i className={cn("ph-bold", showPw.current ? "ph-eye-slash" : "ph-eye")}></i>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                        New Password <span className="text-pup-maroon dark:text-primary">*</span>
                      </label>
                      <div className="relative group">
                        <Input
                          type={showPw.next ? "text" : "password"}
                          className="h-11 rounded-brand border-gray-300 bg-gray-50 pr-10 text-sm font-semibold text-gray-900 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:ring-red-500/20"
                          value={pwNext}
                          onChange={(e) => setPwNext(e.target.value)}
                          placeholder="Min. 6 characters"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(prev => ({ ...prev, next: !prev.next }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500 dark:hover:text-red-500"
                        >
                          <i className={cn("ph-bold", showPw.next ? "ph-eye-slash" : "ph-eye")}></i>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                        Confirm New Password <span className="text-pup-maroon dark:text-primary">*</span>
                      </label>
                      <div className="relative group">
                        <Input
                          type={showPw.confirm ? "text" : "password"}
                          className="h-11 rounded-brand border-gray-300 bg-gray-50 pr-10 text-sm font-semibold text-gray-900 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:ring-red-500/20"
                          value={pwConfirm}
                          onChange={(e) => setPwConfirm(e.target.value)}
                          placeholder="Must match new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(prev => ({ ...prev, confirm: !prev.confirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500 dark:hover:text-red-500"
                        >
                          <i className={cn("ph-bold", showPw.confirm ? "ph-eye-slash" : "ph-eye")}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 p-5 dark:border-white/10 dark:bg-card">
                  <Button
                    type="submit"
                    disabled={pwLoading}
                    className="h-11 btn-brand-red px-6 text-xs font-semibold tracking-widest text-white shadow-sm transition-colors"
                  >
                    {pwLoading
                      ? "Saving..."
                      : needsSecurity
                        ? "Next: Security Questions"
                        : "Save Password & Enter"}
                  </Button>
                </div>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <DialogHeader className="shrink-0 border-b border-gray-100 bg-white p-6 dark:border-white/10 dark:bg-card">
                <DialogTitle className="text-xl font-semibold tracking-tight text-gray-900 dark:text-zinc-50">
                  Recovery Questions
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm font-medium text-gray-600 dark:text-zinc-300">
                  Set up your security questions to recover your account if you
                  forget your password.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={submitSecurity}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
                  {secError && (
                    <div className="flex items-center gap-2 rounded-brand border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400">
                      <i className="ph-bold ph-warning-circle text-lg"></i>
                      {secError}
                    </div>
                  )}
                  {secLoading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-11 w-full rounded-brand" />
                      </div>
                    ))
                  ) : questions.length === 0 ? (
                    <div className="text-sm font-medium text-gray-500 dark:text-zinc-400">
                      No global security questions have been configured.
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id}>
                        <label className="mb-1.5 block text-xs font-semibold tracking-wide text-gray-700 dark:text-zinc-200">
                          {q.question}{" "}
                          {q.is_required ? (
                            <span className="text-pup-maroon dark:text-primary">*</span>
                          ) : (
                            <span className="ml-1 font-medium text-gray-400 normal-case dark:text-zinc-500">
                              (Optional)
                            </span>
                          )}
                        </label>
                        <Input
                          type="text"
                          placeholder={q.hasAnswer ? "•••••••• (Already Answered)" : "Enter your answer"}
                          className="h-11 w-full rounded-brand border-gray-300 bg-gray-50 text-sm font-semibold text-gray-900 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:ring-red-500/20"
                          value={answers[q.id] || ""}
                          onChange={(e) =>
                            setAnswers({ ...answers, [q.id]: e.target.value })
                          }
                          required={!!q.is_required && !q.hasAnswer}
                        />
                      </div>
                    ))
                  )}
                </div>
                <div className="flex shrink-0 justify-end border-t border-gray-100 bg-gray-50 p-5 dark:border-white/10 dark:bg-card">
                  <Button
                    type="submit"
                    disabled={
                      secLoading || secSubmitting || questions.length === 0
                    }
                    className="h-11 btn-brand-red px-6 text-xs font-semibold tracking-widest text-white shadow-sm transition-colors"
                  >                    {secSubmitting ? "Saving..." : "Complete Setup & Enter"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


