"use client"

import HugeIcon from "@/components/shared/HugeIcon";
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
import { DEFAULT_AVATARS } from "@/lib/defaultAvatars"

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
  const [pwError, setPwError] = useState("")
  const [showPw, setShowPw] = useState({ next: false, confirm: false })

  // Security state
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [secLoading, setSecLoading] = useState(false)
  const [secSubmitting, setSecSubmitting] = useState(false)
  const [secError, setSecError] = useState("")

  // Avatar state (Step 3)
  const [selectedAvatarId, setSelectedAvatarId] = useState(() => {
    const match = authUser?.avatar_filename?.match(/default(\d)/)
    return match ? Number(match[1]) : 1
  })
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [avatarError, setAvatarError] = useState("")

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
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    if (pwLoading) return
    if (!pwNext || !pwConfirm) {
      setPwError("Please fill all fields")
      return
    }
    if (pwNext !== pwConfirm) {
      setPwError("New passwords do not match")
      return
    }
    if (pwNext.length < 8) {
      setPwError("Password must be at least 8 characters long.")
      return
    }

    setPwError("")
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
      setSecError(err?.message || "Failed to save answers")
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

  const submitAvatar = async () => {
    if (avatarLoading) return
    setAvatarLoading(true)
    setAvatarError("")

    try {
      const csrf = getCsrfToken()
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        },
        body: JSON.stringify({ defaultAvatarId: selectedAvatarId }),
      })
      const json = await res.json()
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to set profile avatar")
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("avatar-changed", {
            detail: { avatar_filename: json.avatar_filename || null },
          })
        )
      }

      toast.success("Account Setup Complete", {
        description: "Your profile avatar has been set.",
      })
      finishSetup()
    } catch (err) {
      setAvatarError(err?.message || "Failed to set profile avatar")
    } finally {
      setAvatarLoading(false)
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

        {/* Sidebar Steps */}
        <div className="flex w-full shrink-0 flex-col overflow-y-auto border-r border-border bg-gray-50/50 p-6 md:w-1/3 dark:border-border dark:bg-card">
          <div className="mb-5">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-550">
              Account Setup
            </h3>
            <p className="mt-1 text-[11px] font-normal leading-normal text-gray-900 dark:text-zinc-300">
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
                    <HugeIcon  className="ph-bold ph-check text-[14px] text-emerald-600 dark:text-emerald-450 shrink-0"></HugeIcon>
                  ) : (
                    <HugeIcon  className="ph-bold ph-circle text-[14px] text-pup-maroon dark:text-red-400 shrink-0"></HugeIcon>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {step > 2 ? (
                    <HugeIcon  className="ph-bold ph-check text-[14px] text-emerald-600 dark:text-emerald-450 shrink-0"></HugeIcon>
                  ) : step === 2 ? (
                    <HugeIcon  className="ph-bold ph-circle text-[14px] text-pup-maroon dark:text-red-400 shrink-0"></HugeIcon>
                  ) : (
                    <div className="w-[14px] h-[14px] shrink-0" />
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-550">
                    Step 2
                  </span>
                </div>
                {step > 2 && (
                  <span className="text-[10px] font-normal text-gray-400 dark:text-zinc-550">
                    Done
                  </span>
                )}
              </div>
              <span className="pl-[22px] text-[13px] font-semibold text-gray-800 dark:text-zinc-200 tracking-[-0.01em]">
                Security Answers
              </span>
              <p className="pl-[22px] text-[11px] font-normal text-gray-400 dark:text-zinc-550 mt-0.5">
                Set up your account recovery questions.
              </p>
            </div>

            {/* Vertical Connector Line */}
            <div className="w-[0.5px] h-[20px] bg-gray-200 dark:bg-zinc-800 ml-6 shrink-0" />

            {/* Step 3 */}
            <div
              className={cn(
                "flex flex-col gap-1 transition-all rounded-[8px] px-3 py-2.5",
                step === 3 
                  ? "bg-gray-100/80 dark:bg-zinc-800/40" 
                  : "opacity-60"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {step === 3 ? (
                    <HugeIcon  className="ph-bold ph-circle text-[14px] text-pup-maroon dark:text-red-400 shrink-0"></HugeIcon>
                  ) : (
                    <div className="w-[14px] h-[14px] shrink-0" />
                  )}
                  <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-gray-400 dark:text-zinc-550">
                    Step 3
                  </span>
                </div>
              </div>
              <span className="pl-[22px] text-[13px] font-semibold text-gray-800 dark:text-zinc-200 tracking-[-0.01em]">
                Profile Avatar
              </span>
              <p className="pl-[22px] text-[11px] font-normal text-gray-400 dark:text-zinc-550 mt-0.5">
                Choose your default account avatar.
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
                  <p className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300 leading-normal">
                    You&apos;re logging in for the first time. Change your default password to continue.
                  </p>
                </div>

                {pwError && (
                  <div className="flex items-center gap-2 rounded-[8px] border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 animate-in shake-1">
                    <HugeIcon  className="ph-fill ph-warning-circle text-base"></HugeIcon>
                    {pwError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                      New <span className="text-[11px] font-normal text-gray-450 dark:text-zinc-500">*</span>
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
                        <HugeIcon  className={cn("ph-bold text-[16px]", showPw.next ? "ph-eye-slash" : "ph-eye")}></HugeIcon>
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-zinc-500">
                      Must be at least 8 characters long.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                      Confirm <span className="text-[11px] font-normal text-gray-450 dark:text-zinc-500">*</span>
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
                        <HugeIcon  className={cn("ph-bold text-[16px]", showPw.confirm ? "ph-eye-slash" : "ph-eye")}></HugeIcon>
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
                  <p className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300 leading-normal">
                    Set up security questions to recover your account if you forget your password.
                  </p>
                </div>

                {secError && (
                  <div className="flex items-center gap-2 rounded-[8px] border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 animate-in shake-1">
                    <HugeIcon  className="ph-fill ph-warning-circle text-base"></HugeIcon>
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
                    <div className="text-[13px] font-normal text-gray-900 dark:text-zinc-300">
                      No global security questions have been configured.
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id} className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-900 dark:text-zinc-300 block">
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
                  className="h-[36px] px-4 rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none cursor-pointer flex items-center justify-center border-none"
                >
                  {secSubmitting ? "Saving..." : "Continue"}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="flex min-h-0 flex-1 flex-col justify-between">
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div>
                  <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                    Choose Profile Avatar
                  </h3>
                  <p className="mt-1 text-[13px] font-normal text-gray-900 dark:text-zinc-300 leading-normal">
                    Select one of the 4 default avatars to personalize your profile, or skip to continue with your initials.
                  </p>
                </div>

                {avatarError && (
                  <div className="flex items-center gap-2 rounded-[8px] border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/30 dark:text-red-400 animate-in shake-1">
                    <HugeIcon className="ph-fill ph-warning-circle text-base" />
                    {avatarError}
                  </div>
                )}

                {/* Live Stage Preview */}
                <div className="flex flex-col items-center justify-center gap-2 py-1">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-inner ring-4 ring-gray-100 dark:ring-zinc-800 flex items-center justify-center bg-gray-50 dark:bg-zinc-800">
                    <div className="w-full h-full flex items-center justify-center scale-[2.4]">
                      {DEFAULT_AVATARS.find((a) => a.id === selectedAvatarId)?.svg}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                    Selected: Avatar {selectedAvatarId}
                  </span>
                </div>

                {/* 4 Default Avatars Grid */}
                <div>
                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.04em] text-gray-550 dark:text-zinc-400">
                    Select Default Avatar
                  </label>
                  <div className="grid grid-cols-4 gap-3 w-full">
                    {DEFAULT_AVATARS.map((avatar) => {
                      const isSelected = selectedAvatarId === avatar.id;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => setSelectedAvatarId(avatar.id)}
                          className={cn(
                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-0 flex items-center justify-center cursor-pointer active:scale-95",
                            isSelected
                              ? "border-pup-maroon dark:border-red-400 ring-2 ring-pup-maroon/20 dark:ring-red-400/20 shadow-md"
                              : "border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100 hover:border-gray-300 dark:hover:border-zinc-700"
                          )}
                          title={avatar.name}
                        >
                          <div className="w-full h-full flex items-center justify-center scale-[1.5]">
                            {avatar.svg}
                          </div>
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-pup-maroon dark:bg-red-500 text-white flex items-center justify-center shadow-xs">
                              <HugeIcon className="ph-bold ph-check text-[10px]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex shrink-0 items-center justify-between p-6 bg-transparent border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  disabled={avatarLoading}
                  onClick={finishSetup}
                  className="h-[36px] px-4 rounded-[8px] text-[13px] font-medium border border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-none cursor-pointer"
                >
                  Skip for Now
                </Button>
                <Button
                  type="button"
                  disabled={avatarLoading || !selectedAvatarId}
                  onClick={submitAvatar}
                  className="h-[36px] px-4 rounded-[8px] btn-brand-red text-[13px] font-medium text-white shadow-none cursor-pointer flex items-center justify-center border-none"
                >
                  {avatarLoading ? "Saving..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
