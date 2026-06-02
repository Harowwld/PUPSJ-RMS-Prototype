"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select } from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState("login"); // "login" or "forgot"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [tempToken, setTempToken] = useState("");

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

  function handleLogin(e) {
    e.preventDefault();
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
      <div className="h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 transition-colors duration-300 dark:bg-background">
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]">
          <i className="ph-fill ph-bank text-[800px] absolute -right-20 -bottom-40 rotate-12 text-pup-maroon dark:text-primary"></i>
        </div>

        <div className={`w-full ${view === "login" ? "max-w-[480px]" : "max-w-lg"} transition-all duration-300 p-4 animate-fade-up z-10`}>
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-md mb-4 border border-pup-border dark:bg-white/5 dark:border-white/10">
              <i className="ph-bold ph-bank text-5xl text-pup-maroon dark:text-primary"></i>
            </div>
            <h1 className="text-3xl font-black text-pup-maroon dark:text-primary tracking-tighter leading-none">
              PUP E-Manage
            </h1>
            <p className="text-sm font-bold text-gray-500 tracking-[0.2em] mt-2 dark:text-zinc-400">
              Student Record Keeping System
            </p>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-gray-200/50 p-12 transition-colors dark:bg-white/5 dark:border-white/5 dark:shadow-black/50">
            {view === "login" ? (
              <>
                <div className="mb-6 border-t border-gray-50 pt-6 flex flex-col gap-0.5 dark:border-white/5">
                  <h2 className="text-lg font-black text-gray-900 tracking-tight text-left leading-tight dark:text-zinc-50">Account Login</h2>
                  <p className="text-xs font-medium text-gray-500 text-left leading-tight dark:text-zinc-400">
                    Enter your details to sign in.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <div className="relative group">
                      <label className="absolute left-4 top-1.5 text-[8px] font-black tracking-[0.15em] text-gray-400 pointer-events-none transition-all duration-300 group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-primary">
                        Email Address
                      </label>
                      <Input
                        type="text"
                        id="username"
                        className="pt-6 pb-2 px-4 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-pup-maroon/5 focus-visible:border-pup-maroon/20 focus-visible:outline-none transition-all duration-300 h-12 dark:bg-white/5 dark:border-white/10 dark:text-zinc-50 dark:focus-visible:bg-white/10 dark:focus-visible:ring-primary/10 dark:focus-visible:border-primary/30"
                        placeholder="e.g. administrator@pup.edu.ph"
                        required
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="relative group">
                      <label className="absolute left-4 top-1.5 text-[8px] font-black tracking-[0.15em] text-gray-400 pointer-events-none transition-all duration-300 group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-primary">
                        Password
                      </label>                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        className="pt-6 pb-2 pl-4 pr-12 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-pup-maroon/5 focus-visible:border-pup-maroon/20 focus-visible:outline-none transition-all duration-300 h-12 dark:bg-white/5 dark:border-white/10 dark:text-zinc-50 dark:focus-visible:bg-white/10 dark:focus-visible:ring-primary/10 dark:focus-visible:border-primary/30"
                        placeholder="••••••••"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-[60%] -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-primary transition-colors z-10 dark:text-zinc-500"
                      >
                        <i className={`ph-bold ${showPassword ? "ph-eye-slash" : "ph-eye"} text-base`}></i>
                      </button>
                    </div>
                  </div>

                  {error ? (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl animate-in shake-1 dark:bg-red-950/30 dark:border-red-900/30">
                      <div className="flex gap-2">
                        <i className="ph-fill ph-warning-circle text-red-500 text-base"></i>
                        <p className="text-[11px] font-bold text-red-800 leading-snug dark:text-red-400">{error}</p>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 btn-brand-red text-white font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none group"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                         <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                         <span>Authenticating...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 tracking-widest font-black text-xs">
                         <span>Log In</span>
                         <i className="ph-bold ph-arrow-right group-hover:translate-x-1 transition-transform"></i>
                      </div>
                    )}
                  </Button>
                  <div className="text-center pt-3 border-t border-gray-50 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-[9px] font-black tracking-widest text-gray-400 hover:text-pup-maroon dark:hover:text-primary transition-colors dark:text-zinc-500"
                    >
                      Account Recovery
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="mb-6 border-t border-gray-50 pt-6 flex flex-col gap-0.5 dark:border-white/5">
                  <h2 className="text-lg font-black text-gray-900 tracking-tight text-left leading-tight dark:text-zinc-50">Account Recovery</h2>
                  <p className="text-xs font-medium text-gray-500 text-left leading-tight dark:text-zinc-400">
                    {forgotStep === 1
                      ? "Identify your account to begin recovery."
                      : "Answer your security question to reset."}
                  </p>
                </div>

                {forgotStep === 1 ? (
                  <form onSubmit={handleForgotIdentify} className="space-y-4">
                    {forgotError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl animate-in shake-1 dark:bg-red-950/30 dark:border-red-900/30">
                        <p className="text-[11px] font-bold text-red-800 dark:text-red-400">{forgotError}</p>
                      </div>
                    )}
                    <div className="relative group">
                      <label className="absolute left-4 top-1.5 text-[8px] font-black tracking-[0.15em] text-gray-400 pointer-events-none transition-all duration-300 group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-primary">
                        Identifier
                      </label>
                      <Input
                        type="text"
                        placeholder="Email address or Staff ID"
                        className="pt-6 pb-2 px-4 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-pup-maroon/5 focus-visible:border-pup-maroon/20 focus-visible:outline-none transition-all duration-300 h-12 dark:bg-white/5 dark:border-white/10 dark:text-zinc-50 dark:focus-visible:bg-white/10 dark:focus-visible:ring-primary/10 dark:focus-visible:border-primary/30"
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full h-11 btn-brand-red text-white font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 group"
                      >
                        {forgotLoading ? (
                           <div className="flex items-center gap-2">
                             <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                             <span>Locating...</span>
                           </div>
                        ) : (
                          <div className="flex items-center gap-2 tracking-widest font-black text-xs">
                             <span>Locate Account</span>
                             <i className="ph-bold ph-magnifying-glass group-hover:scale-110 transition-transform"></i>
                          </div>
                        )}
                      </Button>
                      <div className="text-center pt-3 border-t border-gray-50 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setView("login");
                            resetForgotState();
                          }}
                          className="text-[9px] font-black tracking-widest text-gray-400 hover:text-pup-maroon dark:hover:text-primary transition-colors dark:text-zinc-500"
                        >
                          Back to Login
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleForgotReset} className="space-y-4">
                    {forgotError && (
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl animate-in shake-1 dark:bg-red-950/30 dark:border-red-900/30">
                        <p className="text-[11px] font-bold text-red-800 dark:text-red-400">{forgotError}</p>
                      </div>
                    )}

                    <div className="relative group">
                      <label className="absolute left-4 top-1.5 text-[8px] font-black tracking-[0.15em] text-gray-400 pointer-events-none transition-all duration-300 group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-primary">
                        Challenge Question
                      </label>
                      <Select
                        className="pt-6 pb-2 px-3 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-pup-maroon/5 focus:border-pup-maroon/20 outline-none transition-all duration-300 h-12 w-full appearance-none dark:bg-white/5 dark:border-white/10 dark:text-zinc-50 dark:focus:ring-primary/10 dark:focus:border-primary/30"
                        value={forgotQuestionId || ""}
                        onChange={(e) => setForgotQuestionId(Number(e.target.value))}
                      >
                        {forgotQuestions.map(q => (
                          <option key={q.id} value={q.id}>{q.question}</option>
                        ))}
                      </Select>
                    </div>

                    <div className="relative group">
                      <label className="absolute left-4 top-1.5 text-[8px] font-black tracking-[0.15em] text-gray-400 pointer-events-none transition-all duration-300 group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-primary">
                        Security Answer
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter answer"
                        className="pt-6 pb-2 px-4 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-pup-maroon/5 focus-visible:border-pup-maroon/20 focus-visible:outline-none transition-all duration-300 h-12 dark:bg-white/5 dark:border-white/10 dark:text-zinc-50 dark:focus-visible:bg-white/10 dark:focus-visible:ring-primary/10 dark:focus-visible:border-primary/30"
                        value={forgotAnswer}
                        onChange={(e) => setForgotAnswer(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="relative group">
                        <label className="absolute left-4 top-1.5 text-[8px] font-black tracking-[0.15em] text-gray-400 pointer-events-none transition-all duration-300 group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-primary">
                          New Key
                        </label>
                        <Input
                          type="password"
                          placeholder="Min. 6 chars"
                          className="pt-6 pb-2 px-4 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-pup-maroon/5 focus-visible:border-pup-maroon/20 focus-visible:outline-none transition-all duration-300 h-12 dark:bg-white/5 dark:border-white/10 dark:text-zinc-50 dark:focus-visible:bg-white/10 dark:focus-visible:ring-primary/10 dark:focus-visible:border-primary/30"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="relative group">
                        <label className="absolute left-4 top-1.5 text-[8px] font-black tracking-[0.15em] text-gray-400 pointer-events-none transition-all duration-300 group-focus-within:text-pup-maroon dark:text-zinc-500 dark:group-focus-within:text-primary">
                          Confirm
                        </label>
                        <Input
                          type="password"
                          placeholder="Repeat key"
                          className="pt-6 pb-2 px-4 bg-gray-50 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-pup-maroon/5 focus-visible:border-pup-maroon/20 focus-visible:outline-none transition-all duration-300 h-12 dark:bg-white/5 dark:border-white/10 dark:text-zinc-50 dark:focus-visible:bg-white/10 dark:focus-visible:ring-primary/10 dark:focus-visible:border-primary/30"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        type="submit"
                        disabled={forgotLoading}
                        className="w-full h-11 btn-brand-red text-white font-bold text-sm shadow-sm active:scale-95 transition-all disabled:opacity-50 group"
                      >
                        {forgotLoading ? (
                           <div className="flex items-center gap-2">
                             <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                             <span>Updating...</span>
                           </div>
                        ) : (
                          <div className="flex items-center gap-2 tracking-widest font-black text-xs">
                             <span>Reset Password</span>
                             <i className="ph-bold ph-shield-check group-hover:scale-110 transition-transform"></i>
                          </div>
                        )}
                      </Button>
                      <div className="text-center pt-3 border-t border-gray-50 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => setForgotStep(1)}
                          className="text-[9px] font-black tracking-widest text-gray-400 hover:text-pup-maroon dark:hover:text-primary transition-colors dark:text-zinc-500"
                        >
                          Previous Step
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            ) }

            <div className="text-center mt-8 pt-6 border-t border-gray-100 text-[10px] text-gray-400 tracking-widest font-bold dark:border-white/5 dark:text-zinc-500">
              <p>&copy; 2026 Polytechnic University of the Philippines</p>
            </div>
          </div>
        </div>

        {/* 2FA Modal */}
        <Dialog open={show2FAModal} onOpenChange={(open) => {
          if (!twoFactorLoading) setShow2FAModal(open);
        }}>
          <DialogContent className="max-w-md rounded-brand border-pup-border bg-white dark:border-white/10 dark:bg-white/5">
            <DialogHeader>
              <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2 dark:text-zinc-50">
                <i className="ph-fill ph-shield-check text-pup-maroon dark:text-primary"></i>
                Two-Factor Authentication
              </DialogTitle>
              <DialogDescription className="font-medium text-gray-500 dark:text-zinc-400">
                Enter the 6-digit code from your authenticator app, a recovery code, or your Serial key.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handle2FAVerify} className="space-y-4 mt-2">
              {twoFactorError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-brand dark:bg-red-950/30 dark:border-red-900/30 dark:text-red-400">
                  {twoFactorError}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 tracking-wide ml-1 dark:text-zinc-200">
                  Verification Code
                </label>
                <Input
                  type="text"
                  placeholder="000000, Recovery Code, or Serial key"
                  className="w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-gray-300 text-center tracking-widest font-black h-12 text-lg dark:bg-white/5 dark:border-white/10 dark:focus-visible:ring-primary dark:focus-visible:border-white/20 dark:text-zinc-100"
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
                  className="w-full h-11 btn-brand-red"
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
                  className="w-full text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-white/5 dark:bg-white/2"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
