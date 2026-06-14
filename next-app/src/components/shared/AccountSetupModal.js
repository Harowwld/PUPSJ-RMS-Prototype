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
        className="flex h-[85vh] max-h-screen flex-col overflow-hidden rounded-[12px] border border-gray-200 bg-white p-0 shadow-2xl shadow-black/5 sm:max-w-2xl md:h-[500px] md:flex-row transition-colors dark:border-white/10 dark:bg-card dark:shadow-none"
        hideClose
      >
        {/* Sidebar Steps */}
        <div className="flex w-full shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-gray-50/50 p-6 md:w-1/3 dark:border-white/10 dark:bg-card">
          <div className="mb-5">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-550">
              Account Setup
            </h3>
            <p className="mt-1 text-[11px] font-normal leading-normal text-gray-500 dark:text-zinc-400">
              Complete these steps to access your dashboard securely.
            </p>
          </div>

          <div className="flex flex-col flex-1 gap-1">
            {/* Step 1 */}
            <div
              className={cn(
                "flex flex-col gap-1 transition-all rounded-[8px] px-3 py-2.5",
                step === 1 
                  ? "bg-gray-100/80 dark:bg-zinc-800/40" 
                  : "opacity-60"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {needsPassword && step > 1 ? (
                    <i className="ph-bold ph-check text-[14px] text-emerald-600 dark:text-emerald-450 shrink-0"></i>
                  ) : (
                    <i className="ph-bold ph-circle text-[14px] text-pup-maroon dark:text-red-400 shrink-0"></i>
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-550">
                    Step 1
                  </span>
                </div>
                {needsPassword && step > 1 && (
                  <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-550">
                    Done
                  </span>
                )}
              </div>
              <span className="pl-[22px] text-[13px] font-semibold text-gray-800 dark:text-zinc-200 tracking-[-0.01em]">
                Change Password
              </span>
              <p className="pl-[22px] text-[11px] font-normal text-gray-400 dark:text-zinc-550 mt-0.5">
                Update your default system password.
              </p>
            </div>

            {/* Vertical Connector Line */}
            <div className="w-[0.5px] h-[20px] bg-gray-200 dark:bg-zinc-800 ml-6 shrink-0" />

            {/* Step 2 */}
            <div
              className={cn(
                "flex flex-col gap-1 transition-all rounded-[8px] px-3 py-2.5",
                step === 2 
                  ? "bg-gray-100/80 dark:bg-zinc-800/40" 
                  : "opacity-60"
              )}
            >
              <div className="flex items-center gap-2">
                {step === 2 ? (
                  <i className="ph-bold ph-circle text-[14px] text-pup-maroon dark:text-red-400 shrink-0"></i>
                ) : (
                  <div className="w-[14px] h-[14px] shrink-0" />
                )}
                <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-550">
                  Step 2
                </span>
              </div>
              <span className="pl-[22px] text-[13px] font-semibold text-gray-800 dark:text-zinc-200 tracking-[-0.01em]">
                Security Answers
              </span>
              <p className="pl-[22px] text-[11px] font-normal text-gray-400 dark:text-zinc-550 mt-0.5">
                Set up your account recovery questions.
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex w-full flex-col bg-white md:w-2/3 dark:bg-card">
          {step === 1 && (
            <form
              onSubmit={submitPassword}
              className="flex min-h-0 flex-1 flex-col justify-between"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    Update Default Password
                  </h3>
                  <p className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400 leading-normal">
                    You're logging in for the first time. Change your default password to continue.
                  </p>
                </div>

                {pwError && (
                  <div className="flex items-center gap-2 rounded-[8px] border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 animate-in shake-1">
                    <i className="ph-fill ph-warning-circle text-base"></i>
                    {pwError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                      Current <span className="text-[11px] font-normal text-gray-450 dark:text-zinc-500">*</span>
                    </label>
                    <div className="relative group">
                      <Input
                        type={showPw.current ? "text" : "password"}
                        className="h-10 rounded-[8px] border-[0.5px] border-gray-300 bg-white pr-10 text-[13px] font-normal text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:border-zinc-800 dark:bg-card dark:text-zinc-50 dark:focus:border-zinc-650"
                        style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                        value={pwCurrent}
                        onChange={(e) => setPwCurrent(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500 dark:hover:text-red-500"
                      >
                        <i className={cn("ph-bold text-[16px]", showPw.current ? "ph-eye-slash" : "ph-eye")}></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                      New <span className="text-[11px] font-normal text-gray-450 dark:text-zinc-500">*</span>
                    </label>
                    <div className="relative group">
                      <Input
                        type={showPw.next ? "text" : "password"}
                        className="h-10 rounded-[8px] border-[0.5px] border-gray-300 bg-white pr-10 text-[13px] font-normal text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:border-zinc-800 dark:bg-card dark:text-zinc-50 dark:focus:border-zinc-650"
                        style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                        value={pwNext}
                        onChange={(e) => setPwNext(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(prev => ({ ...prev, next: !prev.next }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500 dark:hover:text-red-500"
                      >
                        <i className={cn("ph-bold text-[16px]", showPw.next ? "ph-eye-slash" : "ph-eye")}></i>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                      Confirm <span className="text-[11px] font-normal text-gray-450 dark:text-zinc-500">*</span>
                    </label>
                    <div className="relative group">
                      <Input
                        type={showPw.confirm ? "text" : "password"}
                        className="h-10 rounded-[8px] border-[0.5px] border-gray-300 bg-white pr-10 text-[13px] font-normal text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:border-zinc-800 dark:bg-card dark:text-zinc-50 dark:focus:border-zinc-650"
                        style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
                        value={pwConfirm}
                        onChange={(e) => setPwConfirm(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500 dark:hover:text-red-500"
                      >
                        <i className={cn("ph-bold text-[16px]", showPw.confirm ? "ph-eye-slash" : "ph-eye")}></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 justify-end p-6 bg-transparent border-none">
                <Button
                  type="submit"
                  disabled={pwLoading}
                  className="h-[36px] px-4 rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none cursor-pointer flex items-center justify-center border-none"
                >
                  {pwLoading ? "Saving..." : "Continue"}
                </Button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={submitSecurity}
              className="flex min-h-0 flex-1 flex-col justify-between"
            >
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    Recovery Questions
                  </h3>
                  <p className="mt-1 text-[13px] font-normal text-gray-500 dark:text-zinc-400 leading-normal">
                    Set up security questions to recover your account if you forget your password.
                  </p>
                </div>

                {secError && (
                  <div className="flex items-center gap-2 rounded-[8px] border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 animate-in shake-1">
                    <i className="ph-fill ph-warning-circle text-base"></i>
                    {secError}
                  </div>
                )}

                <div className="space-y-4">
                  {secLoading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-10 w-full rounded-[8px]" />
                      </div>
                    ))
                  ) : questions.length === 0 ? (
                    <div className="text-[13px] font-normal text-gray-500 dark:text-zinc-400">
                      No global security questions have been configured.
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-500 dark:text-zinc-400 block">
                          {q.question.replace(/\?$/, "")}{" "}
                          {q.is_required ? (
                            <span className="text-[11px] font-normal text-gray-400 dark:text-zinc-500 ml-0.5">*</span>
                          ) : (
                            <span className="ml-1 text-[11px] font-normal text-gray-400 dark:text-zinc-500 italic">
                              Optional
                            </span>
                          )}
                        </label>
                        <Input
                          type="text"
                          placeholder={q.hasAnswer ? "•••••••• (Already Answered)" : "Enter your answer"}
                          className="h-10 w-full rounded-[8px] border-[0.5px] border-gray-300 bg-white text-[13px] font-normal text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:border-zinc-800 dark:bg-card dark:text-zinc-50 dark:focus:border-zinc-650"
                          style={{ borderWidth: '0.5px', borderStyle: 'solid' }}
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
              </div>

              <div className="flex shrink-0 justify-end p-6 bg-transparent border-none">
                <Button
                  type="submit"
                  disabled={secLoading || secSubmitting || questions.length === 0}
                  className="h-[36px] px-4 rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none cursor-pointer flex items-center justify-center border-none"
                >
                  {secSubmitting ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}


