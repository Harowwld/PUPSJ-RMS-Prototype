"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select } from "@/components/ui/select";
import { PageTransition } from "@/components/ui/motion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isSystemAdminRole, isAdminRole } from "@/lib/roleUtils";

function formatRegistrarStudentName({ firstName, middleName, lastName }) {
  const first = String(firstName || "").trim().replace(/\s+/g, " ").toUpperCase();
  const last = String(lastName || "").trim().replace(/\s+/g, " ").toUpperCase();
  const middleLetters = String(middleName || "").replace(/[^a-z]/gi, "");
  const middleInitial = middleLetters ? ` ${middleLetters[0].toUpperCase()}.` : "";
  return first && last ? `${last}, ${first}${middleInitial}` : "";
}

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
  const [studentSignup, setStudentSignup] = useState({ firstName: "", middleName: "", lastName: "", email: "", password: "", confirmPassword: "" });
  const [studentSignupError, setStudentSignupError] = useState("");
  const [studentSignupLoading, setStudentSignupLoading] = useState(false);
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [middleNameFocused, setMiddleNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailSignupFocused, setEmailSignupFocused] = useState(false);
  const [signupPassFocused, setSignupPassFocused] = useState(false);
  const [signupConfirmFocused, setSignupConfirmFocused] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const resetStudentSignupState = () => {
    setStudentSignup({ firstName: "", middleName: "", lastName: "", email: "", password: "", confirmPassword: "" });
    setStudentSignupError("");
    setStudentSignupLoading(false);
    setFirstNameFocused(false);
    setMiddleNameFocused(false);
    setLastNameFocused(false);
    setEmailSignupFocused(false);
    setSignupPassFocused(false);
    setSignupConfirmFocused(false);
    setShowSignupPassword(false);
  };

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

    // Dynamic favicon swap for login page
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    link.href = '/login-logo.png';
    document.getElementsByTagName('head')[0].appendChild(link);
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
      setEmailError("Enter your email address or student number.");
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

        if (isSystemAdminRole(role)) {
          router.push("/systemadmin");
          return;
        }
        if (isAdminRole(role)) {
          router.push("/admin");
          return;
        }
        if (role.toLowerCase() === "student") {
          router.push("/student");
          return;
        }

        router.push("/staff");
      } catch (err) {
        setError(err?.message || "Invalid username or password.");
        setIsLoading(false);
      }
    })();
  }

  async function handleStudentSignup(e) {
    e.preventDefault();
    if (!studentSignup.firstName.trim() || !studentSignup.lastName.trim()) {
      setStudentSignupError("First name and last name are required.");
      return;
    }
    if (!studentSignup.email.trim() || !validateEmail(studentSignup.email.trim())) {
      setStudentSignupError("A valid email address is required.");
      return;
    }
    if (studentSignup.password.length < 8) {
      setStudentSignupError("Password must be at least 8 characters.");
      return;
    }
    if (studentSignup.password !== studentSignup.confirmPassword) {
      setStudentSignupError("Passwords do not match.");
      return;
    }

    setStudentSignupError("");
    setStudentSignupLoading(true);
    try {
      const formattedName = formatRegistrarStudentName(studentSignup);
      const res = await fetch("/api/auth/student/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName,
          firstName: studentSignup.firstName.trim(),
          middleName: studentSignup.middleName.trim(),
          lastName: studentSignup.lastName.trim(),
          email: studentSignup.email.trim(),
          password: studentSignup.password,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to create student account.");
      }

      localStorage.setItem("pup-session-recovered", Date.now().toString());
      localStorage.removeItem("pup-logout");
      toast.success("Account Created", { description: "Welcome to eManage Student Portal!" });
      resetStudentSignupState();
      router.push("/student");
    } catch (err) {
      setStudentSignupError(err?.message || "Unable to create student account.");
    } finally {
      setStudentSignupLoading(false);
    }
  }

  const formattedStudentSignupName = formatRegistrarStudentName(studentSignup);

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
      if (isSystemAdminRole(role)) {
        router.push("/systemadmin");
      } else if (isAdminRole(role)) {
        router.push("/admin");
      } else if (role.toLowerCase() === "student") {
        router.push("/student");
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
      <PageTransition className="min-h-screen w-full flex items-center justify-center relative bg-slate-50 dark:bg-zinc-950 font-sans p-8 overflow-y-auto">
        {/* Dynamic Liquid Glass Background Blobs */}
        <div className="liquid-container">
          <div className="liquid-blob liquid-blob-1"></div>
          <div className="liquid-blob liquid-blob-2"></div>
          <div className="liquid-blob liquid-blob-3"></div>
        </div>

        {/* Top-Left Brand Logo & Name */}
        <div className="absolute top-6 left-6 flex items-center gap-1 select-none z-20">
          <img src="/login-logo.png" alt="eManage Logo" className="w-[32px] h-[32px] shrink-0 object-contain p-0.5" />
          <span className="text-[26px] font-semibold text-[#1D1D1F] dark:text-zinc-50 tracking-tight leading-none">eManage</span>
        </div>

        <div className="w-full max-w-[550px] p-4 z-10">
          <div
            className="bg-white rounded-[20px] shadow-[0_4px_40px_rgba(0,0,0,0.12)] dark:bg-zinc-900 flex flex-col items-center w-full relative transition-all duration-300"
            style={{
              padding: view === "student-signup" ? "36px 44px 32px 44px" : "56px 52px",
              minHeight: "630px",
              height: view === "student-signup" ? "auto" : "630px",
            }}
          >
            {/* APP ICON WITH CONCENTRIC CIRCLES */}
            <div
              className={`relative flex items-center justify-center select-none shrink-0 transition-all duration-300 ${
                view === "student-signup" ? "w-[100px] h-[100px] mb-2" : "w-[160px] h-[160px] mb-3"
              }`}
              style={{
                width: view === "student-signup" ? "100px" : "160px",
                height: view === "student-signup" ? "100px" : "160px",
                flexShrink: 0,
              }}
            >
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
                    
                    // Sage/cream/yellow (hues 60 to 160) should be desaturated and lighter
                    let sat = 78;
                    let light = 70;
                    if (hue >= 60 && hue <= 160) {
                      sat = 35; // desaturated sage/cream
                      light = 76; // lighter
                    } else if (hue > 160 && hue <= 200) {
                      // smooth transition to cyan
                      const ratio = (hue - 160) / 40;
                      sat = 35 + Math.round(ratio * 43);
                      light = 76 - Math.round(ratio * 6);
                    } else if (hue >= 20 && hue < 60) {
                      // smooth transition to orange/cream
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
              src="/login-logo.png" 
              alt="eManage Logo" 
              className={`shrink-0 object-contain p-[2px] z-10 animate-in zoom-in-50 duration-500 transition-all duration-300 ${
                view === "student-signup" ? "w-[22px] h-[22px]" : "w-[30px] h-[30px]"
              }`} 
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
                        <label>Email Address or Student Number</label>
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
                            resetForgotState();
                            setView("forgot");
                          }}
                          className="text-[13px] text-[#E5484D] hover:underline focus:outline-none shrink-0 font-normal"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    )}

                    {/* Student Sign Up Link (Step 1 only) */}
                    {loginStep === 1 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 animate-in fade-in duration-200">
                        <span className="text-[13px] text-[#8E8E93] dark:text-zinc-400 font-normal">
                          Don&apos;t have a student account?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            resetStudentSignupState();
                            setView("student-signup");
                          }}
                          className="text-[13px] text-[#007AFF] hover:underline focus:outline-none font-medium"
                        >
                          Student Sign Up
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Disclaimer Text with Icon (Step 1 only) */}
                  {loginStep === 1 ? (
                    <div className="w-full mt-auto pt-9 mb-[124px] text-left flex flex-col items-start select-none animate-in fade-in duration-200">
                      <i className="ph-fill ph-users text-[23px] text-[#007AFF] mb-1"></i>
                      <p className="w-full text-[11px] text-[#8E8E93] dark:text-zinc-400 leading-normal font-normal">
                        Your eManage account provides secure access to the digitization process and administrative tools. Account activity is logged for security and auditing purposes.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-auto" />
                  )}

                  {/* Continue Button (Always visible at the bottom) */}
                  <div className="absolute bottom-[64px] left-[52px] right-[52px]">
                    <Button
                      type="submit"
                      disabled={isLoading || isStep1Loading || (loginStep === 1 && !username.trim())}
                      className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                    >
                      {isLoading || isStep1Loading ? (
                        <i className="ph-bold ph-spinner animate-spin text-lg flex items-center justify-center"></i>
                      ) : (
                        <span>{loginStep === 1 ? "Continue" : "Sign In"}</span>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            ) : view === "forgot" ? (
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
            ) : (
              <div className="w-full text-center flex-1 flex flex-col animate-in fade-in duration-300">
                <h1 className="login-title text-[24px] font-bold text-[#1D1D1F] dark:text-zinc-50 tracking-tight mb-1">
                  Student Sign Up
                </h1>
                <p className="text-[12px] text-gray-500 dark:text-zinc-400 mb-3 font-normal">
                  Sign up to request and track your student or alumni records.
                </p>

                <form onSubmit={handleStudentSignup} className="w-full flex-1 flex flex-col justify-between">
                  <div className="w-full text-left">
                    {/* Merged Field Container */}
                    <div className={`merged-container bg-white dark:bg-zinc-800 ${
                      studentSignupError ? "has-error" : ""
                    }`}>
                      {/* First Name & Last Name (2 columns) */}
                      <div className="flex w-full border-b border-gray-100 dark:border-zinc-700/50 divide-x divide-gray-100 dark:divide-zinc-700/50">
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${firstNameFocused || studentSignup.firstName.length > 0 ? "active" : ""}`}>
                            <label>First Name</label>
                            <Input
                              type="text"
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.firstName}
                              onFocus={() => setFirstNameFocused(true)}
                              onBlur={() => setFirstNameFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, firstName: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${lastNameFocused || studentSignup.lastName.length > 0 ? "active" : ""}`}>
                            <label>Last Name</label>
                            <Input
                              type="text"
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.lastName}
                              onFocus={() => setLastNameFocused(true)}
                              onBlur={() => setLastNameFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, lastName: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Middle Name (Optional) */}
                      <div className={`field-wrapper border-b border-gray-100 dark:border-zinc-700/50 ${middleNameFocused || studentSignup.middleName.length > 0 ? "active" : ""}`}>
                        <label>Middle Name (Optional)</label>
                        <Input
                          type="text"
                          placeholder=" "
                          className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={studentSignup.middleName}
                          onFocus={() => setMiddleNameFocused(true)}
                          onBlur={() => setMiddleNameFocused(false)}
                          onChange={(e) => {
                            setStudentSignup(cur => ({ ...cur, middleName: e.target.value }));
                            if (studentSignupError) setStudentSignupError("");
                          }}
                        />
                      </div>

                      {/* Email Address */}
                      <div className={`field-wrapper border-b border-gray-100 dark:border-zinc-700/50 ${emailSignupFocused || studentSignup.email.length > 0 ? "active" : ""}`}>
                        <label>Email Address</label>
                        <Input
                          type="email"
                          placeholder=" "
                          className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={studentSignup.email}
                          onFocus={() => setEmailSignupFocused(true)}
                          onBlur={() => setEmailSignupFocused(false)}
                          onChange={(e) => {
                            setStudentSignup(cur => ({ ...cur, email: e.target.value }));
                            if (studentSignupError) setStudentSignupError("");
                          }}
                          required
                        />
                      </div>

                      {/* Password & Confirm Password (2 columns) */}
                      <div className="flex w-full divide-x divide-gray-100 dark:divide-zinc-700/50">
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${signupPassFocused || studentSignup.password.length > 0 ? "active" : ""}`}>
                            <label>Password (8+ chars)</label>
                            <Input
                              type={showSignupPassword ? "text" : "password"}
                              placeholder=" "
                              className="pr-9 focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.password}
                              onFocus={() => setSignupPassFocused(true)}
                              onBlur={() => setSignupPassFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, password: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                              <button
                                type="button"
                                onClick={() => setShowSignupPassword(!showSignupPassword)}
                                className="w-6 h-6 flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] focus:outline-none dark:text-zinc-400 dark:hover:text-zinc-200"
                              >
                                <i className={`ph-bold ${showSignupPassword ? "ph-eye-slash" : "ph-eye"} text-[14px]`}></i>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`field-wrapper ${signupConfirmFocused || studentSignup.confirmPassword.length > 0 ? "active" : ""}`}>
                            <label>Confirm Password</label>
                            <Input
                              type={showSignupPassword ? "text" : "password"}
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0"
                              value={studentSignup.confirmPassword}
                              onFocus={() => setSignupConfirmFocused(true)}
                              onBlur={() => setSignupConfirmFocused(false)}
                              onChange={(e) => {
                                setStudentSignup(cur => ({ ...cur, confirmPassword: e.target.value }));
                                if (studentSignupError) setStudentSignupError("");
                              }}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Registrar format helper */}
                    {formattedStudentSignupName && (
                      <p className="mt-2 text-[11px] text-gray-500 dark:text-zinc-400">
                        Registrar format: <span className="font-semibold text-gray-800 dark:text-zinc-200">{formattedStudentSignupName}</span>
                      </p>
                    )}

                    {/* Error message */}
                    {studentSignupError && (
                      <div className="h-5 mt-1.5 text-left flex items-center gap-1.5 text-[#E5484D] animate-in fade-in duration-200">
                        <i className="ph-bold ph-warning-circle text-[14px] shrink-0 mt-[1px]"></i>
                        <p className="text-[12px] font-normal leading-none">
                          {studentSignupError}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full mt-4 space-y-2.5">
                    <Button
                      type="submit"
                      disabled={studentSignupLoading}
                      className="w-full h-11 rounded-[8px] btn-brand-red text-[13px] font-medium text-white active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center"
                    >
                      {studentSignupLoading ? (
                        <i className="ph-bold ph-spinner animate-spin text-lg flex items-center justify-center"></i>
                      ) : (
                        <span>Create Student Account</span>
                      )}
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          resetStudentSignupState();
                          setView("login");
                        }}
                        className="text-[13px] text-[#E5484D] hover:underline focus:outline-none font-normal"
                      >
                        Back to Login
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Demo Quick-Fill Bar */}
          <div className="mt-3.5 w-full flex flex-col items-center gap-2 select-none animate-in fade-in duration-500 pb-12">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-zinc-400">
              <i className="ph-bold ph-lightning text-amber-500"></i>
              <span>Demo Accounts (Password: <code className="font-mono bg-gray-200/70 dark:bg-zinc-800 px-1 py-0.5 rounded text-[10px] text-gray-700 dark:text-zinc-300">pupstaff</code>)</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 w-full">
              {[
                { label: "SuperAdmin", email: "superadmin@pup.local", badge: "Global", color: "hover:border-slate-800 hover:text-slate-900 dark:hover:text-white" },
                { label: "Registrar Admin", email: "admin.registrar@pup.local", badge: "Registrar", color: "hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400" },
                { label: "Registrar Staff", email: "staff.registrar@pup.local", badge: "Records", color: "hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400" },
                { label: "OSAS Admin", email: "admin.osas@pup.local", badge: "OSAS", color: "hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400" },
                { label: "Student", email: "student@pup.local", badge: "ODRS & Events", color: "hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400" },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => {
                    setView("login");
                    setUsername(acc.email);
                    setPassword("pupstaff");
                    setLoginStep(2);
                    setEmailError("");
                    setPasswordError("");
                    setError("");
                    toast.info(`Selected ${acc.label}`, {
                      description: `${acc.email} • Ready to sign in`,
                    });
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-gray-200/90 dark:border-zinc-700/80 text-gray-600 dark:text-zinc-300 backdrop-blur-md shadow-xs transition-all hover:shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer ${acc.color}`}
                >
                  <span className="font-semibold text-[11px]">{acc.label}</span>
                  <span className="text-[9px] font-medium px-1 py-0.2 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-400">{acc.badge}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FIXED FOOTER */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#f2f2f7] dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 py-6 px-8 flex justify-center text-[11px] text-[#8E8E93] select-none font-sans z-0">
          <div className="w-full max-w-[980px] flex justify-center items-center text-center">
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


      </PageTransition>
    </TooltipProvider>
  );
}
