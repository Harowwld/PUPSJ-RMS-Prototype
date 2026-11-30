"use client"


import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import AccountSetupPreferences from "@/components/shared/AccountSetupPreferences";
import AccountSetupSteps from "@/components/shared/AccountSetupSteps";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatErrorMessage } from "@/lib/errorUtils"
import { EmptyState } from "@/components/ui/empty"
import { HelpCircleIcon } from "hugeicons-react"
import AppIcon from "@/components/ui/app-icon";
import { validateSecurityAnswer } from "@/lib/authSchemas";
function getCsrfToken() {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)pup_csrf=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function AccountSetupModal({ authUser }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1) // 1 = Password, 2 = Security, 3 = Profile Avatar

  const needsPassword = authUser?.mustChangePassword
  const needsSecurity = authUser?.mustSetSecurityQuestions

  // Password state
  const [pwNext, setPwNext] = useState("")
  const [pwConfirm, setPwConfirm] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [showPw, setShowPw] = useState({ next: false, confirm: false })

  // Security state
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [secLoading, setSecLoading] = useState(false)
  const [secSubmitting, setSecSubmitting] = useState(false)

  const [preferencesSaving, setPreferencesSaving] = useState(false)

  const fetchQuestions = useCallback(async () => {
    setSecLoading(true)
    try {
      const res = await fetch("/api/staff/security")
      const json = await res.json()
      console.info("[auth-debug] account_setup.password_response", {
        ok: Boolean(res.ok && json?.ok),
        status: res.status,
        needsSecurity: Boolean(needsSecurity),
      })
      if (json.ok && json.data?.questions) {
        setQuestions(json.data.questions)
      }
    } catch (e) {
      console.error(e)
    }
    setSecLoading(false)
  }, [needsSecurity])

  useEffect(() => {
    const timer = setTimeout(() => {
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
    }, 0)
    return () => clearTimeout(timer)
  }, [needsPassword, needsSecurity, fetchQuestions])

  const submitPassword = async (e) => {
    e.preventDefault()
    if (pwLoading) return
    if (!pwNext || !pwConfirm) {
      toast.error("Required Fields Missing", {
        description: "Please fill in all password fields.",
      })
      return
    }
    if (pwNext !== pwConfirm) {
      toast.error("Password Mismatch", {
        description: "The new passwords you entered do not match.",
      })
      return
    }
    if (pwNext.length < 8) {
      toast.error("Password Too Short", {
        description: "Password must be at least 8 characters long.",
      })
      return
    }

    setPwLoading(true)

    try {
      const csrf = getCsrfToken()
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {})
        },
        body: JSON.stringify({
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
        console.info("[auth-debug] account_setup.password_complete_showing_recovery_questions")
        setStep(2)
        fetchQuestions()
      } else {
        setStep(3)
      }
    } catch (err) {
      const errInfo = formatErrorMessage(err, {
        title: "Password Update Failed",
        description: "Failed to change default password.",
      })
      toast.error(errInfo.title, {
        description: errInfo.description,
        action: errInfo.action,
      })
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
        toast.error("Security Answer Required", {
          description: `Please provide an answer for: ${q.question}`,
        })
        return
      }
    }

    // Validate strength of all provided answers
    for (const q of questions) {
      const input = (answers[q.id] || "").trim();
      if (input) {
        const validation = validateSecurityAnswer(input, q.question);
        if (!validation.valid) {
          toast.error("Weak Security Answer", {
            description: `${q.question}: ${validation.error}`,
          });
          return;
        }
      }
    }

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

      const csrf = getCsrfToken()
      const res = await fetch("/api/staff/security", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {})
        },
        body: JSON.stringify({ answers: payload }),
      })
      const json = await res.json()
      console.info("[auth-debug] account_setup.security_response", { ok: Boolean(res.ok && json?.ok), status: res.status })
      if (!res.ok || !json.ok)
        throw new Error(json.error || "Failed to save answers")

      toast.success("Security Answers Saved", {
        description: "Your recovery questions have been recorded.",
      })
      setStep(3)
    } catch (err) {
      const errInfo = formatErrorMessage(err, {
        title: "Security Setup Failed",
        description: "Failed to save recovery question answers.",
      })
      toast.error(errInfo.title, {
        description: errInfo.description,
        action: errInfo.action,
      })
    } finally {
      setSecSubmitting(false)
    }
  }

  const finishSetup = () => {
    setOpen(false)
    const destination = window.location.pathname || "/staff"
    console.info("[auth-debug] account_setup.complete_navigating", { destination })
    window.location.assign(destination)
  }

  const submitPreferences = async ({ avatar, nameFormat }) => {
    if (preferencesSaving) return
    setPreferencesSaving(true)

    try {
      const csrf = getCsrfToken()
      const headers = {
        "Content-Type": "application/json",
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      }
      if (nameFormat) {
        const response = await fetch("/api/auth/preferences", {
          method: "POST",
          headers,
          body: JSON.stringify({ preferences: { display_name_format: nameFormat } }),
        })
        const result = await response.json()
        if (!response.ok || !result?.ok) throw new Error(result?.error || "Failed to save display name format")
      }
      if (avatar) {
        const response = await fetch("/api/account/avatar", {
          method: "POST",
          headers,
          body: JSON.stringify(avatar),
        })
        const result = await response.json()
        if (!response.ok || !result?.ok) throw new Error(result?.error || "Failed to set profile avatar")
        window.dispatchEvent(new CustomEvent("avatar-changed", {
          detail: { avatar_filename: result.avatar_filename || null },
        }))
      }

      toast.success("Account Setup Complete")
      finishSetup()
    } catch (err) {
      const errInfo = formatErrorMessage(err, {
        title: "Preferences Update Failed",
        description: "Could not save your account preferences.",
      })
      toast.error(errInfo.title, { description: errInfo.description, action: errInfo.action })
    } finally {
      setPreferencesSaving(false)
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="flex h-[85vh] max-h-screen flex-col overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl shadow-black/5 sm:max-w-2xl md:h-[500px] md:flex-row transition-colors dark:border-border dark:bg-card dark:shadow-none"
        hideClose
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Account Setup</DialogTitle>
          <DialogDescription>Complete account setup steps to continue.</DialogDescription>
        </DialogHeader>

        <AccountSetupSteps
          activeIndex={step - 1}
          steps={[
            { title: "Change Password", description: "Update your default system password.", skipped: !needsPassword },
            { title: "Security Answers", description: "Set up your account recovery questions." },
            { title: "Preferences", description: "Choose your avatar and display name format." },
          ]}
        />

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
                  <p className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300 leading-normal">
                    You&apos;re logging in for the first time. Change your default password to continue.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                      New Password
                    </label>
                    <div className="relative group">
                      <Input
                        type={showPw.next ? "text" : "password"}
                        className="h-10 rounded-[8px] border-[0.5px] border-border bg-white pr-10 text-[13px] font-normal text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:border-border dark:bg-card dark:text-zinc-50 dark:focus:border-zinc-650"
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
                        <AppIcon  className={cn(" text-[16px]", showPw.next ? "ViewOffIcon" : "ViewIcon")}></AppIcon>
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
                      Must be at least 8 characters long.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                      Confirm Password
                    </label>
                    <div className="relative group">
                      <Input
                        type={showPw.confirm ? "text" : "password"}
                        className="h-10 rounded-[8px] border-[0.5px] border-border bg-white pr-10 text-[13px] font-normal text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:border-border dark:bg-card dark:text-zinc-50 dark:focus:border-zinc-650"
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
                        <AppIcon  className={cn(" text-[16px]", showPw.confirm ? "ViewOffIcon" : "ViewIcon")}></AppIcon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 justify-end p-6 bg-transparent border-none">
                <Button
                  type="submit"
                  disabled={pwLoading}
                  className="h-[36px] px-4 cursor-pointer flex items-center justify-center border-none"
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
                  <p className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300 leading-normal">
                    Set up security questions to recover your account if you forget your password.
                  </p>
                </div>

                <div className="space-y-4">
                  {secLoading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-10 w-full rounded-[8px]" />
                      </div>
                    ))
                  ) : questions.length === 0 ? (
                    <EmptyState
                      variant="compact"
                      icon={HelpCircleIcon}
                      title="No Recovery Questions Configured"
                      description="No global security questions have been configured. Contact your system administrator to enable account recovery questions."
                    />
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-900 dark:text-zinc-300 block">
                          {q.question.replace(/\?$/, "")}{" "}
                          {!q.is_required && (
                            <span className="ml-1 text-[11px] font-normal text-gray-400 dark:text-zinc-500">
                              (optional)
                            </span>
                          )}
                        </label>
                        <Input
                          type="text"
                          placeholder={q.hasAnswer ? "•••••••• (Already Answered)" : "Enter your answer"}
                          className="h-10 w-full rounded-[8px] border-[0.5px] border-border bg-white text-[13px] font-normal text-gray-900 focus-visible:border-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0 focus:border-gray-500 dark:border-border dark:bg-card dark:text-zinc-50 dark:focus:border-zinc-650"
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
                  className="h-[36px] px-4 cursor-pointer flex items-center justify-center border-none"
                >
                  {secSubmitting ? "Saving..." : "Continue"}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <AccountSetupPreferences authUser={authUser} saving={preferencesSaving} onComplete={submitPreferences} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
