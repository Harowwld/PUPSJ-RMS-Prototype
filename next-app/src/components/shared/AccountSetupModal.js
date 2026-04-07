"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountSetupModal({ authUser }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = Password, 2 = Security

  const needsPassword = authUser?.mustChangePassword;
  const needsSecurity = authUser?.mustSetSecurityQuestions;

  // Password state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  // Security state
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [secLoading, setSecLoading] = useState(false);
  const [secSubmitting, setSecSubmitting] = useState(false);
  const [secError, setSecError] = useState("");

  useEffect(() => {
    if (needsPassword || needsSecurity) {
      setOpen(true);
      if (needsPassword) {
        setStep(1);
      } else {
        setStep(2);
        fetchQuestions();
      }
    } else {
      setOpen(false);
    }
  }, [needsPassword, needsSecurity]);

  const fetchQuestions = async () => {
    setSecLoading(true);
    try {
      const res = await fetch("/api/staff/security");
      const json = await res.json();
      if (json.ok && json.data?.questions) {
        setQuestions(json.data.questions);
      }
    } catch (e) {
      console.error(e);
    }
    setSecLoading(false);
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (pwLoading) return;
    if (!pwCurrent || !pwNext || !pwConfirm) {
      setPwError("Please fill all fields");
      return;
    }
    if (pwNext !== pwConfirm) {
      setPwError("New passwords do not match");
      return;
    }
    if (pwNext.length < 6) {
      setPwError("Password must be at least 6 characters");
      return;
    }

    setPwError("");
    setPwLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to change password");

      toast.success("Password Updated", { description: "Your new credentials are now active." });
      
      if (needsSecurity) {
        setStep(2);
        fetchQuestions();
      } else {
        setOpen(false);
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      setPwError(err?.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  const submitSecurity = async (e) => {
    e.preventDefault();
    if (secSubmitting) return;

    for (const q of questions) {
      if (!answers[q.id] || !answers[q.id].trim()) {
        setSecError("Please provide an answer for all questions.");
        return;
      }
    }

    setSecError("");
    setSecSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id].trim()
      }));

      const res = await fetch("/api/staff/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to save answers");

      toast.success("Account Setup Complete", { description: "Your account is now fully secured." });
      setOpen(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setSecError(err?.message || "Failed to save answers");
    } finally {
      setSecSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-brand flex md:flex-row flex-col h-[85vh] md:h-[600px] max-h-screen" hideClose>
        {/* Sidebar Tabs */}
        <div className="w-full md:w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col gap-3 shrink-0 overflow-y-auto">
          <div className="mb-2">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest px-1">Account Setup</h3>
            <p className="text-[11px] text-gray-400 font-medium px-1 mt-0.5 leading-tight">Complete these steps to access your dashboard securely.</p>
          </div>
          
          <div className={`px-4 py-3 rounded-brand flex flex-col gap-1 transition-all ${step === 1 ? 'bg-white shadow-sm border border-gray-200 scale-100 opacity-100' : 'opacity-40 grayscale scale-95'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <i className={`text-lg ${needsPassword && step > 1 ? 'ph-fill ph-check-circle text-emerald-500' : 'ph-duotone ph-password text-pup-maroon'}`}></i>
                <span className="text-sm font-black text-gray-900">Step 1</span>
              </div>
              {needsPassword && step > 1 && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full">Done</span>}
            </div>
            <span className="text-xs font-bold text-gray-600 pl-7">Change Password</span>
            <p className="text-[10px] text-gray-500 pl-7 mt-0.5 leading-tight">Update your default system password.</p>
          </div>

          <div className={`px-4 py-3 rounded-brand flex flex-col gap-1 transition-all ${step === 2 ? 'bg-white shadow-sm border border-gray-200 scale-100 opacity-100' : 'opacity-40 grayscale scale-95'}`}>
            <div className="flex items-center gap-2">
              <i className="ph-duotone ph-shield-check text-lg text-pup-maroon"></i>
              <span className="text-sm font-black text-gray-900">Step 2</span>
            </div>
            <span className="text-xs font-bold text-gray-600 pl-7">Security Answers</span>
            <p className="text-[10px] text-gray-500 pl-7 mt-0.5 leading-tight">Set up your account recovery questions.</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full md:w-2/3 flex flex-col bg-white">
          {step === 1 && (
            <>
              <DialogHeader className="p-6 border-b border-gray-100 bg-white shrink-0">
                <DialogTitle className="text-xl font-black tracking-tight text-gray-900">
                  Update Default Password
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                  You are logging in for the first time. Please change your default password to continue using the system securely.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submitPassword} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  {pwError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-2">
                      <i className="ph-bold ph-warning-circle text-lg"></i>
                      {pwError}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Current Password <span className="text-pup-maroon">*</span></label>
                    <Input
                      type="password"
                      className="h-11 bg-gray-50 border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon font-bold text-gray-900"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      placeholder="e.g. pupstaff"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">New Password <span className="text-pup-maroon">*</span></label>
                    <Input
                      type="password"
                      className="h-11 bg-gray-50 border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon font-bold text-gray-900"
                      value={pwNext}
                      onChange={(e) => setPwNext(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Confirm New Password <span className="text-pup-maroon">*</span></label>
                    <Input
                      type="password"
                      className="h-11 bg-gray-50 border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon font-bold text-gray-900"
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      placeholder="Must match new password"
                      required
                    />
                  </div>
                </div>
                <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                  <Button type="submit" disabled={pwLoading} className="bg-pup-maroon text-white h-11 px-6 font-bold shadow-sm hover:bg-red-900 transition-colors uppercase tracking-widest text-xs">
                    {pwLoading ? "Saving..." : (needsSecurity ? "Next: Security Questions" : "Save Password & Enter")}
                  </Button>
                </div>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <DialogHeader className="p-6 border-b border-gray-100 bg-white shrink-0">
                <DialogTitle className="text-xl font-black tracking-tight text-gray-900">
                  Recovery Questions
                </DialogTitle>
                <DialogDescription className="text-sm font-medium mt-1 text-gray-600">
                  Set up your security questions to recover your account if you forget your password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submitSecurity} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                  {secError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-2">
                      <i className="ph-bold ph-warning-circle text-lg"></i>
                      {secError}
                    </div>
                  )}
                  {secLoading ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-11 w-full rounded-brand" />
                      </div>
                    ))
                  ) : questions.length === 0 ? (
                    <div className="text-sm text-gray-500 font-medium">No global security questions have been configured.</div>
                  ) : (
                    questions.map((q) => (
                      <div key={q.id}>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5 tracking-wide leading-tight uppercase">
                          {q.question} <span className="text-pup-maroon">*</span>
                        </label>
                        <Input
                          type="password"
                          placeholder="Enter your answer"
                          className="w-full h-11 bg-gray-50 border-gray-300 rounded-brand text-sm focus-visible:ring-pup-maroon font-bold text-gray-900"
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          required
                        />
                      </div>
                    ))
                  )}
                </div>
                <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
                  <Button type="submit" disabled={secLoading || secSubmitting || questions.length === 0} className="bg-pup-maroon text-white h-11 px-6 font-bold shadow-sm hover:bg-red-900 transition-colors uppercase tracking-widest text-xs">
                    {secSubmitting ? "Saving..." : "Complete Setup & Enter"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
