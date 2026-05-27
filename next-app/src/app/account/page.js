"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Header from "@/components/layout/Header";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/PageHeader";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";

function AccountPageContent() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
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
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

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
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [recoveryCodesCount, setRecoveryCodesCount] = useState(0);
  const [showRecoveryCodesDialog, setShowRecoveryCodesDialog] = useState(false);

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
          if (resAuth.status === 401) {
            router.push("/");
          }
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
          setRecoveryCodesCount(jsonTOTP.data.recoveryCodesCount || 0);
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
    localStorage.setItem("pup-logout", Date.now());
    router.push("/");
  };

  const submitProfile = async (e) => {
    e.preventDefault();
    if (profileLoading) return;

    if (!(fname || "").trim() || !(lname || "").trim() || !(username || "").trim()) {
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
          fname: (fname || "").trim(),
          lname: (lname || "").trim(),
          email: (username || "").trim(),
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
    if (pwNext === pwCurrent) {
      setPwError("New password cannot be the same as the current password.");
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
        description: "Your new password is now active.",
      });
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err?.message || "Failed to change password");
      toast.error("Password Change Failed", {
        description: err?.message || "Unable to update password.",
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

    if (payload.length < 2) {
      setSecError("Please provide answers for at least two questions.");
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

      toast.success("Security Questions Updated", {
        description: "Your answers have been saved.",
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
        description: err?.message || "Unable to save your security questions.",
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
        throw new Error(json?.error || "Failed to start setup");
      }
      setTotpSetupData(json.data);
      setTotpStep("setup");
    } catch (err) {
      setTotpError(err?.message || "Failed to start setup");
      toast.error("Setup Failed", {
        description: err?.message || "Unable to initialize two-factor auth.",
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
        throw new Error(json?.error || "Invalid code");
      }
      setTotpEnabled(true);
      setTotpStep("idle");
      setTotpSetupData(null);
      setTotpToken("");
      toast.success("Two-Factor Auth Enabled", {
        description: "Your account is now extra secure.",
      });
    } catch (err) {
      setTotpError(err?.message || "Invalid code");
      toast.error("Verification Failed", {
        description: err?.message || "The code you entered is incorrect.",
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const disableTOTP = async () => {
    if (!totpToken || totpToken.length !== 6) {
      setTotpError("Please enter your current code to disable");
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
        throw new Error(json?.error || "Invalid code");
      }
      setTotpEnabled(false);
      setTotpToken("");
      toast.success("Two-Factor Auth Disabled", {
        description: "Your account is now using standard security.",
      });
    } catch (err) {
      setTotpError(err?.message || "Invalid code");
      toast.error("Disable Failed", {
        description: err?.message || "Unable to turn off two-factor auth.",
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

  const generateNewRecoveryCodes = async () => {
    setTotpLoading(true);
    setTotpError("");
    try {
      const res = await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-recovery-codes" }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to generate codes");
      }
      setRecoveryCodes(json.data.codes);
      setRecoveryCodesCount(json.data.codes.length);
      setShowRecoveryCodesDialog(true);
      toast.success("Codes Generated", {
        description: "Please save these codes somewhere safe.",
      });
    } catch (err) {
      toast.error("Generation Failed", {
        description: err?.message || "Unable to generate recovery codes.",
      });
    } finally {
      setTotpLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    const text = recoveryCodes.join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard");
  };

  const downloadRecoveryCodes = () => {
    const text = `PUPSJ Records Keeping System - Recovery Codes\nGenerated on: ${new Date().toLocaleString()}\n\n${recoveryCodes.join("\n")}\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pupsj-recovery-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50 animate-fade-in dark:bg-white/5">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4 shrink-0 dark:bg-card dark:border-white/10">
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

  const handleThemeChange = (e) => {
    const nextTheme = e.target.value
    if (!document.startViewTransition) {
      setTheme(nextTheme)
      return
    }
    document.startViewTransition(() => {
      setTheme(nextTheme)
    })
  }

  const initials =
    authUser?.fname && authUser?.lname
      ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
      : "AD";

  const isSuperAdmin = authUser?.role === "SuperAdmin";

  const roleBadgeColor = isSuperAdmin
    ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400"
    : "border-red-500/30 bg-red-500/10 text-red-600 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-400";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background font-inter selection:bg-pup-maroon selection:text-white">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1200px] mx-auto py-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PageHeader
          icon="ph-user-circle-gear"
          title="Account Settings"
          description="Update your personal info and security settings."
          actions={
            <Button
              variant="outline"
              onClick={() => {
                const path = isAdminRole(authUser?.role) ? "/admin" : "/staff";
                router.push(path);
              }}
              className="h-10 px-5 font-black uppercase tracking-widest text-[10px] border-gray-300 bg-white hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 transition-all shadow-xs flex items-center gap-2 rounded-xl dark:border-white/10 dark:bg-card dark:text-zinc-300"
            >
              <i className="ph-bold ph-caret-left"></i>
              Return to Dashboard
            </Button>
          }
        />

        <Separator className="mt-8 bg-gray-200 dark:bg-zinc-800" />

        <div className="mt-8">
          <Tabs
            defaultValue="profile"
            value={activeTab}
            onValueChange={setActiveTab}
            className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10 items-start"
          >
          {/* Sidebar Navigation */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-2xl shadow-black/5 overflow-hidden dark:bg-zinc-900 dark:border-white/5">
              {/* Brand Banner Header */}
              <div className="h-28 bg-linear-to-br from-red-900 via-pup-maroon to-red-800 relative">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_100%)]"></div>
                <div className="absolute bottom-0 left-0 w-full h-12 bg-linear-to-t from-black/20 to-transparent"></div>
              </div>
              
              {/* Profile Identity Section (Overlapping Banner) */}
              <div className="px-6 pb-8 -mt-14 relative flex flex-col items-center text-center">
                <div className="relative mb-5">
                  {/* Outer Glow/Ring */}
                  <div className="absolute -inset-1 bg-white/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Initials Container */}
                  <div className="relative w-28 h-28 rounded-[2rem] bg-white p-1.5 shadow-2xl dark:bg-zinc-800">
                    <div className="w-full h-full rounded-[1.6rem] bg-linear-to-br from-red-800 to-pup-maroon text-white flex items-center justify-center text-4xl font-black shadow-inner">
                      {initials}
                    </div>
                  </div>

                  {/* High-Contrast Integrated Security Badge */}
                  <div className="absolute bottom-1 right-1 w-9 h-9 rounded-2xl bg-emerald-500 border-[5px] border-white dark:border-zinc-900 flex items-center justify-center text-white shadow-xl">
                    <i className="ph-fill ph-shield-check text-base"></i>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="font-black text-gray-900 text-2xl tracking-tight dark:text-zinc-50 leading-tight">
                    {fname} {lname}
                  </h3>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest dark:text-zinc-400">
                      {authUser?.email || authUser?.username}
                    </p>
                    <div
                      className={cn(
                        "mt-3 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-xs flex items-center gap-2",
                        roleBadgeColor
                      )}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-xs" />
                      {authUser?.role || "System User"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="px-4 pb-4">
                <div className="h-px w-full bg-gray-100 dark:bg-white/5 mb-4 px-2 mx-auto max-w-[80%]" />
                
                <TabsList className="w-full flex flex-col h-auto bg-transparent rounded-2xl p-0 space-y-1.5">
                  {[
                    { id: "profile", label: "Profile Info", icon: "ph-identification-card" },
                    { id: "security", label: "Security & Access", icon: "ph-shield-star" },
                    { id: "preferences", label: "System Preference", icon: "ph-palette" }
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="group flex items-center justify-start gap-4 w-full px-5 py-4 rounded-[1.25rem] text-[13px] font-black uppercase tracking-wider transition-all data-[state=active]:bg-gray-50 dark:data-[state=active]:bg-white/5 data-[state=active]:text-pup-maroon dark:data-[state=active]:text-primary data-[state=active]:shadow-inner text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 outline-none"
                    >
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center transition-all group-data-[state=active]:bg-white dark:group-data-[state=active]:bg-zinc-700 group-data-[state=active]:shadow-md group-data-[state=active]:text-pup-maroon dark:group-data-[state=active]:text-primary">
                        <i className={cn("ph-bold text-xl", tab.icon)}></i>
                      </div>
                      <span className="truncate text-left">{tab.label}</span>
                      <div className="shrink-0 ml-auto w-5 h-5 flex items-center justify-center opacity-0 group-data-[state=active]:opacity-100 transition-opacity">
                        <i className="ph-bold ph-caret-right text-sm"></i>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <div className="min-w-0 space-y-8">
            <TabsContent value="profile" className="m-0 border-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                <CardHeader className="bg-linear-to-r from-gray-50/80 to-white border-b border-gray-100 p-8 dark:bg-muted dark:bg-none dark:border-white/10">
                  <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-pup-maroon dark:text-primary shadow-md shrink-0 dark:bg-card dark:border-white/10">
                      <i className="ph-duotone ph-user-focus text-3xl"></i>
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-gray-900 tracking-tight dark:text-zinc-50">
                        Profile
                      </CardTitle>
                      <CardDescription className="font-medium text-gray-500 text-sm mt-1 dark:text-zinc-400">
                        Manage your profile name.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-10 pt-12">
                  <form onSubmit={submitProfile} className="space-y-10">
                    {profileError && (
                      <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-xl flex items-center gap-4 animate-in shake-1 dark:data-[state=active]:bg-red-500/10">
                        <i className="ph-fill ph-warning-circle text-2xl"></i>
                        {profileError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                          First Name
                        </label>
                        <Input
                          type="text"
                          className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50"
                          placeholder="First Name"
                          value={fname}
                          onChange={(e) => setFname(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                          Last Name
                        </label>
                        <Input
                          type="text"
                          className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50"
                          placeholder="Last Name"
                          value={lname}
                          onChange={(e) => setLname(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                        Email Address
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-focus-within:text-pup-maroon group-focus-within:bg-red-50 transition-colors dark:bg-zinc-800 dark:text-zinc-500">
                           <i className="ph-bold ph-envelope text-lg"></i>
                        </div>
                        <Input
                          type="email"
                          className="h-14 pl-14 rounded-xl border border-gray-200 bg-gray-50 font-bold text-gray-500 cursor-not-allowed select-none border-dashed text-sm dark:border-white/10 dark:bg-white/5 dark:text-zinc-400"
                          value={username}
                          readOnly
                        />
                      </div>
                      <p className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-3 ml-1 dark:text-zinc-500">
                        <i className="ph-bold ph-lock"></i>
                        Your email is managed by administrators and cannot be changed.
                      </p>
                    </div>

                    <div className="pt-8 border-t border-gray-100 flex justify-end dark:border-white/10">
                      <Button
                        type="submit"
                        disabled={profileLoading}
                        className="h-12 px-10 btn-brand-red text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-3 rounded-xl active:scale-95 disabled:opacity-50"
                      >
                        {profileLoading ? (
                          <i className="ph-bold ph-spinner animate-spin text-xl"></i>
                        ) : (
                          <i className="ph-bold ph-floppy-disk text-xl"></i>
                        )}
                        {profileLoading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="m-0 border-0 focus-visible:ring-0 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="space-y-8">
                {/* Password Rotation Card */}
                <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                  <CardHeader className="bg-linear-to-r from-gray-50/80 to-white border-b border-gray-100 p-8 dark:bg-muted dark:bg-none dark:border-white/10">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-pup-maroon dark:text-primary shadow-md shrink-0 dark:bg-card dark:border-white/10">
                        <i className="ph-duotone ph-key text-3xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight dark:text-zinc-50">
                          Account Access
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-500 text-sm mt-1 dark:text-zinc-400">
                          Update your sign-in details.
                          {authUser?.password_last_changed && (
                            <span className="flex items-center gap-1.5 mt-2 text-[10px] text-pup-maroon dark:text-red-400 font-black uppercase tracking-wider bg-red-50 dark:bg-red-400/10 w-fit px-2 py-0.5 rounded border border-red-100 dark:border-red-400/20">
                              <i className="ph-bold ph-calendar"></i>
                              Last Updated: {formatPHDateTime(authUser.password_last_changed)}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-10">
                    <form onSubmit={submitPassword} className="space-y-8">
                      {pwError && (
                        <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-xl flex items-center gap-4 animate-in shake-1 dark:data-[state=active]:bg-red-500/10">
                          <i className="ph-fill ph-warning-circle text-2xl"></i>
                          {pwError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                            Current Password
                          </label>
                          <div className="relative group">
                            <Input
                              type={showPw.current ? "text" : "password"}
                              className="h-12 rounded-xl border border-gray-200 bg-white pr-10 pl-4 text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50"
                              placeholder="Type your old password"
                              value={pwCurrent}
                              onChange={(e) => setPwCurrent(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw(prev => ({ ...prev, current: !prev.current }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500"
                            >
                              <i className={cn("ph-bold", showPw.current ? "ph-eye-slash" : "ph-eye")}></i>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                              New Password
                            </label>
                            <div className="relative group">
                              <Input
                                type={showPw.next ? "text" : "password"}
                                className="h-12 rounded-xl border border-gray-200 bg-white pr-10 pl-4 text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50"
                                placeholder="Create a strong password"
                                value={pwNext}
                                onChange={(e) => setPwNext(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPw(prev => ({ ...prev, next: !prev.next }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500"
                              >
                                <i className={cn("ph-bold", showPw.next ? "ph-eye-slash" : "ph-eye")}></i>
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                              Confirm Password
                            </label>
                            <div className="relative group">
                              <Input
                                type={showPw.confirm ? "text" : "password"}
                                className="h-12 rounded-xl border border-gray-200 bg-white pr-10 pl-4 text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50"
                                placeholder="Match new password"
                                value={pwConfirm}
                                onChange={(e) => setPwConfirm(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPw(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pup-maroon dark:hover:text-red-500 transition-colors dark:text-zinc-500"
                              >
                                <i className={cn("ph-bold", showPw.confirm ? "ph-eye-slash" : "ph-eye")}></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-gray-100 flex justify-end dark:border-white/10">
                        <Button
                          type="submit"
                          disabled={pwLoading}
                          className="h-12 px-10 btn-brand-red text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-3 rounded-xl active:scale-95 disabled:opacity-50"
                        >
                          {pwLoading ? (
                            <i className="ph-bold ph-spinner animate-spin text-xl"></i>
                          ) : (
                            <i className="ph-bold ph-arrows-clockwise text-xl"></i>
                          )}
                          {pwLoading ? "Updating..." : "Update Password"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Security Questions Card */}
                <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                  <CardHeader className="bg-linear-to-r from-gray-50/80 to-white border-b border-gray-100 p-8 dark:bg-muted dark:bg-none dark:border-white/10">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-pup-maroon dark:text-primary shadow-md shrink-0 dark:bg-card dark:border-white/10">
                        <i className="ph-duotone ph-shield-check text-3xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight dark:text-zinc-50">
                          Security Questions
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-500 text-sm mt-1 dark:text-zinc-400">
                          Set up questions to help recover your account.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-10">
                    <form onSubmit={submitSecurity} className="space-y-8">
                      {secError && (
                        <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-xl flex items-center gap-4 animate-in shake-1 dark:data-[state=active]:bg-red-500/10">
                          <i className="ph-fill ph-warning-circle text-2xl"></i>
                          {secError}
                        </div>
                      )}

                      {hasSetSecurity && (
                        <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4 dark:bg-emerald-400/10 dark:border-emerald-400/20">
                           <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 shadow-sm shrink-0 dark:bg-emerald-400/20 dark:text-emerald-400 dark:shadow-none">
                              <i className="ph-fill ph-check-circle text-2xl"></i>
                           </div>
                           <div>
                              <h4 className="font-black text-emerald-900 text-sm dark:text-emerald-400">Security Questions Set</h4>
                              <p className="text-xs font-medium text-emerald-700 mt-1 leading-relaxed dark:text-emerald-400/80">
                                 Your recovery questions are active. To update an answer, click the &quot;Change&quot; button next to the question.
                              </p>
                           </div>
                        </div>
                      )}

                      <div className="space-y-8">
                        {globalQuestions.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-bold text-sm dark:bg-card dark:border-white/10 dark:text-zinc-500">
                            <i className="ph-duotone ph-mask-sad text-4xl mb-3 block opacity-20"></i>
                            No recovery questions configured.
                          </div>
                        ) : (
                          globalQuestions.map((q, idx) => {
                            const isEditing = !!editingSecQuestions[q.id];
                            const showInput = !q.hasAnswer || isEditing;

                            return (
                              <div key={q.id} className="relative group">
                                <div className="flex items-center justify-between mb-3 px-1">
                                  <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase flex items-center gap-2 dark:text-zinc-400">
                                    <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400 font-black dark:bg-zinc-800 dark:text-zinc-500">{idx + 1}</span>
                                    {q.question}
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
                                      className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-lg transition-all ${ isEditing ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-red-50 text-pup-maroon dark:text-primary hover:bg-pup-maroon hover:text-white" } dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700`}
                                    >
                                      {isEditing ? "Cancel" : "Change Answer"}
                                    </button>
                                  )}
                                </div>

                                <div className="relative">
                                  {showInput ? (
                                    <Input
                                      type="text"
                                      className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold shadow-xs transition-all focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-pup-maroon/20 text-gray-900 animate-in fade-in slide-in-from-top-1 duration-300 dark:border-white/10 dark:bg-card dark:text-zinc-50"
                                      placeholder="Your secure answer"
                                      value={secAnswers[q.id] || ""}
                                      onChange={(e) => setSecAnswers({ ...secAnswers, [q.id]: e.target.value })}
                                      autoFocus={isEditing}
                                    />
                                  ) : (
                                    <div className="h-12 flex items-center px-4 bg-gray-50 border border-gray-200 border-dashed rounded-xl text-sm font-bold text-gray-400 italic select-none dark:bg-white/5 dark:border-white/10 dark:text-zinc-500">
                                      <i className="ph-bold ph-circle-dashed mr-2 opacity-50"></i>
                                      Answer saved and encrypted.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="pt-8 border-t border-gray-100 flex justify-end dark:border-white/10">
                        <Button
                          type="submit"
                          disabled={secLoading || globalQuestions.length === 0}
                          className="h-12 px-10 btn-brand-red text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-3 rounded-xl active:scale-95 disabled:opacity-50"
                        >
                          {secLoading ? (
                            <i className="ph-bold ph-spinner animate-spin text-xl"></i>
                          ) : (
                            <i className="ph-bold ph-lock-key-open text-xl"></i>
                          )}
                          {secLoading ? "Saving..." : "Save Questions"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* 2FA Card */}
                <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                  <CardHeader className="bg-linear-to-r from-gray-50/80 to-white border-b border-gray-100 p-8 dark:bg-muted dark:bg-none dark:border-white/10">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-pup-maroon dark:text-primary shadow-md shrink-0 dark:bg-card dark:border-white/10">
                        <i className="ph-duotone ph-fingerprint text-3xl"></i>
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-black text-gray-900 tracking-tight dark:text-zinc-50">
                          Two-Factor Auth
                        </CardTitle>
                        <CardDescription className="font-medium text-gray-500 text-sm mt-1 dark:text-zinc-400">
                          Add an extra layer of security to your account.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-10">
                    {totpEnabled ? (
                      <div className="space-y-10">
                        <div className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-start gap-5 dark:bg-emerald-400/10 dark:border-emerald-400/20">
                          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-md shrink-0 dark:bg-emerald-400/20 dark:text-emerald-400 dark:shadow-none">
                            <i className="ph-fill ph-check-circle text-3xl"></i>
                          </div>
                          <div>
                            <h4 className="font-black text-emerald-900 text-base dark:text-emerald-400">Two-Factor Auth is On</h4>
                            <p className="text-sm font-medium text-emerald-700 mt-1 leading-relaxed dark:text-emerald-400/80">
                              Your account is guarded by secondary authentication. You will be prompted for codes during login.
                            </p>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 space-y-6 dark:bg-white/5 dark:border-white/10">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                                Turn Off Two-Factor Auth
                              </label>
                              <Input
                                type="text"
                                maxLength={6}
                                className="h-16 rounded-xl border border-gray-200 bg-white text-center text-2xl font-black tracking-[0.5em] text-gray-900 shadow-inner transition-all focus-visible:border-red-500/20 focus-visible:ring-4 focus-visible:ring-red-500/5 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none"
                                placeholder="000000"
                                value={totpToken}
                                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              />
                           </div>

                           <div className="flex justify-center">
                              <Button
                                onClick={disableTOTP}
                                disabled={totpLoading || totpToken.length !== 6}
                                className="h-12 w-full bg-linear-to-b from-red-600 to-red-800 border-4 border-red-900 hover:from-red-500 hover:to-red-700 hover:shadow-xl transition-all text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center justify-center gap-3 rounded-xl active:scale-95 disabled:opacity-50"
                              >
                                {totpLoading ? (
                                  <i className="ph-bold ph-spinner animate-spin text-xl"></i>
                                ) : (
                                  <i className="ph-bold ph-shield-slash text-xl"></i>
                                )}
                                Turn Off 2FA
                              </Button>
                           </div>
                        </div>

                        <div className="pt-10 border-t border-gray-100 dark:border-white/10">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div>
                              <h4 className="text-lg font-black text-gray-900 tracking-tight dark:text-zinc-50">Recovery Codes</h4>
                              <p className="text-sm font-medium text-gray-500 mt-1 dark:text-zinc-400">
                                {recoveryCodesCount > 0 
                                  ? `You have ${recoveryCodesCount} codes available.`
                                  : "You haven't set up recovery codes yet."}
                              </p>
                            </div>
                            <Button
                              onClick={generateNewRecoveryCodes}
                              disabled={totpLoading}
                              variant="outline"
                              className="h-11 px-6 font-black text-[10px] uppercase tracking-widest border-gray-300 hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 bg-white rounded-xl shadow-xs transition-all flex items-center gap-2 dark:border-white/10 dark:bg-card"
                            >
                              {totpLoading ? (
                                <i className="ph-bold ph-spinner animate-spin"></i>
                              ) : (
                                <i className="ph-bold ph-arrows-clockwise-bold"></i>
                              )}
                              {recoveryCodesCount > 0 ? "Regenerate Codes" : "Get Codes"}
                            </Button>
                          </div>
                          
                          <div className="mt-6 p-5 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 dark:bg-amber-400/10 dark:border-amber-400/20">
                            <i className="ph-fill ph-info text-xl mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"></i>
                            <p className="text-[12px] text-amber-800 font-bold leading-relaxed dark:text-amber-400/90">
                              Recovery codes allow you to access your account if you lose your phone. Keep them in a safe place.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : totpStep === "setup" && totpSetupData ? (
                      <div className="space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8 bg-gray-50 rounded-2xl border border-gray-100 p-8 items-center dark:bg-card dark:border-white/10">
                          <div className="space-y-4">
                            <h4 className="text-lg font-black text-gray-900 tracking-tight dark:text-zinc-50">Setup</h4>
                            <p className="text-sm font-medium text-gray-600 leading-relaxed dark:text-zinc-300">
                              Scan the QR code using your authenticator app (like Google Authenticator or Authy) to link your account.
                            </p>
                            
                            <div className="space-y-2 mt-4">
                               <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-white/10">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">Secret Key</span>
                                  <code className="text-sm font-black text-pup-maroon dark:text-primary tracking-wider break-all">{totpSetupData.secret}</code>
                               </div>
                               <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-white/10">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">Serial Key (Backup)</span>
                                  <code className="text-sm font-black text-gray-900 tracking-wider break-all dark:text-zinc-50">{totpSetupData.serialKey}</code>
                               </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="bg-white p-4 rounded-2xl border-2 border-white shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500 dark:bg-card">
                              <img
                                src={totpSetupData.qrCode}
                                alt="TOTP QR Code"
                                className="w-44 h-44"
                              />
                            </div>
                            <span className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest dark:text-zinc-500">Scan QR Code</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase px-1 dark:text-zinc-400">
                            Enter Verification Code
                          </label>
                          <Input
                            type="text"
                            maxLength={6}
                            className="h-16 rounded-xl border border-gray-200 bg-white text-center text-2xl font-black tracking-[0.5em] text-gray-900 shadow-inner transition-all focus-visible:border-pup-maroon/20 focus-visible:ring-4 focus-visible:ring-pup-maroon/5 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none"
                            placeholder="000000"
                            value={totpToken}
                            onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            autoFocus
                          />
                        </div>

                        {totpError && (
                          <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-xl flex items-center gap-4 animate-in shake-1 dark:data-[state=active]:bg-red-500/10">
                            <i className="ph-fill ph-warning-circle text-2xl"></i>
                            {totpError}
                          </div>
                        )}

                        <div className="pt-8 border-t border-gray-100 flex justify-end gap-4 dark:border-white/10">
                          <Button
                            onClick={cancelTOTPSetup}
                            disabled={totpLoading}
                            variant="outline"
                            className="h-12 px-8 font-black uppercase tracking-widest text-[11px] border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-xs dark:border-white/10 dark:bg-card dark:hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={verifyTOTP}
                            disabled={totpLoading || totpToken.length !== 6}
                            className="h-12 px-10 btn-brand-red text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-3 rounded-xl active:scale-95"
                          >
                            {totpLoading ? (
                              <i className="ph-bold ph-spinner animate-spin text-xl"></i>
                            ) : (
                              <i className="ph-bold ph-shield-check text-xl"></i>
                            )}
                            Activate 2FA
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="p-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center text-center dark:bg-white/5 dark:border-white/10">
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 mb-4 border-2 border-white shadow-inner dark:bg-zinc-800 dark:text-zinc-600 dark:shadow-none">
                            <i className="ph-bold ph-lock-key-open text-3xl"></i>
                          </div>
                          <h4 className="font-black text-gray-900 text-lg tracking-tight dark:text-zinc-50">Two-Factor Auth is Off</h4>
                          <p className="text-sm font-medium text-gray-500 mt-2 max-w-sm leading-relaxed dark:text-zinc-400">
                            Your account doesn&apos;t have an extra layer of protection yet. Turn on 2FA to keep your account safe.
                          </p>
                        </div>

                        <div className="pt-8 border-t border-gray-100 flex justify-center sm:justify-end dark:border-white/10">
                          <Button
                            onClick={startTOTPSetup}
                            disabled={totpLoading}
                            className="h-12 px-10 btn-brand-red text-white font-black uppercase tracking-widest shadow-lg shadow-red-900/20 flex items-center gap-3 rounded-xl active:scale-95 disabled:opacity-50"
                          >
                            {totpLoading ? (
                              <i className="ph-bold ph-spinner animate-spin text-xl"></i>
                            ) : (
                              <i className="ph-bold ph-shield-plus text-xl"></i>
                            )}
                            Setup 2FA
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="m-0 border-0 focus-visible:ring-0 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                <CardHeader className="bg-linear-to-r from-gray-50/80 to-white border-b border-gray-100 p-8 dark:bg-muted dark:bg-none dark:border-white/10">
                  <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center text-pup-maroon dark:text-primary shadow-md shrink-0 dark:bg-card dark:border-white/10">
                      <i className="ph-duotone ph-palette text-3xl"></i>
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black text-gray-900 tracking-tight dark:text-zinc-50">
                        System Preference
                      </CardTitle>
                      <CardDescription className="font-medium text-gray-500 text-sm mt-1 dark:text-zinc-400">
                        Customize how the system looks for you.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-10">
                   <div className="space-y-10">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-[10px] font-black tracking-widest text-gray-500 uppercase dark:text-zinc-400">
                            Interface Theme
                          </label>
                          <Badge variant="outline" className="h-5 px-2 bg-gray-50 border-gray-200 text-gray-500 font-black text-[9px] uppercase dark:bg-muted dark:border-white/10 dark:text-zinc-400">
                             Visuals
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                           {['system', 'light', 'dark'].map((t) => (
                             <button
                                key={t}
                                onClick={() => handleThemeChange({ target: { value: t } })}
                                className={cn(
                                  "relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all group overflow-hidden",
                                  theme === t 
                                    ? "border-pup-maroon bg-red-50/50 dark:border-red-500 dark:bg-red-500/10" 
                                    : "border-gray-100 bg-gray-50 hover:border-gray-200 dark:border-white/5 dark:bg-card dark:hover:border-white/10"
                                )}
                             >
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all shadow-xs",
                                  theme === t 
                                    ? "bg-pup-maroon text-white dark:bg-red-600" 
                                    : "bg-white text-gray-400 dark:bg-zinc-800 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
                                )}>
                                   <i className={cn(
                                     "ph-bold",
                                     t === 'system' ? "ph-desktop" : t === 'light' ? "ph-sun" : "ph-moon"
                                   )}></i>
                                </div>
                                <span className={cn(
                                  "text-xs font-black uppercase tracking-widest",
                                  theme === t ? "text-pup-maroon dark:text-red-500" : "text-gray-500 dark:text-zinc-400"
                                )}>
                                   {t}
                                </span>
                                {theme === t && (
                                   <div className="absolute top-2 right-2 w-5 h-5 bg-pup-maroon dark:bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] animate-in zoom-in duration-300">
                                      <i className="ph-bold ph-check"></i>
                                   </div>
                                )}
                             </button>
                           ))}
                        </div>
                        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-4 ml-1 dark:text-zinc-500">
                           <i className="ph-bold ph-info mr-1.5"></i>
                           Choose your preferred color theme for the interface.
                        </p>
                      </div>
                   </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
        </div>

        {/* Recovery Codes Modal */}
        <Dialog open={showRecoveryCodesDialog} onOpenChange={setShowRecoveryCodesDialog}>
          <DialogContent className="max-w-md rounded-2xl border-pup-border p-0 overflow-hidden bg-white shadow-2xl dark:bg-card">
            <div className="bg-linear-to-br from-red-800 to-pup-maroon p-8 text-white relative overflow-hidden">
               <i className="ph-fill ph-shield-key absolute -right-8 -bottom-8 text-[120px] text-white/5 rotate-12"></i>
               <DialogTitle className="text-2xl font-black tracking-tight relative z-10">Recovery Codes</DialogTitle>
               <DialogDescription className="font-bold text-white/70 mt-1 relative z-10 text-sm">
                  Generated codes for emergency access.
               </DialogDescription>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100 shadow-inner grid grid-cols-2 gap-4 dark:bg-card dark:border-white/10 dark:shadow-none">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="font-mono text-sm font-black text-gray-700 flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-xs dark:text-zinc-200 dark:bg-card dark:border-white/10">
                    <span className="text-[10px] text-pup-maroon dark:text-primary font-black bg-red-50 w-5 h-5 flex items-center justify-center rounded uppercase dark:data-[state=active]:bg-red-500/10">{idx + 1}</span>
                    <span className="tracking-widest">{code}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 dark:bg-amber-400/10 dark:border-amber-400/20">
                 <i className="ph-fill ph-warning text-xl text-amber-600 shrink-0 dark:text-amber-400"></i>
                 <p className="text-[11px] text-amber-900 font-bold leading-relaxed dark:text-amber-400/90">
                    WARNING: These codes are for emergency use only. Each code can be used once. Save them somewhere safe.
                 </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={copyRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] border-gray-300 rounded-xl hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 transition-all shadow-xs flex items-center justify-center gap-2 dark:border-white/10"
                  >
                    <i className="ph-bold ph-copy text-lg"></i> Clipboard
                  </Button>
                  <Button 
                    onClick={downloadRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-12 font-black uppercase tracking-widest text-[10px] border-gray-300 rounded-xl hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 transition-all shadow-xs flex items-center justify-center gap-2 dark:border-white/10"
                  >
                    <i className="ph-bold ph-download-simple text-lg"></i> Save File
                  </Button>
                </div>
                <Button 
                  onClick={() => setShowRecoveryCodesDialog(false)}
                  className="w-full h-14 bg-linear-to-b from-gray-900 to-black border-4 border-gray-800 hover:bg-gray-800 hover:shadow-xl transition-all text-white font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95"
                >
                  Confirm Codes Secured
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
