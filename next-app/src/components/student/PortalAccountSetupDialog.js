"use client";

import { useState } from "react";
import AccountSetupPreferences from "@/components/shared/AccountSetupPreferences";
import AccountSetupSteps from "@/components/shared/AccountSetupSteps";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { validateSecurityAnswer } from "@/lib/authSchemas";
import { normalizeChecklistStudentNo, STUDENT_AFFILIATIONS } from "@/lib/studentAffiliation";

const SETUP_STEPS = [
  { title: "Portal Profile", description: "Choose your affiliation and add your student number." },
  { title: "Security Questions", description: "Set up your account recovery questions." },
  { title: "Preferences", description: "Choose your avatar and display name format." },
];
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-gray-700 dark:text-zinc-300";

async function requestSetup(url, method = "GET", body) {
  const csrf = document.cookie.match(/(?:^|;\s*)pup_csrf=([^;]+)/)?.[1];
  const response = await fetch(url, {
    method,
    ...(body && {
      headers: {
        "Content-Type": "application/json",
        ...(csrf && { "X-CSRF-Token": decodeURIComponent(csrf) }),
      },
      body: JSON.stringify(body),
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Could not save account setup. Try again.");
  return result;
}

export default function PortalAccountSetupDialog({ user, required, onClose, onSave }) {
  const [affiliation, setAffiliation] = useState(required ? "" : user.client_type);
  const [number, setNumber] = useState(user.checklist_student_no || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState(null);
  const [answers, setAnswers] = useState({});
  const [savedAvatar, setSavedAvatar] = useState(null);

  const needsStudentNumber = affiliation === "Student" && !user.student_no;

  async function save({ avatar, nameFormat } = {}) {
    if (saving || !affiliation) return;
    const studentNumber = normalizeChecklistStudentNo(number);
    if (needsStudentNumber && !studentNumber && (required || number.trim())) {
      setError("Enter a valid student number for the Document Checklist.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (required && step === 0) {
        if (!questions) {
          const result = await requestSetup("/api/staff/security");
          setQuestions(result.data.questions);
        }
        setStep(1);
        return;
      }

      if (required && step === 1) {
        const payload = [];
        for (const question of questions) {
          const answer = (answers[question.id] || "").trim();
          if (!answer) {
            if (question.is_required && !question.hasAnswer) {
              throw new Error("Answer all required security questions.");
            }
            continue;
          }
          const validation = validateSecurityAnswer(answer, question.question);
          if (!validation.valid) throw new Error(validation.error);
          payload.push({ questionId: question.id, answer });
        }

        if (payload.length) {
          await requestSetup("/api/staff/security", "PUT", { answers: payload });
          setQuestions(questions.map((question) => answers[question.id]?.trim()
            ? { ...question, hasAnswer: true }
            : question));
          setAnswers({});
        }
        setStep(2);
        return;
      }

      if (nameFormat) {
        await requestSetup("/api/auth/preferences", "POST", {
          preferences: { display_name_format: nameFormat },
        });
      }
      const avatarKey = avatar && JSON.stringify(avatar);
      if (avatarKey && avatarKey !== savedAvatar) {
        await requestSetup("/api/account/avatar", "POST", avatar);
        setSavedAvatar(avatarKey);
      }

      await requestSetup("/api/auth/update-profile", "POST", {
        fname: user.fname, lname: user.lname, mname: user.mname, student_no: user.student_no,
        client_type: affiliation,
        ...(needsStudentNumber ? { checklist_student_no: studentNumber || "" } : {}),
      });
      await onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !required && !saving) onClose(); }}>
      <DialogContent
        className="flex h-[85vh] max-h-screen flex-col overflow-hidden rounded-2xl border border-border bg-white p-0 shadow-2xl shadow-black/5 sm:max-w-2xl md:h-[500px] md:flex-row dark:border-border dark:bg-card dark:shadow-none"
        hideClose={required || saving}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Account Setup</DialogTitle>
          <DialogDescription>Complete your portal profile to continue.</DialogDescription>
        </DialogHeader>

        <AccountSetupSteps
          activeIndex={step}
          steps={required ? SETUP_STEPS : SETUP_STEPS.slice(0, 1)}
          className="max-md:max-h-[40%] max-md:border-r-0 max-md:border-b"
        />

        <div className="flex min-h-0 w-full flex-col bg-white md:w-2/3 dark:bg-card">
          <form
            hidden={step === 2}
            onSubmit={(event) => { event.preventDefault(); save(); }}
            className={step === 2 ? "hidden" : "flex min-h-0 flex-1 flex-col justify-between"}
          >
            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              {step === 0 && (
                <>
                  <div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50">
                      Set Up Your Portal Profile
                    </h3>
                    <p className="mt-1 text-[13px] leading-normal text-gray-500 dark:text-zinc-400">
                      {required
                        ? "Current students need their student number to check their document records."
                        : "Update your affiliation or student number for the Document Checklist."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label id="portal-affiliation-label" className="text-xs font-semibold mb-1.5 block uppercase tracking-[0.04em] text-gray-600 dark:text-zinc-400">
                        Affiliation
                      </label>
                      <Select
                        id="portal-affiliation"
                        aria-labelledby="portal-affiliation-label"
                        value={affiliation}
                        placeholder="Choose an affiliation"
                        onChange={(event) => setAffiliation(event.target.value)}
                        disabled={saving}
                        className="h-10 rounded-xl border border-gray-200 bg-white text-xs font-normal text-gray-700 shadow-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                      >
                        {STUDENT_AFFILIATIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </Select>
                    </div>

                    {needsStudentNumber && (
                      <div>
                        <label htmlFor="portal-student-number" className="text-xs font-semibold mb-1.5 block uppercase tracking-[0.04em] text-gray-600 dark:text-zinc-400">
                          Student Number
                          {!required && <span className="normal-case tracking-normal opacity-70">(optional)</span>}
                        </label>
                        <Input
                          id="portal-student-number"
                          value={number}
                          onChange={(event) => setNumber(event.target.value)}
                          placeholder="2024-00123-SJ-0"
                          maxLength={31}
                          required={required}
                          disabled={saving}
                          className="h-10 rounded-xl border border-gray-200 bg-white text-xs font-normal text-gray-900 shadow-none focus-visible:border-pup-maroon focus-visible:ring-1 focus-visible:ring-pup-maroon dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Security Questions</h3>
                  {questions.length === 0 && (
                    <p className="text-[13px] text-muted-foreground">Your campus has no security questions configured. You can continue to preferences.</p>
                  )}
                  {questions.map((question) => (
                    <div key={question.id}>
                      <label htmlFor={`portal-answer-${question.id}`} className={LABEL_CLASS}>
                        {question.question}{!question.is_required && <> <span className="normal-case tracking-normal opacity-70">(optional)</span></>}
                      </label>
                      <Input
                        id={`portal-answer-${question.id}`}
                        type="text"
                        autoComplete="off"
                        required={question.is_required && !question.hasAnswer}
                        placeholder={question.hasAnswer ? "Answer saved" : "Enter your answer"}
                        value={answers[question.id] || ""}
                        onChange={(event) => setAnswers({ ...answers, [question.id]: event.target.value })}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
            </div>

            <div className="flex shrink-0 justify-end gap-2.5 p-5 sm:p-6">
              {required && step > 0 && (
                <Button type="button" variant="outline" disabled={saving} onClick={() => {
                  setError("");
                  setStep(step - 1);
                }}>
                  Back
                </Button>
              )}
              {!required && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={onClose}
                  className="h-9 px-4 text-xs font-semibold"
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={saving || !affiliation} className="h-9 px-4 text-xs font-semibold">
                {required
                  ? (saving ? "Please Wait…" : "Continue")
                  : (saving ? "Saving Account Setup…" : "Save Account Setup")}
              </Button>
            </div>
          </form>
          {required && questions && (
            <div className={step === 2 ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
              <AccountSetupPreferences
                authUser={user}
                saving={saving}
                error={error}
                onBack={() => { setError(""); setStep(1); }}
                onComplete={save}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
