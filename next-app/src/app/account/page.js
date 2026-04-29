"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

function AccountPageContent() {
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
  const [editingSecQuestions, setEditingSecQuestions] = useState({});

  // TOTP Form State
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpError, setTotpError] = useState("");
  const [totpStep, setTotpStep] = useState("idle");

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

        // Fetch TOTP status
        const resTOTP = await fetch("/api/auth/totp");
        const jsonTOTP = await resTOTP.json().catch(() => null);
        if (jsonTOTP?.ok && jsonTOTP.data) {
          setTotpEnabled(jsonTOTP.data.enabled);
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
      setEditingSecQuestions({});

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

  const startTOTPSetup = async () => {
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to start TOTP setup");
      }
      setTotpSetupData(json.data);
      setTotpStep("setup");
    } catch (err) {
      setTotpError(err?.message || "Failed to start TOTP setup");
      toast.error("TOTP Setup Failed", {
        description: err?.message || "Unable to initialize TOTP.",
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const verifyTOTP = async (e) => {
    e.preventDefault();
    if (!totpToken || totpToken.length !== 6) {
      setTotpError("Please enter a 6-digit code");
      return;
    }
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: totpToken }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Invalid verification code");
      }
      setTotpEnabled(true);
      setTotpStep("idle");
      setTotpSetupData(null);
      setTotpToken("");
      toast.success("TOTP Enabled", {
        description: "Two-factor authentication is now enabled.",
      });
    } catch (err) {
      setTotpError(err?.message || "Invalid verification code");
      toast.error("Verification Failed", {
        description: err?.message || "The code you entered is invalid.",
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!totpToken || totpToken.length !== 6) {
      setTotpError("Please enter your current TOTP code to disable");
      return;
    }
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", token: totpToken }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Invalid verification code");
      }
      setTotpEnabled(false);
      setTotpToken("");
      toast.success("TOTP Disabled", {
        description: "Two-factor authentication has been disabled.",
      });
    } catch (err) {
      setTotpError(err?.message || "Invalid verification code");
      toast.error("Disable Failed", {
        description: err?.message || "Unable to disable TOTP.",
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const cancelTOTPSetup = () => {
    setTotpStep("idle");
    setTotpSetupData(null);
    setTotpToken("");
    setTotpError("");
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
            className="px-6 font-black uppercase tracking-widest text-xs border-gray-300 hover:border-pup-maroon hover:text-pup-maroon transition-all shadow-sm flex items-center gap-2 shrink-0 rounded-brand"
          >
            <i className="ph-bold ph-arrow-left"></i>
            Return to Dashboard
          </Button>
        </div>

        <Tabs
          defaultValue="profile"
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="vertical"
          className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start"
        >
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

              <TabsList variant="ghost" className="p-2 w-full bg-transparent border-0">
                <TabsTrigger
                  value="profile"
                  className="flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-all data-active:bg-red-50 data-active:text-pup-maroon text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-0"
                >
                  <i className="ph-bold ph-user-circle text-lg"></i>
                  Profile Details
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-all data-active:bg-red-50 data-active:text-pup-maroon text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-0"
                >
                  <i className="ph-bold ph-shield-check text-lg"></i>
                  Security
                </TabsTrigger>
                <button
                  type="button"
                  onClick={() => router.push("/account/activity")}
                  className="flex items-center gap-3 px-4 py-3 rounded-brand text-sm font-bold transition-all text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-left w-full"
                >
                  <i className="ph-bold ph-clock-counter-clockwise text-lg"></i>
                  Audit Activity
                </button>
              </TabsList>
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
            <TabsContent value="profile" className="m-0 border-0 focus-visible:ring-0">
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
                          className="bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"                          placeholder="Your given name"
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
                          className="bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"                          placeholder="Your family name"
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
                          className="h-11 pl-12 bg-gray-50 border-gray-200 rounded-brand font-bold text-gray-500 cursor-not-allowed focus-visible:outline-none"
                          placeholder="professional.email@pup.edu.ph"
                          value={username}
                          readOnly
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2 ml-1">
                        Primary identifier for authentication (Read-Only).
                      </p>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                      <Button
                        type="submit"
                        disabled={profileLoading}
                        className="h-11 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
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
            </TabsContent>

            <TabsContent value="security" className="m-0 border-0 focus-visible:ring-0">
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
                          className="h-11 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
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
                          className="h-11 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
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
                          className="h-11 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900"
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
                          className="h-11 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
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
                          {globalQuestions.map((q) => {
                            const isEditing = !!editingSecQuestions[q.id];
                            const showInput = !q.hasAnswer || isEditing;

                            return (
                              <div key={q.id} className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                  <label className="text-xs font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                    {q.question}
                                    {q.hasAnswer && !isEditing && (
                                      <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <i className="ph-bold ph-check"></i> Answered
                                      </span>
                                    )}
                                  </label>
                                  {q.hasAnswer && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSecQuestions(prev => ({ ...prev, [q.id]: !isEditing }));
                                        if (isEditing) {
                                          setSecAnswers(prev => {
                                            const n = { ...prev };
                                            delete n[q.id];
                                            return n;
                                          });
                                        }
                                      }}
                                      className="text-[10px] font-black uppercase tracking-widest text-pup-maroon hover:underline"
                                    >
                                      {isEditing ? "Cancel" : "Change Answer"}
                                    </button>
                                  )}
                                </div>

                                {showInput ? (
                                  <Input
                                    type="text"
                                    className="bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900 animate-in fade-in slide-in-from-top-1 duration-200"
                                    placeholder="Your answer"
                                    value={secAnswers[q.id] || ""}
                                    onChange={(e) => setSecAnswers({ ...secAnswers, [q.id]: e.target.value })}
                                    autoFocus={isEditing}
                                  />
                                ) : (
                                  <div className="h-11 flex items-center px-4 bg-gray-50 border border-gray-200 rounded-brand text-sm font-bold text-gray-400 italic">
                                    Answer securely saved.
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="pt-6 border-t border-gray-100 flex justify-end">
                        <Button
                          type="submit"
                          disabled={secLoading || globalQuestions.length === 0}
                          className="h-11 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
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

                <Card className="rounded-brand border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-100 p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-pup-maroon shadow-sm shrink-0">
                        <i className="ph-duotone ph-mobile text-2xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-xl font-black text-gray-900 tracking-tight">
                          Two-Factor Authentication
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-500">
                          Add an extra layer of security to your account.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8">
                    {totpEnabled ? (
                      <div className="space-y-6">
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-bold rounded-brand flex items-start gap-3">
                          <i className="ph-fill ph-check-circle text-xl mt-0.5 shrink-0 text-emerald-600"></i>
                          <div>
                            <p>Two-factor authentication is enabled.</p>
                            <p className="text-xs font-medium text-emerald-700 mt-1">You&apos;ll need to enter a code from your authenticator app for sensitive actions.</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                            Enter TOTP Code to Disable
                          </label>
                          <Input
                            type="text"
                            maxLength={6}
                            className="h-11 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900 text-center tracking-widest text-lg"
                            placeholder="000000"
                            value={totpToken}
                            onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          />
                        </div>

                        {totpError && (
                          <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-3">
                            <i className="ph-bold ph-warning-circle text-xl"></i>
                            {totpError}
                          </div>
                        )}

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                          <Button
                            onClick={disableTOTP}
                            disabled={totpLoading || totpToken.length !== 6}
                            className="h-11 px-8 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
                          >
                            {totpLoading ? (
                              <i className="ph-bold ph-spinner animate-spin"></i>
                            ) : (
                              <i className="ph-bold ph-prohibit"></i>
                            )}
                            Disable TOTP
                          </Button>
                        </div>
                      </div>
                    ) : totpStep === "setup" && totpSetupData ? (
                      <div className="space-y-6">
                        <div className="flex flex-col items-center text-center p-6 bg-gray-50 rounded-brand border border-gray-100">
                          <p className="text-sm font-bold text-gray-600 mb-4 max-w-sm">
                            Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
                          </p>
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <img
                              src={totpSetupData.qrCode}
                              alt="TOTP QR Code"
                              className="w-48 h-48"
                            />
                          </div>
                          <p className="text-[10px] text-gray-500 mt-4 font-black uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                            Secret: {totpSetupData.secret}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-700 uppercase tracking-widest ml-1">
                            Enter Verification Code
                          </label>
                          <Input
                            type="text"
                            maxLength={6}
                            className="h-11 bg-white border-gray-300 rounded-brand focus:ring-pup-maroon font-bold text-gray-900 text-center tracking-widest text-lg"
                            placeholder="000000"
                            value={totpToken}
                            onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            autoFocus
                          />
                        </div>

                        {totpError && (
                          <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-brand flex items-center gap-3">
                            <i className="ph-bold ph-warning-circle text-xl"></i>
                            {totpError}
                          </div>
                        )}

                        <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                          <Button
                            onClick={cancelTOTPSetup}
                            disabled={totpLoading}
                            variant="outline"
                            className="h-11 px-6 font-black uppercase tracking-widest flex items-center gap-2 rounded-brand"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={verifyTOTP}
                            disabled={totpLoading || totpToken.length !== 6}
                            className="h-11 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
                          >
                            {totpLoading ? (
                              <i className="ph-bold ph-spinner animate-spin"></i>
                            ) : (
                              <i className="ph-bold ph-lock-key"></i>
                            )}
                            Verify & Enable
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="p-4 bg-gray-50 border border-gray-200 text-gray-700 text-sm font-bold rounded-brand flex items-start gap-3">
                          <i className="ph-bold ph-info text-xl mt-0.5 shrink-0 text-gray-500"></i>
                          <div>
                            <p>Two-factor authentication is not enabled.</p>
                            <p className="text-xs font-medium text-gray-600 mt-1">Enable TOTP to add extra protection for sensitive admin actions.</p>
                          </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                          <Button
                            onClick={startTOTPSetup}
                            disabled={totpLoading}
                            className="h-11 px-8 bg-pup-maroon hover:bg-red-900 text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-2 rounded-brand"
                          >
                            {totpLoading ? (
                              <i className="ph-bold ph-spinner animate-spin"></i>
                            ) : (
                              <i className="ph-bold ph-lock-key"></i>
                            )}
                            Enable TOTP
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
}

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountPageContent />
    </AuthGuard>
  );
}
