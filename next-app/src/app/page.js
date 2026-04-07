"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const adminUsernames = ["admin", "admin", "registrar", "head_registrar"];

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot Password State
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotUserId, setForgotUserId] = useState(null);
  const [forgotQuestion, setForgotQuestion] = useState("");
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const resetForgotState = () => {
    setForgotStep(1);
    setForgotIdentifier("");
    setForgotUserId(null);
    setForgotQuestion("");
    setForgotAnswer("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
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
      setForgotQuestion(json.data.question);
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
          answer: forgotAnswer.trim(),
          newPassword: forgotNewPassword
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to reset password.");
      }
      toast.success("Password Reset Successful", { description: "You can now log in with your new password." });
      setIsForgotOpen(false);
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

  return (
    <div className="h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
        <i className="ph-fill ph-bank text-[800px] absolute -right-20 -bottom-40 rotate-12 text-pup-maroon"></i>
      </div>

      <div className="w-full max-w-md p-6 animate-fade-up z-10">
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

        <div className="bg-white rounded-brand border border-pup-border shadow-sm p-8">
          <div className="mb-6">
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
                Username
              </label>
              <div className="relative">
                <i className="ph-bold ph-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
                <input
                  type="text"
                  id="username"
                  className="form-input has-left-icon"
                  placeholder="Enter your ID (e.g., admin)"
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
              </div>
              <div className="relative">
                <i className="ph-bold ph-lock-key absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"></i>
                <input
                  type="password"
                  id="password"
                  className="form-input has-left-icon"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(true)}
                  className="text-xs text-pup-maroon hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            {error ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-brand px-3 py-2">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-pup-maroon text-white py-3 rounded-brand font-bold text-sm hover:bg-red-900 transition-all shadow-sm flex items-center justify-center gap-2 group mt-2 ${
                isLoading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isLoading ? (
                <>
                  <i className="ph-bold ph-spinner animate-spin text-lg"></i>
                  Authenticating...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <i className="ph-bold ph-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-8 text-xs text-gray-500">
          <p>&copy; 2026 Polytechnic University of the Philippines</p>
        </div>
      </div>

      <Dialog open={isForgotOpen} onOpenChange={(open) => {
        setIsForgotOpen(open);
        if (!open) resetForgotState();
      }}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand">
          <DialogHeader className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border border-red-100 bg-red-50 text-pup-maroon shadow-sm flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-lock-key text-2xl"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-black tracking-tight text-gray-900">
                  Password Recovery
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                  {forgotStep === 1
                    ? "Enter your email or Staff ID to locate your account."
                    : "Answer your security question to reset your password."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {forgotStep === 1 ? (
            <form onSubmit={handleForgotIdentify}>
              <div className="p-6">
                {forgotError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-brand">
                    {forgotError}
                  </div>
                )}
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Email or Staff ID <span className="text-pup-maroon">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. admin or professional.email@pup.edu.ph"
                  className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsForgotOpen(false)}
                  className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
                >
                  {forgotLoading ? "Locating..." : "Next Step"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotReset}>
              <div className="p-6 space-y-4">
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-brand">
                    {forgotError}
                  </div>
                )}

                <div className="p-3 bg-gray-50 border border-gray-200 rounded-brand">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Security Question</p>
                  <p className="text-sm font-bold text-gray-900">{forgotQuestion}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Your Answer <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Answer"
                    className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                    value={forgotAnswer}
                    onChange={(e) => setForgotAnswer(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    New Password <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Min. 6 alphanumeric characters"
                    className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
                    Confirm New Password <span className="text-pup-maroon">*</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Must match the entry above"
                    className="w-full h-10 bg-white border border-gray-300 rounded-brand text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon focus-visible:border-pup-maroon"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-white flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotStep(1)}
                  className="h-10 px-5 text-sm font-bold border-gray-300 text-gray-700 hover:bg-gray-50 rounded-brand"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="h-10 px-5 bg-pup-maroon text-white font-bold shadow-sm hover:bg-red-900 rounded-brand"
                >
                  {forgotLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
