"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const linkRead = useRef(false);

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotMethod, setForgotMethod] = useState("email");
  const [forgotAccountId, setForgotAccountId] = useState("");
  const [forgotQuestions, setForgotQuestions] = useState([]);
  const [forgotQuestionId, setForgotQuestionId] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotResetToken, setForgotResetToken] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotIdentifierFocused, setForgotIdentifierFocused] = useState(false);
  const [newPassFocused, setNewPassFocused] = useState(false);
  const [confirmPassFocused, setConfirmPassFocused] = useState(false);

  useEffect(() => {
    if (linkRead.current) return;
    linkRead.current = true;
    const fragment = window.location.hash;
    if (fragment) {
      const token = new URLSearchParams(fragment.slice(1)).get("token");
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
      queueMicrotask(() => {
        if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
          setForgotResetToken(token);
          setForgotStep(3);
        } else {
          setForgotError("This reset link is invalid. Request a new link below.");
        }
      });
    }
    if (typeof window !== "undefined") {
      document.documentElement.style.setProperty("--brand-accent", "#800000");
      document.documentElement.style.setProperty("--brand-foreground", "#ffffff");
      document.documentElement.removeAttribute("data-brand-accent");
      document.documentElement.removeAttribute("data-brand-foreground");
    }

    // Dynamic favicon swap
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = '/assets/branding/black-icon.png';
    document.getElementsByTagName('head')[0].appendChild(link);
  }, []);

  const resetForgotState = () => {
    setForgotStep(1);
    setForgotIdentifier("");
    setForgotMethod("email");
    setForgotAccountId("");
    setForgotQuestions([]);
    setForgotQuestionId("");
    setForgotAnswer("");
    setForgotResetToken("");
    setForgotMessage("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setForgotLoading(false);
    setForgotIdentifierFocused(false);
    setNewPassFocused(false);
    setConfirmPassFocused(false);
  };

  const handleForgotIdentify = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError("Please enter your Email or Staff ID.");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch(forgotMethod === "questions" ? "/api/auth/forgot-password/security-questions" : "/api/auth/forgot-password/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to identify account.");
      }
      setForgotResetToken("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      if (forgotMethod === "questions") {
        if (!json.data?.id || !json.data?.questions?.length) {
          throw new Error("Security question recovery is unavailable. Use an email reset link instead.");
        }
        setForgotAccountId(json.data.id);
        setForgotQuestions(json.data.questions);
        setForgotQuestionId(String(json.data.questions[0].id));
        setForgotStep(4);
      } else {
        setForgotMessage(json.data?.message || "If an eligible account exists, a password reset link has been sent to its registered email.");
        setForgotStep(2);
      }
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    if ((forgotStep === 4 ? !forgotAnswer.trim() : !forgotResetToken.trim()) || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotError("Please fill all fields.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (forgotNewPassword.length < 8) {
      setForgotError("New password must be at least 8 characters.");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forgotStep === 4 ? {
          id: forgotAccountId,
          questionId: Number(forgotQuestionId),
          answer: forgotAnswer.trim(),
          newPassword: forgotNewPassword
        } : {
          resetToken: forgotResetToken.trim(),
          newPassword: forgotNewPassword
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to reset password.");
      }
      toast.success("Password Reset Successful", { description: "You can now log in with your new password." });
      
      resetForgotState();
      router.push("/login");
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleClose = () => {
    resetForgotState();
    router.push("/login");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-[#ffffff] dark:bg-zinc-950 font-sans p-8">

      {/* Top-Left Brand Logo & Name */}
      <div className="absolute top-6 left-6 flex items-center gap-1 select-none z-20">
        <img src="/assets/branding/black-icon.png" alt="eManage Logo" className="w-[32px] h-[32px] shrink-0 object-contain p-0.5 dark:hidden" />
        <img src="/assets/branding/white-icon.png" alt="eManage Logo" className="w-[32px] h-[32px] shrink-0 object-contain p-0.5 hidden dark:block" />
        <span className="text-[26px] font-semibold text-[#1D1D1F] dark:text-zinc-50 tracking-tight leading-none">eManage</span>
      </div>

      <div className="w-full max-w-[550px] p-4 z-10">
        <div
          className={`bg-white rounded-[20px] shadow-[0_4px_40px_rgba(0,0,0,0.12)] dark:bg-zinc-900 flex flex-col items-center w-full relative rms-forgot-card ${forgotStep === 4 ? "h-auto!" : ""}`}
        >
          {/* APP ICON WITH CONCENTRIC CIRCLES */}
          <div className="relative w-[160px] h-[160px] flex items-center justify-center mb-3 select-none shrink-0">
            <svg className="absolute w-full h-full inset-0 pointer-events-none" viewBox="0 0 160 160">
              {[
                { r: 72, count: 24, size: 4.2, reverse: false },
                { r: 63, count: 24, size: 3.4, reverse: true },
                { r: 54, count: 24, size: 2.8, reverse: false },
                { r: 45, count: 24, size: 2.2, reverse: true }
              ].map((ring, rIdx) => {
                const dots = [];
                for (let i = 0; i < ring.count; i++) {
                  const angle = (i * 2 * Math.PI) / ring.count;
                  const cx = Number((80 + ring.r * Math.cos(angle)).toFixed(4));
                  const cy = Number((80 + ring.r * Math.sin(angle)).toFixed(4));
                  const rawHue = (i / ring.count) * 360 + 200;
                  const hue = rawHue % 360;
                  
                  let sat = 78;
                  let light = 70;
                  if (hue >= 60 && hue <= 160) {
                    sat = 35;
                    light = 76;
                  } else if (hue > 160 && hue <= 200) {
                    const ratio = (hue - 160) / 40;
                    sat = 35 + Math.round(ratio * 43);
                    light = 76 - Math.round(ratio * 6);
                  } else if (hue >= 20 && hue < 60) {
                    const ratio = (hue - 20) / 40;
                    sat = 78 - Math.round(ratio * 43);
                    light = 70 + Math.round(ratio * 6);
                  }
                  
                  const color = `hsl(${hue}, ${sat}%, ${light}%)`;
                  dots.push(
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={ring.size}
                      fill={color}
                    />
                  );
                }
                const duration = rIdx === 0 ? '45s' : rIdx === 1 ? '35s' : rIdx === 2 ? '50s' : '40s';
                return (
                  <g
                    key={rIdx}
                    className={`rms-ring-origin rms-ring-${duration.replace("s", "")} ${ring.reverse ? "animate-spin-reverse" : "animate-spin-slow"}`}
                  >
                    {dots}
                  </g>
                );
              })}
            </svg>
            <img 
              src="/assets/branding/black-icon.png" 
              alt="eManage Logo" 
              className="w-[30px] h-[30px] shrink-0 object-contain p-[2px] z-10 animate-in zoom-in-50 duration-500 dark:hidden" 
            />
            <img 
              src="/assets/branding/white-icon.png" 
              alt="eManage Logo" 
              className="w-[30px] h-[30px] shrink-0 object-contain p-[2px] z-10 animate-in zoom-in-50 duration-500 hidden dark:block" 
            />
          </div>

          <div className="w-full text-center flex-1 flex flex-col animate-in fade-in duration-300">
            <h1 className="login-title text-[25px] font-bold text-[#1D1D1F] dark:text-zinc-50 tracking-tight mb-5">
              Account Recovery
            </h1>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotIdentify} className="w-full flex-1 flex flex-col justify-between">
                <div className="w-full text-left">
                  {/* Merged Field Container */}
                  <div className={`merged-container bg-white dark:bg-zinc-800 ${
                    forgotError ? "has-error" : ""
                  }`}>
                    <div className={`field-wrapper ${forgotIdentifierFocused || forgotIdentifier.length > 0 ? "active" : ""}`}>
                      <label htmlFor="forgotIdentifier">Email Address or Staff ID</label>
                      <Input
                        type="text"
                        id="forgotIdentifier"
                        disabled={forgotLoading}
                        placeholder=" "
                        className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                        autoFocus
                        value={forgotIdentifier}
                        onFocus={() => setForgotIdentifierFocused(true)}
                        onBlur={() => setForgotIdentifierFocused(false)}
                        onChange={(e) => {
                          setForgotIdentifier(e.target.value);
                          if (forgotError) setForgotError("");
                        }}
                      />
                    </div>
                  </div>

                  <p className="mt-4 text-[13px] text-gray-500 dark:text-zinc-400">
                    {forgotMethod === "questions" ? "Answer a security question you previously set up to reset your password." : "Receive a reset link at your registered email address."}
                  </p>
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={() => {
                      const nextMethod = forgotMethod === "email" ? "questions" : "email";
                      resetForgotState();
                      setForgotMethod(nextMethod);
                    }}
                    className="mt-2 text-[13px] text-[#0A84FF] hover:underline focus-visible:underline disabled:opacity-50 font-normal"
                  >
                    {forgotMethod === "email" ? "Use security questions" : "Use an email reset link"}
                  </button>

                  {forgotError && (
                    <div role="alert" className="mt-1.5 text-left flex items-start gap-1.5 text-[#E5484D] animate-in fade-in duration-200">
                      <HugeIcon  className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></HugeIcon>
                      <p className="text-[12px] font-normal leading-snug">
                        {forgotError}
                      </p>
                    </div>
                  )}
                </div>

                {/* Request Button */}
                <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotIdentifier.trim()}
                    title="Request Password Reset"
                    className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {forgotLoading ? (
                      <HugeIcon  className="ph-bold ph-spinner animate-spin text-lg flex items-center justify-center"></HugeIcon>
                    ) : (
                      <span>Request</span>
                    )}
                  </Button>
                </div>

                {/* Back to Login Link */}
                <div className="absolute bottom-[28px] left-[52px] right-[52px] text-center">
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={handleClose}
                    className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none font-normal"
                  >
                    Back
                  </button>
                </div>
              </form>
            ) : forgotStep === 2 ? (
              <div className="w-full flex-1 flex flex-col justify-between">
                <div className="w-full text-left" role="status">
                  <p className="text-[16px] font-semibold text-[#1D1D1F] dark:text-zinc-50 mb-3">Check your email</p>
                  <p className="text-[13px] text-gray-500 dark:text-zinc-400">
                    {forgotMessage} Open the email and click Reset Password. The link expires in 15 minutes. Check spam too.
                  </p>
                </div>
                <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                  <Button type="button" onClick={handleClose} className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 transition-all">
                    Done
                  </Button>
                </div>
                <div className="absolute bottom-[28px] left-[52px] right-[52px] text-center">
                  <button type="button" onClick={resetForgotState} className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none font-normal">
                    Request a new link
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotReset} className={`w-full flex-1 flex flex-col justify-between ${forgotStep === 4 ? "pb-24" : ""}`}>
                <div className="w-full text-left">
                  {forgotStep === 4 && (
                    <div className="mb-3 space-y-3">
                      <div>
                        <label htmlFor="forgotQuestionId" className="block mb-1 text-[12px] text-gray-500 dark:text-zinc-400">Security Question</label>
                        <Select
                          id="forgotQuestionId"
                          aria-label="Security Question"
                          value={forgotQuestionId}
                          disabled={forgotLoading}
                          onChange={(e) => { setForgotQuestionId(String(e.target.value)); setForgotAnswer(""); setForgotError(""); }}
                          className="h-10 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-xs font-normal text-gray-700 dark:text-zinc-200 shadow-none"
                          menuClassName="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-2xl p-1.5"
                          optionClassName="rounded-lg text-xs font-normal py-1.5 px-2.5"
                        >
                          {forgotQuestions.map((question) => <option key={question.id} value={String(question.id)}>{question.question}</option>)}
                        </Select>
                      </div>
                      <div>
                        <label htmlFor="forgotAnswer" className="block mb-1 text-[12px] text-gray-500 dark:text-zinc-400">Security Answer</label>
                        <Input id="forgotAnswer" type="password" autoComplete="off" required disabled={forgotLoading} value={forgotAnswer} onChange={(e) => { setForgotAnswer(e.target.value); setForgotError(""); }} className="h-10 rounded-xl" />
                      </div>
                    </div>
                  )}
                  {/* Merged Field Container */}
                  <div className={`merged-container bg-white dark:bg-zinc-800 ${
                    forgotError ? "has-error" : ""
                  }`}>
                    <p className="px-[14px] py-3 text-[12px] text-gray-500 dark:text-zinc-400">
                      {forgotStep === 4 ? "Choose a new password with at least 8 characters." : "Choose a new password with at least 8 characters. This link expires in 15 minutes and can be used once."}
                    </p>

                    {/* New Password input */}
                    <div className={`field-wrapper border-b border-border dark:border-border/50 ${newPassFocused || forgotNewPassword.length > 0 ? "active" : ""}`}>
                      <label htmlFor="forgotNewPassword">New Password</label>
                      <Input
                        type="password"
                        placeholder=" "
                        className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                        id="forgotNewPassword"
                        autoComplete="new-password"
                        minLength={8}
                        value={forgotNewPassword}
                        onFocus={() => setNewPassFocused(true)}
                        onBlur={() => setNewPassFocused(false)}
                        onChange={(e) => {
                          setForgotNewPassword(e.target.value);
                          if (forgotError) setForgotError("");
                        }}
                        required
                      />
                    </div>

                    {/* Confirm Password input */}
                    <div className={`field-wrapper ${confirmPassFocused || forgotConfirmPassword.length > 0 ? "active" : ""}`}>
                      <label htmlFor="forgotConfirmPassword">Confirm Password</label>
                      <Input
                        type="password"
                        placeholder=" "
                        className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                        id="forgotConfirmPassword"
                        autoComplete="new-password"
                        minLength={8}
                        value={forgotConfirmPassword}
                        onFocus={() => setConfirmPassFocused(true)}
                        onBlur={() => setConfirmPassFocused(false)}
                        onChange={(e) => {
                          setForgotConfirmPassword(e.target.value);
                          if (forgotError) setForgotError("");
                        }}
                        required
                      />
                    </div>
                  </div>

                  {forgotError && (
                    <div role="alert" className="mt-1.5 text-left flex items-start gap-1.5 text-[#E5484D] animate-in fade-in duration-200">
                      <HugeIcon  className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></HugeIcon>
                      <p className="text-[12px] font-normal leading-snug">
                        {forgotError}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reset Password Button */}
                <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                  <Button
                    type="submit"
                    disabled={forgotLoading || (forgotStep === 4 ? !forgotQuestionId || !forgotAnswer.trim() : !forgotResetToken.trim()) || !forgotNewPassword || !forgotConfirmPassword}
                    title="Reset Password"
                    className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {forgotLoading ? (
                      <HugeIcon  className="ph-bold ph-spinner animate-spin text-lg flex items-center justify-center"></HugeIcon>
                    ) : (
                      <span>Reset</span>
                    )}
                  </Button>
                </div>

                {/* Previous Step Link */}
                <div className="absolute bottom-[28px] left-[52px] right-[52px] text-center">
                  <button
                    type="button"
                    disabled={forgotLoading}
                    onClick={resetForgotState}
                    className="text-[13px] text-[#0A84FF] hover:underline focus:outline-none font-normal"
                  >
                    {forgotStep === 4 ? "Back" : "Request a new link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* FIXED FOOTER */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#f2f2f7] dark:bg-zinc-900 border-t border-border dark:border-border py-6 px-8 flex justify-center text-[11px] text-[#8E8E93] select-none font-sans z-0">
        <div className="w-full max-w-[980px] flex justify-center items-center text-center">
          <span>© 2026 Polytechnic University of the Philippines. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
