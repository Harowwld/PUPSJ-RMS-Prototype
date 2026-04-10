"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function AccountPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [username, setUsername] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Password Form State
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");

  // Security Form State
  const [globalQuestions, setGlobalQuestions] = useState([]);
  const [secAnswers, setSecAnswers] = useState({});
  const [secLoading, setSecLoading] = useState(false);
  const [secError, setSecError] = useState("");
  const [hasSetSecurity, setHasSetSecurity] = useState(false);

  const [activeTab, setActiveTab] = useState("profile");

  const isAdminRole = (role) => {
    const normalized = String(role || "").toLowerCase();
    return (
      normalized === "admin" ||
      normalized === "administrator" ||
      normalized === "superadmin"
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const [resAuth, resUserSecurity] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/staff/security")
        ]);

        const json = await resAuth.json().catch(() => null);
        if (!resAuth.ok || !json?.ok) {
          router.push("/");
          return;
        }
        const user = json.data;
        setAuthUser(user);
        setFname(user.fname || "");
        setLname(user.lname || "");
        setUsername(user.email || user.username || "");

        const jsonUserSecurity = await resUserSecurity.json().catch(() => null);
        if (jsonUserSecurity?.ok && jsonUserSecurity.data) {
          setHasSetSecurity(jsonUserSecurity.data.hasAllQuestions);
          if (Array.isArray(jsonUserSecurity.data.questions)) {
            setGlobalQuestions(jsonUserSecurity.data.questions);
          }
        }
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/");
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    if (profileLoading) return;

    if (!fname.trim() || !lname.trim() || !username.trim()) {
      setProfileError("Please fill all required fields.");
      return;
    }

    if (!username.includes("@")) {
      setProfileError("Username must be a valid email address.");
      return;
    }

    setProfileError("");
    setProfileLoading(true);

    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fname: fname.trim(),
          lname: lname.trim(),
          email: username.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update profile");
      }

      toast.success("Profile Updated", {
        description: "Your changes will take effect after the page reloads.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setProfileError(err?.message || "Failed to update profile");
      toast.error("Update Failed", {
        description: err?.message || "Unable to save profile changes.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    if (pwLoading) return;

    if (!pwCurrent || !pwNext || !pwConfirm) {
      setPwError("Please provide all password fields.");
      return;
    }
    if (pwNext !== pwConfirm) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwNext.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }

    setPwError("");
    setPwLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNext,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to change password");
      }

      toast.success("Password Changed", {
        description: "Your new credentials are now active.",
      });
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err?.message || "Failed to change password");
      toast.error("Password Change Failed", {
        description: err?.message || "Unable to update credentials.",
      });
    } finally {
      setPwLoading(false);
    }
  };

  const submitSecurity = async (e) => {
    e.preventDefault();
    if (secLoading) return;

    const payload = [];
    for (const q of globalQuestions) {
      const val = secAnswers[q.id];
      if (val && val.trim()) {
        payload.push({ questionId: q.id, answer: val.trim() });
      }
    }

    if (payload.length === 0) {
      setSecError("Please provide an answer for at least one question to update.");
      return;
    }

    setSecError("");
    setSecLoading(true);

    try {
      const res = await fetch("/api/staff/security", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update security questions");
      }

      toast.success("Security Updated", {
        description: "Your security answers have been saved.",
      });
      setSecAnswers({});

      // Re-fetch to update hasAnswer statuses
      const resUserSecurity = await fetch("/api/staff/security");
      const jsonUserSecurity = await resUserSecurity.json().catch(() => null);
      if (jsonUserSecurity?.ok && jsonUserSecurity.data) {
        setHasSetSecurity(jsonUserSecurity.data.hasAllQuestions);
        if (Array.isArray(jsonUserSecurity.data.questions)) {
          setGlobalQuestions(jsonUserSecurity.data.questions);
        }
      }
    } catch (err) {
      setSecError(err?.message || "Failed to update security questions");
      toast.error("Update Failed", {
        description: err?.message || "Unable to save your security settings.",
      });
    } finally {
      setSecLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50/50">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 shrink-0">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-48 h-6 ml-3" />
        </header>
        <main className="flex-1 p-8 w-full max-w-[1200px] mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="w-64 h-8" />
            <Skeleton className="w-96 h-4" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            <Skeleton className="h-[300px] rounded-brand" />
            <Skeleton className="h-[500px] rounded-brand" />
          </div>
        </main>
      </div>
    );
  }

  const initials =
    authUser?.fname && authUser?.lname
      ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
      : "AD";

  const isSuperAdmin = authUser?.role === "SuperAdmin";
  const roleBadgeColor = isSuperAdmin
    ? "bg-amber-100/50 text-amber-800 border-amber-200"
    : "bg-red-50 text-pup-maroon border-red-100";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30 font-inter selection:bg-pup-maroon selection:text-white">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1200px] mx-auto py-8 px-6">
        {/* Sleek Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-pup-maroon uppercase tracking-widest mb-1">
              <i className="ph-bold ph-gear"></i>
              System Settings
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Account Settings
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Configure your professional identity and security protocol.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              const path = isAdminRole(authUser?.role) ? "/admin" : "/staff";
              router.push(path);
            }}
            className="h-11 px-6 font-black uppercase tracking-widest text-xs border-gray-300 hover:border-pup-maroon hover:text-pup-maroon transition-all shadow-sm flex items-center gap-2 shrink-0 rounded-brand"
          >
            <i className="ph-bold ph-arrow-left"></i>
            Return to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Sidebar Navigation */}
          <aside className="space-y-6 shrink-0">
            <div className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-pup-maroon text-white flex items-center justify-center text-xl font-black shadow-lg shadow-red-900/20 mb-3 border-4 border-white">
                  {initials}
                </div>
                <h3 className="font-black text-gray-900 text-sm tracking-tight truncate w-full px-2">
                  {fname} {lname}
                </h3>
                <div
                  className={`mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${roleBadgeColor}`}
                >
                  {authUser?.role || "User"}
                </div>
              </div>

              <nav className="p-2 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("profile")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-all ${
                    activeTab === "profile"
                      ? "bg-pup-maroon text-white shadow-md shadow-red-900/10"
                      : "text-gray-600 hover:bg-red-50 hover:text-pup-maroon"
                  }`}
                >
                  <i className="ph-bold ph-user-circle text-lg"></i>
                  Profile Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-all ${
                    activeTab === "security"
                      ? "bg-pup-maroon text-white shadow-md shadow-red-900/10"
                      : "text-gray-600 hover:bg-red-50 hover:text-pup-maroon"
                  }`}
                >
                  <i className="ph-bold ph-shield-check text-lg"></i>
                  Security
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/account/activity")}
                  className="flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-all text-gray-600 hover:bg-red-50 hover:text-pup-maroon"
                >
                  <i className="ph-bold ph-clock-counter-clockwise text-lg"></i>
                  Audit Activity
                </button>
              </nav>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-brand p-4">
              <div className="flex items-center gap-2 text-amber-900 font-black text-[10px] uppercase tracking-widest mb-1">
                <i className="ph-fill ph-warning"></i>
                Security Note
              </div>
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                Changes to your professional credentials will be logged in the
                system audit for compliance tracking.
              </p>
            </div>
          </aside>

          {/* Content Area */}
          <div className="min-w-0">
            {activeTab === "profile" ? (
              <Card className="rounded-brand border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                      <i className="ph-duotone ph-identification-badge text-2xl"></i>
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black text-gray-900 tracking-tight">
                        Personal Identity
                      </CardTitle>
                      <CardDescription className="font-medium text-gray-500">
                        Update your public name and system identifier.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-8">
                  <form onSubmit={submitProfile} className="space-y-8">
                    {profileError && (
                      <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-3">
                        <i className="ph-bold ph-warning-circle text-xl"></i>
                        {profileError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                          First Name
                        </label>
                        <Input
                          type="text"
                          className="h-12 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
                          placeholder="Your given name"
                          value={fname}
                          onChange={(e) => setFname(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                          Last Name
                        </label>
                        <Input
                          type="text"
                          className="h-12 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
                          placeholder="Your family name"
                          value={lname}
                          onChange={(e) => setLname(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                        System Email / Username
                      </label>
                      <div className="relative">
                        <i className="ph-bold ph-envelope-simple absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                        <Input
                          type="email"
                          className="h-12 pl-12 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
                          placeholder="professional.email@pup.edu.ph"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 ml-1">
                        Primary identifier for authentication.
                      </p>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                      <Button
                        type="submit"
                        disabled={profileLoading}
                        className="h-12 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
                      >
                        {profileLoading ? (
                          <i className="ph-bold ph-spinner animate-spin"></i>
                        ) : (
                          <i className="ph-bold ph-check-circle"></i>
                        )}
                        {profileLoading ? "Synchronizing..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {activeTab === "security" ? (
              <div className="space-y-6">
                <Card className="rounded-brand border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                        <i className="ph-duotone ph-key text-2xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-gray-900 tracking-tight">
                          Security Credentials
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-500">
                          Rotate your password regularly to maintain account
                          integrity.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8">
                    <form onSubmit={submitPassword} className="space-y-8">
                      {pwError && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-3">
                          <i className="ph-bold ph-warning-circle text-xl"></i>
                          {pwError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                          Current Password
                        </label>
                        <Input
                          type="password"
                          className="h-12 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
                          placeholder="••••••••"
                          value={pwCurrent}
                          onChange={(e) => setPwCurrent(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                          New Password
                        </label>
                        <Input
                          type="password"
                          className="h-12 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
                          placeholder="Min. 6 alphanumeric characters"
                          value={pwNext}
                          onChange={(e) => setPwNext(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                          Confirm New Password
                        </label>
                        <Input
                          type="password"
                          className="h-12 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
                          placeholder="Must match the entry above"
                          value={pwConfirm}
                          onChange={(e) => setPwConfirm(e.target.value)}
                          required
                        />
                      </div>

                      <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <Button
                          type="submit"
                          disabled={pwLoading}
                          className="h-12 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
                        >
                          {pwLoading ? (
                            <i className="ph-bold ph-spinner animate-spin"></i>
                          ) : (
                            <i className="ph-bold ph-shield-check"></i>
                          )}
                          {pwLoading ? "Enforcing..." : "Rotate Password"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card className="rounded-brand border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                        <i className="ph-duotone ph-lock-key text-2xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-gray-900 tracking-tight">
                          Recovery Question
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-500">
                          Set a security question to recover your account if you forget your password.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8">
                    {hasSetSecurity ? (
                       <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-bold rounded-brand flex items-start gap-3">
                         <i className="ph-fill ph-check-circle text-xl mt-0.5 shrink-0 text-emerald-600"></i>
                         <div>
                            <p>You have configured your security questions.</p>
                            <p className="text-xs font-medium text-emerald-700 mt-1">If you need to change any, type a new answer below and save.</p>
                         </div>
                       </div>
                    ) : null}

                    <form onSubmit={submitSecurity} className="space-y-6">
                      {secError && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-3">
                          <i className="ph-bold ph-warning-circle text-xl"></i>
                          {secError}
                        </div>
                      )}

                      {globalQuestions.length === 0 ? (
                        <div className="text-sm text-gray-500 font-medium">No global security questions have been configured yet.</div>
                      ) : (
                        <div className="space-y-5">
                          {globalQuestions.map((q) => (
                            <div key={q.id} className="space-y-2">
                              <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1 flex items-center gap-2">
                                {q.question}
                                {q.hasAnswer && (
                                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <i className="ph-bold ph-check"></i> Answered
                                  </span>
                                )}
                              </label>
                              <Input
                                type="text"
                                className="h-12 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
                                placeholder={q.hasAnswer ? "Answer securely saved. Type to overwrite." : "Your answer"}
                                value={secAnswers[q.id] || ""}
                                onChange={(e) => setSecAnswers({ ...secAnswers, [q.id]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <Button
                          type="submit"
                          disabled={secLoading || globalQuestions.length === 0}
                          className="h-12 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
                        >
                          {secLoading ? (
                            <i className="ph-bold ph-spinner animate-spin"></i>
                          ) : (
                            <i className="ph-bold ph-lock-key"></i>
                          )}
                          {secLoading ? "Saving..." : "Save Security Setup"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
