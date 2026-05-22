"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
    <div className="h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <i className="ph-fill ph-bank text-[800px] absolute -right-20 -bottom-40 rotate-12 text-pup-maroon"></i>
      </div>

      <div className={`w-full ${view === "login" ? "max-w-md" : "max-w-lg"} transition-all duration-300 p-6 animate-fade-up z-10`}>
        <div className="bg-white rounded-2xl border border-pup-border shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-sm mb-4 border border-pup-border">
              <i className="ph-bold ph-bank text-4xl text-pup-maroon"></i>
            </div>
            <h1 className="text-2xl font-bold text-pup-maroon tracking-tight">
              PUP E-Manage
            </h1>
            <p className="text-xs text-gray-600 uppercase tracking-widest mt-1">
              Student Record Keeping System
            </p>
          </div>

          {view === "login" ? (
            <>
              <div className="mb-6 text-center border-t border-gray-100 pt-6">
                <h2 className="text-lg font-bold text-gray-800">System Login</h2>
                <p className="text-sm text-gray-600">
                  Please enter your credentials to continue.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="block text-xs font-bold text-gray-700 mb-1 uppercase"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <i className="ph-bold ph-envelope-simple absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10"></i>
                    <Input
                      type="text"
                      id="username"
                      className="pl-10 bg-white border border-pup-border rounded-brand text-sm focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                      placeholder="e.g. admin@pup.edu.ph"
                      required
                      autoFocus
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold text-gray-700 uppercase"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-xs text-pup-maroon hover:underline font-medium"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <i className="ph-bold ph-lock-key absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10"></i>
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      className="pl-10 pr-10 bg-white border border-pup-border rounded-brand text-sm focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-pup-maroon transition-colors z-10"
                    >
                      <i className={`ph-bold ${showPassword ? "ph-eye-slash" : "ph-eye"} text-lg`}></i>
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-brand px-3 py-2">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 group mt-2 ${ isLoading ? "opacity-75 cursor-not-allowed" : "" } transition-all`}
                >
                  {isLoading ? (
                    <>
                      <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <span>Log In</span>
                      <i className="ph-bold ph-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6 text-center border-t border-gray-100 pt-6">
                <h2 className="text-lg font-bold text-gray-800">Password Recovery</h2>
                <p className="text-sm text-gray-600">
                  {forgotStep === 1
                    ? "Enter your email or Staff ID to locate your account."
                    : "Answer your security question to reset your password."}
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotIdentify} className="space-y-4">
                  {forgotError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-brand">
                      {forgotError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Email or Staff ID <span className="text-pup-maroon">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. admin or professional.email@pup.edu.ph"
                      className="w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all text-white font-bold shadow-sm rounded-brand"
                    >
                      {forgotLoading ? "Locating..." : "Next Step"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setView("login");
                        resetForgotState();
                      }}
                      className="w-full text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    >
                      Back to Login
                    </Button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-4">
                  {forgotError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-brand">
                      {forgotError}
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-brand">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Security Question</p>
                    <select
                      className="form-select h-11 w-full bg-white border border-gray-300 rounded-brand text-sm px-3 py-2 font-bold text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon"
                      value={forgotQuestionId || ""}
                      onChange={(e) => setForgotQuestionId(Number(e.target.value))}
                    >
                      {forgotQuestions.map(q => (
                        <option key={q.id} value={q.id}>{q.question}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                      Your Answer <span className="text-pup-maroon">*</span>
                    </label>
                    <Input
                      type="password"
                      placeholder="Answer"
                      className="w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                      value={forgotAnswer}
                      onChange={(e) => setForgotAnswer(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        New Password <span className="text-pup-maroon">*</span>
                      </label>
                      <Input
                        type="password"
                        placeholder="Min. 6 chars"
                        className="w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        Confirm <span className="text-pup-maroon">*</span>
                      </label>
                      <Input
                        type="password"
                        placeholder="Confirm"
                        className="w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all text-white font-bold shadow-sm rounded-brand"
                    >
                      {forgotLoading ? "Resetting..." : "Reset Password"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setForgotStep(1)}
                      className="w-full text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    >
                      Back
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          <div className="text-center mt-8 pt-6 border-t border-gray-100 text-[10px] text-gray-400 uppercase tracking-widest font-bold">
            <p>&copy; 2026 Polytechnic University of the Philippines</p>
          </div>
        </div>
      </div>

      {/* 2FA Modal */}
      <Dialog open={show2FAModal} onOpenChange={(open) => {
        if (!twoFactorLoading) setShow2FAModal(open);
      }}>
        <DialogContent className="max-w-md rounded-brand border-pup-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
              <i className="ph-fill ph-shield-check text-pup-maroon"></i>
              Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="font-medium text-gray-500">
              Enter the 6-digit code from your authenticator app, a recovery code, or your Serial Key.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handle2FAVerify} className="space-y-4 mt-2">
            {twoFactorError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-brand">
                {twoFactorError}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide ml-1">
                Verification Code
              </label>
              <Input
                type="text"
                placeholder="000000, Recovery Code, or Serial Key"
                className="w-full bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon text-center tracking-widest font-black h-12 text-lg"
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
                className="w-full h-11 bg-linear-to-b from-red-800 to-pup-maroon border border-pup-darkMaroon hover:from-red-700 hover:to-red-900 hover:shadow-md transition-all text-white font-black shadow-sm rounded-brand uppercase tracking-widest flex items-center justify-center gap-2"
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
                className="w-full text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
