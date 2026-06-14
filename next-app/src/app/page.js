"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState("login"); // "login" or "forgot"
  const [loginStep, setLoginStep] = useState(1); // 1 = email, 2 = password
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStep1Loading, setIsStep1Loading] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (loginStep === 2) {
      passwordRef.current?.focus();
    }
  }, [loginStep]);

  // 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);

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

  useEffect(() => {
    // Clear logout sync flag when on login page
    localStorage.removeItem("pup-logout");
  }, []);

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
    setLoginStep(1);
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
      setView("login");
      resetForgotState();
    } catch (err) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleContinue = () => {
    const emailValue = username.trim();
    if (!emailValue) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    setIsStep1Loading(true);
    setTimeout(() => {
      setIsStep1Loading(false);
      setLoginStep(2);
    }, 600);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (loginStep === 1) {
      handleContinue();
    } else {
      if (!password) {
        setPasswordError("Enter your password.");
        return;
      }
      setPasswordError("");
      handleLogin();
    }
  };

  function handleLogin() {
    if (isLoading) return;

    const usernameInput = username.trim();
    const passwordInput = password;

    setError("");
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: usernameInput, password: passwordInput }),
        });
        const json = await res.json();
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Invalid username or password.");
        }

        if (json.data.totpRequired) {
          setTempToken(json.data.tempToken);
          setShow2FAModal(true);
          setIsLoading(false);
          return;
        }

        const role = String(json?.data?.role || "");
        
        // Signal other tabs to clear "Session Expired" modal
        localStorage.setItem("pup-session-recovered", Date.now().toString());
        localStorage.removeItem("pup-logout");

        if (role === "Admin") {
          router.push("/admin");
          return;
        }

        router.push("/staff");
      } catch (err) {
        setError(err?.message || "Invalid username or password.");
        setIsLoading(false);
      }
    })();
  }

  const handle2FAVerify = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 6) {
      setTwoFactorError("Please enter a valid code.");
      return;
    }
    setTwoFactorError("");
    setTwoFactorLoading(true);
    try {
      const res = await fetch("/api/auth/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempToken,
          code: twoFactorCode.trim()
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Verification failed.");
      }

      toast.success("Verification Successful", { description: "Logging you in..." });
      
      // Signal other tabs to clear "Session Expired" modal
      localStorage.setItem("pup-session-recovered", Date.now().toString());
      localStorage.removeItem("pup-logout");

      const role = String(json?.data?.role || "");
      if (role === "Admin") {
        router.push("/admin");
      } else {
        router.push("/staff");
      }
    } catch (err) {
      setTwoFactorError(err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  return (
    <TooltipProvider delay={200}>
      <div className="min-h-screen w-full flex items-center justify-center relative bg-[#ffffff] dark:bg-zinc-950 font-sans p-8">

        {/* Top-Left Brand Logo & Name */}
        <div className="absolute top-6 left-6 flex items-center gap-1 select-none z-20">
          <img src="/icon.png" alt="eManage Logo" className="w-[32px] h-[32px] object-contain" />
          <span className="text-[26px] font-semibold text-[#1D1D1F] dark:text-zinc-50 tracking-tight leading-none">eManage</span>
        </div>

        <div className="w-full max-w-[550px] p-4 z-10">
          <div
            className="bg-white rounded-[20px] shadow-[0_4px_40px_rgba(0,0,0,0.12)] transition-all dark:bg-zinc-900 flex flex-col items-center w-full relative"
            style={{ padding: "56px 52px", minHeight: "630px" }}
          >
            {/* APP ICON WITH CONCENTRIC CIRCLES */}
            <div className="relative w-[120px] h-[120px] flex items-center justify-center mb-3 select-none shrink-0" style={{ width: '120px', height: '120px', flexShrink: 0 }}>
              <svg className="absolute w-full h-full inset-0 pointer-events-none" viewBox="0 0 120 120">
                {[
                  { r: 50, count: 28, size: 2.2, reverse: false },
                  { r: 40, count: 20, size: 1.8, reverse: true },
                  { r: 30, count: 12, size: 1.4, reverse: false }
                ].map((ring, rIdx) => {
                  const dots = [];
                  for (let i = 0; i < ring.count; i++) {
                    const angle = (i * 2 * Math.PI) / ring.count;
                    const cx = Number((60 + ring.r * Math.cos(angle)).toFixed(4));
                    const cy = Number((60 + ring.r * Math.sin(angle)).toFixed(4));
                    const hue = (i / ring.count) * 360;
                    const color = `hsl(${hue}, 95%, 65%)`;
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
                  const duration = ring.reverse ? '25s' : rIdx === 0 ? '40s' : '55s';
                  return (
                    <g 
                      key={rIdx} 
                      className={`origin-center ${ring.reverse ? "animate-spin-reverse" : "animate-spin-slow"}`}
                      style={{ 
                        transformOrigin: '60px 60px',
                        animationDuration: duration 
                      }}
                    >
                      {dots}
                    </g>
                  );
                })}
              </svg>
              <img 
                src="/icon.png" 
                alt="eManage Logo" 
                className="w-[50px] h-[50px] object-contain z-10 animate-in zoom-in-50 duration-500" 
              />
            </div>

            {view === "login" ? (
              <div className="w-full text-center flex-1 flex flex-col">
                <h1 className="login-title text-[25px] font-bold text-[#1D1D1F] dark:text-zinc-50 tracking-tight mb-5">
                  Sign in with eManage Account
                </h1>

                <form onSubmit={handleFormSubmit} className="w-full flex-1 flex flex-col justify-between">
                  <div className="w-full text-left">
                    {/* Merged Field Container */}
                    <div className={`merged-container bg-white dark:bg-zinc-800 ${
                      emailError || passwordError || error ? "has-error" : ""
                    }`}>
                      {/* EMAIL FIELD (top half) */}
                      <div className={`field-wrapper email-wrapper ${emailFocused || username.length > 0 ? "active" : ""} ${loginStep === 2 ? "step2-active" : ""}`}>
                        <label>Email Address</label>
                        <Input
                          type="text"
                          id="username"
                          placeholder=" "
                          className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                          autoFocus
                          value={username}
                          onFocus={() => setEmailFocused(true)}
                          onBlur={() => setEmailFocused(false)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUsername(val);
                            if (emailError) setEmailError("");
                            if (val.trim() === "") {
                              setLoginStep(1);
                              setPassword("");
                              setPasswordError("");
                            }
                          }}
                        />
                      </div>

                      {/* PASSWORD FIELD (bottom half) */}
                      <div className={`flex flex-col transition-opacity duration-200 ${
                        loginStep === 2 
                          ? 'opacity-100 max-h-[52px] pointer-events-auto' 
                          : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
                      }`}>
                        <div className={`field-wrapper password-wrapper ${passwordFocused || password.length > 0 ? "active" : ""} ${loginStep === 2 ? "step2-active" : ""}`}>
                          <label>Password</label>
                          <Input
                            ref={passwordRef}
                            type={showPassword ? "text" : "password"}
                            id="password"
                            placeholder=" "
                            className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={password}
                            onFocus={() => setPasswordFocused(true)}
                            onBlur={() => setPasswordFocused(false)}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (passwordError) setPasswordError("");
                              if (error) setError("");
                            }}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="w-7 h-7 flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                              <i className={`ph-bold ${showPassword ? "ph-eye-slash" : "ph-eye"} text-[16px]`}></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Validation Errors displayed below the merged container (Step 1 only) */}
                    {loginStep === 1 && (emailError || passwordError || error) && (
                      <div className="h-5 mt-1.5 text-left flex items-center gap-1.5 text-[#E5484D]">
                        <i className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></i>
                        <p className="text-[12px] font-normal leading-none">
                          {emailError || passwordError || error}
                        </p>
                      </div>
                    )}

                    {/* Keep me signed in and Forgot Password options (Step 2 only) */}
                    {loginStep === 2 && (
                      <div className="flex items-center justify-between w-full mt-2.5 select-none animate-in fade-in duration-200">
                        {emailError || passwordError || error ? (
                          <div className="flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-200 text-left pr-2">
                            <i className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></i>
                            <p className="text-[12px] font-normal leading-none">
                              {emailError || passwordError || error}
                            </p>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-[#E5484D] focus:ring-[#E5484D] accent-[#E5484D]"
                            />
                            <span className="text-[13px] text-[#1D1D1F] dark:text-zinc-300">Keep me signed in</span>
                          </label>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setView("forgot");
                            setLoginStep(1);
                          }}
                          className="text-[13px] text-[#E5484D] focus:outline-none flex items-center gap-0.5 group shrink-0"
                        >
                          <span className="group-hover:underline">Forgot Password?</span>
                          <i className="ph-bold ph-arrow-up-right text-[11px] mt-0.5"></i>
                        </button>
                      </div>
                    )}

                    {/* Create Account Link (Step 1 only) */}
                    {loginStep === 1 && (
                      <button
                        type="button"
                        onClick={() => setShowCreateAccountModal(true)}
                        className="text-[13px] text-[#E5484D] hover:underline focus:outline-none mt-2.5 block text-left font-normal animate-in fade-in duration-200"
                      >
                        Create Your eManage Account
                      </button>
                    )}
                  </div>

                  {/* Disclaimer Text with Icon (Step 1 only) */}
                  {loginStep === 1 ? (
                    <div className="w-full mt-auto pt-9 mb-[78px] text-left flex flex-col items-start select-none animate-in fade-in duration-200">
                      <i className="ph-fill ph-users text-[23px] text-[#007AFF] mb-1"></i>
                      <p className="w-full text-[11px] text-[#8E8E93] dark:text-zinc-400 leading-normal font-normal">
                        Your eManage account is used to provide secure access to student records, document requests, and administrative tools within the Polytechnic University of the Philippines registrar system. Certain account activity is logged for security, auditing, and support purposes. By signing in, you agree to the acceptable use policies of PUP's digital records management system.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-auto" />
                  )}

                  {/* Continue Button (Always visible at the bottom) */}
                  <div className="absolute bottom-[78px] left-[52px] right-[52px]">
                    <Button
                      type="submit"
                      disabled={isLoading || isStep1Loading || (loginStep === 1 && !username.trim())}
                      className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                    >
                      {isLoading || isStep1Loading ? (
                        <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                      ) : (
                        <span>{loginStep === 1 ? "Continue" : "Sign In"}</span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
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
                        <div className="h-5 mt-1.5 text-left flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-200">
                          <i className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></i>
                          <p className="text-[12px] font-normal leading-none">
                            {forgotError}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Locate Account Button (Always visible at the bottom) */}
                    <div className="absolute bottom-[78px] left-[52px] right-[52px]">
                      <Button
                        type="submit"
                        disabled={forgotLoading || !forgotIdentifier.trim()}
                        className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                      >
                        {forgotLoading ? (
                          <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                        ) : (
                          <span>Locate Account</span>
                        )}
                      </Button>
                    </div>

                    {/* Back to Login Link */}
                    <div className="absolute bottom-[38px] left-[52px] right-[52px] text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setView("login");
                          resetForgotState();
                        }}
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
                        <div className="h-5 mt-1.5 text-left flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-200">
                          <i className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></i>
                          <p className="text-[12px] font-normal leading-none">
                            {forgotError}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Reset Password Button (Always visible at the bottom) */}
                    <div className="absolute bottom-[78px] left-[52px] right-[52px]">
                      <Button
                        type="submit"
                        disabled={forgotLoading || !forgotAnswer.trim() || !forgotNewPassword || !forgotConfirmPassword}
                        className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                      >
                        {forgotLoading ? (
                          <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                        ) : (
                          <span>Reset Password</span>
                        )}
                      </Button>
                    </div>

                    {/* Previous Step Link */}
                    <div className="absolute bottom-[38px] left-[52px] right-[52px] text-center">
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
            )}
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#f2f2f7] dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-6 px-8 flex justify-center text-[11px] text-[#8E8E93] select-none font-sans z-0">
          <div className="w-full max-w-[980px] flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="hover:underline cursor-pointer">System Status</span>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <span className="hover:underline cursor-pointer">Privacy Policy</span>
              <span className="text-gray-300 dark:text-zinc-700">|</span>
              <span className="hover:underline cursor-pointer">Terms & Conditions</span>
            </div>
            <span>© 2026 Polytechnic University of the Philippines. All rights reserved.</span>
          </div>
        </div>

        {/* 2FA Modal */}
        <Dialog open={show2FAModal} onOpenChange={(open) => {
          if (!twoFactorLoading) setShow2FAModal(open);
        }}>
          <DialogContent className="max-w-md rounded-[20px] border-gray-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2 dark:text-zinc-50">
                <i className="ph-fill ph-shield-check text-[#E5484D]"></i>
                Two-Factor Authentication
              </DialogTitle>
              <DialogDescription className="font-medium text-gray-500 dark:text-zinc-400">
                Enter the 6-digit code from your authenticator app, a recovery code, or your Serial key.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handle2FAVerify} className="space-y-4 mt-2">
              {twoFactorError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl dark:bg-red-950/30 dark:border-red-900/30 dark:text-red-400">
                  {twoFactorError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700 tracking-wide ml-1 dark:text-zinc-200">
                  Verification Code
                </label>
                <Input
                  type="text"
                  placeholder="000000, Recovery Code, or Serial key"
                  className="w-full bg-white border border-gray-300 rounded-[10px] text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5484D] focus-visible:border-gray-300 text-center tracking-widest font-semibold h-12 text-lg dark:bg-zinc-800 dark:border-zinc-700 dark:focus-visible:ring-[#E5484D] dark:focus-visible:border-zinc-700 dark:text-zinc-100"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={twoFactorLoading}
                  className="w-full h-11 bg-[#E5484D] hover:bg-[#c93b40] text-white font-semibold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 group rounded-xl"
                >
                  {twoFactorLoading ? (
                    <>
                      <i className="ph-bold ph-spinner animate-spin"></i>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <i className="ph-bold ph-lock-key"></i>
                      Verify & Log In
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShow2FAModal(false);
                    setTwoFactorCode("");
                    setTwoFactorError("");
                  }}
                  className="w-full text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Account Modal */}
        <Dialog open={showCreateAccountModal} onOpenChange={setShowCreateAccountModal}>
          <DialogContent className="max-w-md rounded-[20px] border-gray-100 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2 dark:text-zinc-50">
                <i className="ph-fill ph-info text-[#E5484D]"></i>
                Account Registration
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-gray-600 dark:text-zinc-400 mt-2">
                Contact your admin to create your account.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
