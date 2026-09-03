"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // Forgot Password State
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotUserId, setForgotUserId] = useState(null);
  const [forgotQuestionId, setForgotQuestionId] = useState(null);
  const [forgotQuestions, setForgotQuestions] = useState([]);
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotIdentifierFocused, setForgotIdentifierFocused] = useState(false);
  const [answerFocused, setAnswerFocused] = useState(false);
  const [newPassFocused, setNewPassFocused] = useState(false);
  const [confirmPassFocused, setConfirmPassFocused] = useState(false);


  const resetForgotState = () => {
    setForgotStep(1);
    setForgotIdentifier("");
    setForgotUserId(null);
    setForgotQuestionId(null);
    setForgotQuestions([]);
    setForgotAnswer("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
    setForgotLoading(false);
    setForgotIdentifierFocused(false);
    setAnswerFocused(false);
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
      const res = await fetch("/api/auth/forgot-password/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: forgotIdentifier.trim() })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to identify account.");
      }
      setForgotUserId(json.data.id);
      setForgotQuestions(json.data.questions);
      setForgotQuestionId(json.data.questions[0]?.id || null);
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (!forgotAnswer.trim() || !forgotNewPassword || !forgotConfirmPassword) {
      setForgotError("Please fill all fields.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError("New password must be at least 6 characters.");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: forgotUserId,
          questionId: forgotQuestionId,
          answer: forgotAnswer.trim(),
          newPassword: forgotNewPassword
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to reset password.");
      }
      toast.success("Password Reset Successful", { description: "You can now log in with your new password." });
      
      // Close window if opened in new tab, otherwise go to home
      if (window.opener) {
        window.close();
      } else {
        router.push("/");
      }
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-[#ffffff] dark:bg-zinc-950 font-sans p-8">

      {/* Top-Left Brand Logo & Name */}
      <div className="absolute top-6 left-6 flex items-center gap-1 select-none z-20">
        <img src="/assets/branding/black-icon.png" alt="eManage Logo" className="w-[32px] h-[32px] object-contain" />
        <span className="text-[26px] font-semibold text-[#1D1D1F] dark:text-zinc-50 tracking-tight leading-none">eManage</span>
      </div>

      <div className="w-full max-w-[550px] p-4 z-10">
        <div
          className="bg-white rounded-[20px] shadow-[0_4px_40px_rgba(0,0,0,0.12)] dark:bg-zinc-900 flex flex-col items-center w-full relative"
          style={{ padding: "56px 52px", height: "630px" }}
        >
          {/* APP ICON WITH CONCENTRIC CIRCLES */}
          <div className="relative w-[160px] h-[160px] flex items-center justify-center mb-3 select-none shrink-0" style={{ width: '160px', height: '160px', flexShrink: 0 }}>
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
                    className={`origin-center ${ring.reverse ? "animate-spin-reverse" : "animate-spin-slow"}`}
                    style={{ 
                      transformOrigin: '80px 80px',
                      animationDuration: duration 
                    }}
                  >
                    {dots}
                  </g>
                );
              })}
            </svg>
            <img 
              src="/assets/branding/black-icon.png" 
              alt="eManage Logo" 
              className="w-[30px] h-[30px] object-contain z-10 animate-in zoom-in-50 duration-slow" 
            />
          </div>

          <div className="w-full text-center flex-1 flex flex-col animate-in fade-in duration-normal">
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
                      <label>Email Address or Staff ID</label>
                      <Input
                        type="text"
                        id="forgotIdentifier"
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

                  {forgotError && (
                    <div className="h-5 mt-1.5 text-left flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-fast">
                      <i className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></i>
                      <p className="text-[12px] font-normal leading-none">
                        {forgotError}
                      </p>
                    </div>
                  )}
                </div>

                {/* Locate Account Button */}
                <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotIdentifier.trim()}
                    className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {forgotLoading ? (
                      <i className="ph-bold ph-spinner animate-spin text-lg flex items-center justify-center"></i>
                    ) : (
                      <span>Locate Account</span>
                    )}
                  </Button>
                </div>

                {/* Back to Login Link */}
                <div className="absolute bottom-[28px] left-[52px] right-[52px] text-center">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="text-[13px] text-[#E5484D] hover:underline focus:outline-none font-normal"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className="w-full flex-1 flex flex-col justify-between">
                <div className="w-full text-left">
                  {/* Merged Field Container */}
                  <div className={`merged-container bg-white dark:bg-zinc-800 ${
                    forgotError ? "has-error" : ""
                  }`}>
                    {/* Challenge Question select wrapper */}
                    <div className="field-wrapper border-b border-gray-100 dark:border-zinc-700/50 select-wrapper active">
                      <label className="text-gray-400 dark:text-zinc-500">Challenge Question</label>
                      <Select
                        className="border-none shadow-none bg-transparent hover:bg-transparent focus:ring-0 dark:border-none dark:bg-transparent dark:hover:bg-transparent h-[52px] pt-[16px] px-[14px] text-[15px] font-normal"
                        value={forgotQuestionId || ""}
                        onChange={(e) => setForgotQuestionId(Number(e.target.value))}
                      >
                        {forgotQuestions.map(q => (
                          <option key={q.id} value={q.id}>{q.question}</option>
                        ))}
                      </Select>
                    </div>

                    {/* Security Answer input */}
                    <div className={`field-wrapper border-b border-gray-100 dark:border-zinc-700/50 ${answerFocused || forgotAnswer.length > 0 ? "active" : ""}`}>
                      <label>Security Answer</label>
                      <Input
                        type="password"
                        placeholder=" "
                        className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={forgotAnswer}
                        onFocus={() => setAnswerFocused(true)}
                        onBlur={() => setAnswerFocused(false)}
                        onChange={(e) => {
                          setForgotAnswer(e.target.value);
                          if (forgotError) setForgotError("");
                        }}
                        required
                      />
                    </div>

                    {/* New Password input */}
                    <div className={`field-wrapper border-b border-gray-100 dark:border-zinc-700/50 ${newPassFocused || forgotNewPassword.length > 0 ? "active" : ""}`}>
                      <label>New Password</label>
                      <Input
                        type="password"
                        placeholder=" "
                        className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                      <label>Confirm Password</label>
                      <Input
                        type="password"
                        placeholder=" "
                        className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                    <div className="h-5 mt-1.5 text-left flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-fast">
                      <i className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></i>
                      <p className="text-[12px] font-normal leading-none">
                        {forgotError}
                      </p>
                    </div>
                  )}
                </div>

                {/* Reset Password Button */}
                <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                  <Button
                    type="submit"
                    disabled={forgotLoading || !forgotAnswer.trim() || !forgotNewPassword || !forgotConfirmPassword}
                    className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                  >
                    {forgotLoading ? (
                      <i className="ph-bold ph-spinner animate-spin text-lg flex items-center justify-center"></i>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </Button>
                </div>

                {/* Previous Step Link */}
                <div className="absolute bottom-[28px] left-[52px] right-[52px] text-center">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-[13px] text-[#E5484D] hover:underline focus:outline-none font-normal"
                  >
                    Previous Step
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* FIXED FOOTER */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#f2f2f7] dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-6 px-8 flex justify-center text-[11px] text-[#8E8E93] select-none font-sans z-0">
        <div className="w-full max-w-[980px] flex justify-center items-center text-center">
          <span>© 2026 Polytechnic University of the Philippines. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
