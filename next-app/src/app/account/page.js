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
  const [prefTab, setPrefTab] = useState("visuals");

  // System Settings State (Global)
  const [systemSettings, setSystemSettings] = useState({});
  const [systemSettingsLoading, setSystemSettingsLoading] = useState(false);

  // User Preferences State (Personal)
  const [userPreferences, setUserPreferences] = useState({});

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
        setUserPreferences(user.preferences || {});
        if (user.preferences?.theme) {
          setTheme(user.preferences.theme);
        }

        // If admin, fetch global system settings
        if (isAdminRole(user.role)) {
          fetch("/api/system/settings")
            .then(res => res.json())
            .then(json => {
              if (json.ok) setSystemSettings(json.data);
            })
            .catch(err => console.error("Failed to fetch system settings:", err));
        }

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

  const handleUserPreferenceToggle = async (key, checked) => {
    const newValue = checked;
    const oldPrefs = { ...userPreferences };
    setUserPreferences((prev) => ({ ...prev, [key]: newValue }));
    
    if (key === "navigation_layout" && authUser?.id) {
      localStorage.setItem(`pup_nav_layout_pref_${authUser.id}`, newValue);
    }
    
    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [key]: newValue } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success("Preference Saved", {
        description: "Your settings have been successfully updated."
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      toast.error("Save Failed", {
        description: error.message || "Could not update your preference."
      });
    }
  };

  const handleAccessibilityToggle = async (key, val) => {
    const oldPrefs = { ...userPreferences };
    setUserPreferences((prev) => ({ ...prev, [key]: val }));
    
    if (authUser?.id) {
      if (key === "high_contrast") {
        localStorage.setItem(`pup_high_contrast_${authUser.id}`, String(val));
        if (val) {
          document.documentElement.classList.add("high-contrast");
        } else {
          document.documentElement.classList.remove("high-contrast");
        }
      }
    }
    
    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [key]: val } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success("Preference Saved", {
        description: "Your accessibility settings have been updated successfully."
      });
      window.dispatchEvent(new Event("storage"));
    } catch (error) {
      setUserPreferences(oldPrefs);
      toast.error("Save Failed", {
        description: error.message || "Could not update your preference."
      });
    }
  };

  const handleThemeChange = async (newThemeOrEvent) => {
    const nextTheme = typeof newThemeOrEvent === "string"
      ? newThemeOrEvent
      : newThemeOrEvent?.target?.value;
    
    if (!nextTheme) return;

    const changeThemeState = () => setTheme(nextTheme);

    if (document.startViewTransition) {
      document.startViewTransition(changeThemeState);
    } else {
      changeThemeState();
    }

    try {
      await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { theme: nextTheme } }),
      });
    } catch (err) {
      console.error("Failed to save theme preference:", err);
    }
  };

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
    toast.success("Copied to Clipboard", {
      description: "Recovery codes have been saved to your clipboard."
    });
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
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-white/5">
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


  const initials =
    authUser?.fname && authUser?.lname
      ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
      : "AD";



  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-background font-inter selection:bg-pup-maroon selection:text-white">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[1100px] mx-auto py-10 px-4">
        <PageHeader
          title="Account Settings"
          description="Update your personal info and security settings."
          actions={
            <Button
              variant="ghost"
              onClick={() => {
                const path = isAdminRole(authUser?.role) ? "/admin" : "/staff";
                router.push(path);
              }}
              className="h-10 px-3 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center gap-2 rounded-brand shadow-none! border-0!"
            >
              <i className="ph-bold ph-arrow-left"></i>
              Dashboard
            </Button>
          }
        />

        <Separator className="mt-8 bg-gray-200 dark:bg-zinc-800" />

        <div className="mt-8">
          <Tabs
            defaultValue="profile"
            value={activeTab}
            onValueChange={setActiveTab}
            className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10 items-start"
          >
          {/* Sidebar Navigation */}
          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-brand border border-gray-200 shadow-2xl shadow-black/5 overflow-hidden dark:bg-zinc-900 dark:border-white/5">
              
              {/* Header Section */}
              <div className="p-5 flex items-center gap-4 border-b border-gray-100 dark:border-white/5">
                {/* Avatar: 48px (w-12 h-12), circular, no white card behind it */}
                <div className="w-12 h-12 shrink-0 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center justify-center text-[16px] font-semibold shadow-inner">
                  {initials}
                </div>
                
                {/* Identity Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[15px] font-semibold text-gray-900 tracking-[-0.01em] dark:text-zinc-50 leading-tight">
                      {fname} {lname}
                    </h3>
                    {authUser?.role && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-pup-maroon dark:bg-red-500/20 dark:text-red-400 uppercase tracking-[0.04em]">
                        {authUser.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 mt-1 truncate">
                    {authUser?.email || authUser?.username}
                  </p>
                </div>
              </div>

              {/* Navigation Menu */}
              <div className="p-5 pt-0">
                <TabsList className="w-full flex flex-col h-auto bg-transparent p-0 gap-1">
                  {[
                    { id: "profile", label: "Profile", icon: "ph-identification-card" },
                    { id: "security", label: "Security", icon: "ph-shield-star" },
                    { id: "preferences", label: "Preferences", icon: "ph-palette" }
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="group flex items-center justify-start gap-[6px] w-full px-3 py-2.5 rounded-[8px] text-[14px] font-normal whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 data-[state=active]:bg-red-50 dark:data-[state=active]:bg-red-500/10 data-[state=active]:text-pup-maroon dark:data-[state=active]:text-primary text-gray-650 hover:bg-gray-50 dark:hover:bg-white/5 dark:text-zinc-400 dark:hover:text-zinc-50 dark:focus-visible:ring-red-500/20 cursor-pointer"
                    >
                      <i className={cn(
                        "ph-bold text-[16px] shrink-0 text-gray-400 dark:text-zinc-500 transition-colors",
                        "group-data-[state=active]:text-pup-maroon dark:group-data-[state=active]:text-primary"
                      )}></i>
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
          <div className="min-w-0 space-y-8 flex-1">
            <TabsContent value="profile" className="m-0 border-0 focus-visible:ring-0 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="rounded-2xl border-gray-200 shadow-xs overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                <CardHeader className="bg-transparent p-[28px] pb-0">
                  <div>
                    <CardTitle className="!text-[20px] font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Profile
                    </CardTitle>
                    <CardDescription className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Your name appears across the platform.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="p-[28px] pt-6">
                  <form onSubmit={submitProfile} className="space-y-6">
                    {profileError && (
                      <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-3 animate-in shake-1 dark:bg-red-500/10 dark:border-red-500/20">
                        <i className="ph-fill ph-warning-circle text-lg"></i>
                        {profileError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 px-1 dark:text-zinc-450 block">
                          First Name
                        </label>
                        <Input
                          type="text"
                          className="h-10 rounded-[8px] border-[0.5px] border-gray-200 bg-white px-3 text-[14px] font-normal tracking-[-0.01em] shadow-none transition-all focus-visible:border-gray-400 focus-visible:ring-0 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:border-white/20"
                          placeholder="First Name"
                          value={fname}
                          onChange={(e) => setFname(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 px-1 dark:text-zinc-450 block">
                          Last Name
                        </label>
                        <Input
                          type="text"
                          className="h-10 rounded-[8px] border-[0.5px] border-gray-200 bg-white px-3 text-[14px] font-normal tracking-[-0.01em] shadow-none transition-all focus-visible:border-gray-400 focus-visible:ring-0 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:border-white/20"
                          placeholder="Last Name"
                          value={lname}
                          onChange={(e) => setLname(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 px-1 dark:text-zinc-450 block">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        className="h-10 rounded-[8px] border-[0.5px] border-gray-200 bg-gray-50 px-3 text-[14px] font-normal tracking-[-0.01em] shadow-none text-gray-400 cursor-not-allowed select-none dark:border-white/10 dark:bg-white/5 dark:text-zinc-500"
                        value={username}
                        readOnly
                      />
                      <p className="text-[11px] text-gray-400 font-normal mt-1.5 ml-1 dark:text-zinc-500">
                        Your email is managed by administrators and cannot be changed.
                      </p>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={profileLoading}
                        className="h-10 px-6 btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] flex items-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {profileLoading ? (
                          <i className="ph-bold ph-spinner animate-spin text-base"></i>
                        ) : (
                          <i className="ph-bold ph-check text-base"></i>
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
                <Card className="rounded-2xl border-gray-200 shadow-xs overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                  <CardHeader className="bg-transparent p-[28px] pb-0">
                    <div>
                      <CardTitle className="!text-[20px] font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                        Password
                      </CardTitle>
                      <CardDescription className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                        Keep your account secure with a strong password.
                        {authUser?.password_last_changed && (
                          <p className="text-[11px] font-normal text-gray-400 dark:text-zinc-550 mt-2">
                            Last changed {new Date(authUser.password_last_changed).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="p-[28px] pt-6">
                    <form onSubmit={submitPassword} className="space-y-6">
                      {pwError && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-3 animate-in shake-1 dark:bg-red-500/10 dark:border-red-500/20">
                          <i className="ph-fill ph-warning-circle text-lg"></i>
                          {pwError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 px-1 dark:text-zinc-450 block">
                            Current
                          </label>
                          <div className="relative group">
                            <Input
                              type={showPw.current ? "text" : "password"}
                              className="h-10 rounded-[8px] border-[0.5px] border-gray-200 bg-white pr-10 pl-3 text-[14px] font-normal tracking-[-0.01em] shadow-none transition-all focus-visible:border-gray-400 focus-visible:ring-0 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:border-white/20"
                              placeholder="••••••••"
                              value={pwCurrent}
                              onChange={(e) => setPwCurrent(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPw(prev => ({ ...prev, current: !prev.current }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 transition-colors dark:text-zinc-500 dark:hover:text-zinc-350"
                            >
                              <i className={cn("ph-bold", showPw.current ? "ph-eye-slash" : "ph-eye")}></i>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 px-1 dark:text-zinc-450 block">
                              New
                            </label>
                            <div className="relative group">
                              <Input
                                type={showPw.next ? "text" : "password"}
                                className="h-10 rounded-[8px] border-[0.5px] border-gray-200 bg-white pr-10 pl-3 text-[14px] font-normal tracking-[-0.01em] shadow-none transition-all focus-visible:border-gray-400 focus-visible:ring-0 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:border-white/20"
                                placeholder="••••••••"
                                value={pwNext}
                                onChange={(e) => setPwNext(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPw(prev => ({ ...prev, next: !prev.next }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 transition-colors dark:text-zinc-500 dark:hover:text-zinc-350"
                              >
                                <i className={cn("ph-bold", showPw.next ? "ph-eye-slash" : "ph-eye")}></i>
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 px-1 dark:text-zinc-450 block">
                              Confirm
                            </label>
                            <div className="relative group">
                              <Input
                                type={showPw.confirm ? "text" : "password"}
                                className="h-10 rounded-[8px] border-[0.5px] border-gray-200 bg-white pr-10 pl-3 text-[14px] font-normal tracking-[-0.01em] shadow-none transition-all focus-visible:border-gray-400 focus-visible:ring-0 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:border-white/20"
                                placeholder="••••••••"
                                value={pwConfirm}
                                onChange={(e) => setPwConfirm(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPw(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 transition-colors dark:text-zinc-500 dark:hover:text-zinc-350"
                              >
                                <i className={cn("ph-bold", showPw.confirm ? "ph-eye-slash" : "ph-eye")}></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={pwLoading}
                          className="h-10 px-6 btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                          {pwLoading ? (
                            <i className="ph-bold ph-spinner animate-spin text-base"></i>
                          ) : (
                            <i className="ph-bold ph-key text-base"></i>
                          )}
                          {pwLoading ? "Updating..." : "Update"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Security Questions Card */}
                <Card className="rounded-2xl border-gray-200 shadow-xs overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                  <CardHeader className="bg-transparent p-[28px] pb-0">
                    <div>
                      <CardTitle className="!text-[20px] font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                        Security Questions
                      </CardTitle>
                      <CardDescription className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                        Set up questions to help recover your account.
                        {hasSetSecurity && (
                          <p className="text-[11px] font-normal text-emerald-600 dark:text-emerald-400 mt-2">
                            Recovery questions are active.
                          </p>
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="p-[28px] pt-6">
                    <form onSubmit={submitSecurity} className="space-y-6">
                      {secError && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-lg flex items-center gap-3 animate-in shake-1 dark:bg-red-500/10 dark:border-red-500/20">
                          <i className="ph-fill ph-warning-circle text-lg"></i>
                          {secError}
                        </div>
                      )}

                      <div className="space-y-6">
                        {globalQuestions.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400 font-semibold text-sm dark:bg-card dark:border-white/10 dark:text-zinc-500">
                            <i className="ph-duotone ph-mask-sad text-xl mb-3 block opacity-20"></i>
                            No recovery questions configured.
                          </div>
                        ) : (
                          globalQuestions.map((q) => {
                            const isEditing = !!editingSecQuestions[q.id];
                            const showInput = !q.hasAnswer || isEditing;

                            return (
                              <div key={q.id} className="space-y-1">
                                <div className="flex items-center justify-between mb-1 px-1">
                                  <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-450 block">
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
                                      className="text-[12px] font-medium text-pup-maroon dark:text-red-400 hover:text-pup-darkMaroon dark:hover:text-red-300 transition-colors cursor-pointer"
                                    >
                                      {isEditing ? "Cancel" : "Edit"}
                                    </button>
                                  )}
                                </div>

                                <div className="relative">
                                  {showInput ? (
                                    <Input
                                      type="text"
                                      className="h-10 rounded-[8px] border-[0.5px] border-gray-200 bg-white px-3 text-[14px] font-normal tracking-[-0.01em] shadow-none transition-all focus-visible:border-gray-400 focus-visible:ring-0 text-gray-900 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:focus-visible:border-white/20 animate-in fade-in slide-in-from-top-1 duration-300"
                                      placeholder="••••••••"
                                      value={secAnswers[q.id] || ""}
                                      onChange={(e) => setSecAnswers({ ...secAnswers, [q.id]: e.target.value })}
                                      autoFocus={isEditing}
                                    />
                                  ) : (
                                    <div className="h-10 flex items-center px-3 bg-gray-50 border-[0.5px] border-gray-200 rounded-[8px] text-[11px] font-normal text-gray-400 italic select-none dark:bg-white/5 dark:border-white/10 dark:text-zinc-500">
                                      Answer saved and encrypted.
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={secLoading || globalQuestions.length === 0}
                          className="h-10 px-6 btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] flex items-center gap-2 active:scale-95 disabled:opacity-50"
                        >
                          {secLoading ? (
                            <i className="ph-bold ph-spinner animate-spin text-base"></i>
                          ) : (
                            <i className="ph-bold ph-check text-base"></i>
                          )}
                          {secLoading ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* 2FA Card */}
                <Card className="rounded-2xl border-gray-200 shadow-xs overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                  <CardHeader className="bg-transparent p-[28px] pb-0">
                    <div>
                      <CardTitle className="!text-[20px] font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                        Two-Factor Authentication
                      </CardTitle>
                      <CardDescription className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                        Add an extra layer of security to your account.
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="p-[28px] pt-6">
                    {totpStep === "setup" && totpSetupData ? (
                      <div className="space-y-6 animate-in zoom-in-95 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-8 bg-gray-50 rounded-2xl border border-gray-100 p-8 items-center dark:bg-card dark:border-white/10">
                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-gray-900 tracking-tight dark:text-zinc-50">Setup</h4>
                            <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
                              Scan the QR code using your authenticator app (like Google Authenticator or Authy) to link your account.
                            </p>
                            
                            <div className="space-y-2 mt-4">
                               <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-white/10">
                                  <span className="text-[9px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">Secret key</span>
                                  <code className="text-sm font-semibold text-pup-maroon dark:text-primary tracking-wider break-all">{totpSetupData.secret}</code>
                               </div>
                               <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-white/10">
                                  <span className="text-[9px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">Serial key (Backup)</span>
                                  <code className="text-sm font-semibold text-gray-900 tracking-wider break-all dark:text-zinc-50">{totpSetupData.serialKey}</code>
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
                            <span className="mt-4 text-[10px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">Scan QR code</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold tracking-widest text-gray-500 px-1 dark:text-zinc-400">
                            Enter Verification Code
                          </label>
                          <Input
                            type="text"
                            maxLength={6}
                            className="h-16 rounded-xl border border-gray-200 bg-white text-center text-xl font-semibold text-gray-900 shadow-inner transition-all focus-visible:border-pup-maroon/20 focus-visible:ring-4 focus-visible:ring-pup-maroon/5 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none"
                            placeholder="000000"
                            value={totpToken}
                            onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            autoFocus
                          />
                        </div>

                        {totpError && (
                          <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-semibold rounded-xl flex items-center gap-4 animate-in shake-1 dark:data-[state=active]:bg-red-500/10">
                            <i className="ph-fill ph-warning-circle text-xl"></i>
                            {totpError}
                          </div>
                        )}

                        <div className="pt-8 border-t border-gray-100 flex justify-end gap-4 dark:border-white/10">
                          <Button
                            onClick={cancelTOTPSetup}
                            disabled={totpLoading}
                            variant="outline"
                            className="h-12 px-8 font-semibold tracking-widest text-[11px] border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-xs dark:border-white/10 dark:bg-card dark:hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                          <Button
                             onClick={verifyTOTP}
                             disabled={totpLoading || totpToken.length !== 6}
                             className="h-12 px-10 btn-brand-red font-semibold text-sm shadow-md"
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
                      <div className="divide-y divide-gray-100 dark:divide-white/5 animate-in fade-in duration-500">
                        {/* Authenticator App Method */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 py-6">
                          <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-zinc-500 shrink-0">
                              <i className="ph-bold ph-device-mobile text-[16px]"></i>
                            </div>
                            <div>
                              <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 flex items-center gap-2 leading-tight">
                                Authenticator App
                                {totpEnabled ? (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 uppercase tracking-[0.04em]">Active</span>
                                ) : (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 uppercase tracking-[0.04em]">Inactive</span>
                                )}
                              </h4>
                              <p className="text-[12px] font-normal text-gray-500 mt-1 max-w-md dark:text-zinc-400">
                                Secure your account with temporary, rotating 6-digit codes generated from an authenticator app (like Google Authenticator or Authy).
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 w-full md:w-auto flex justify-end">
                             {totpEnabled ? (
                               <Button
                                 onClick={() => setTotpStep("disable-flow")}
                                 variant="outline"
                                 className="h-10 px-4 font-medium text-[13px] tracking-[-0.01em] border-gray-300 rounded-[8px]"
                               >
                                 Disable App
                               </Button>
                             ) : (
                               <Button
                                 onClick={startTOTPSetup}
                                 disabled={totpLoading}
                                 className="h-10 px-6 btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] active:scale-95 disabled:opacity-50"
                               >
                                 {totpLoading ? "Setting Up..." : "Set Up"}
                               </Button>
                             )}
                           </div>
                        </div>

                        {/* TOTP Disable Form Flow */}
                        {totpStep === "disable-flow" && (
                          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 space-y-6 animate-in zoom-in-95 duration-300 dark:bg-white/5 dark:border-white/10">
                             <div className="space-y-2">
                                <label className="text-[10px] font-semibold tracking-widest text-gray-500 px-1 dark:text-zinc-400">
                                  Enter Authenticator Code to Disable
                                </label>
                                <Input
                                  type="text"
                                  maxLength={6}
                                  className="h-16 rounded-xl border border-gray-200 bg-white text-center text-xl font-semibold text-gray-900 shadow-inner transition-all focus-visible:border-red-500/20 focus-visible:ring-4 focus-visible:ring-red-500/5 dark:border-white/10 dark:bg-card dark:text-zinc-50 dark:shadow-none"
                                  placeholder="000000"
                                  value={totpToken}
                                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  autoFocus
                                />
                             </div>

                             {totpError && (
                               <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-semibold rounded-xl flex items-center gap-4 animate-in shake-1 dark:bg-red-500/10">
                                 <i className="ph-fill ph-warning-circle text-xl"></i>
                                 {totpError}
                                </div>
                             )}

                             <div className="flex justify-end gap-3">
                                <Button
                                  onClick={() => { setTotpStep("idle"); setTotpToken(""); setTotpError(""); }}
                                  variant="outline"
                                  className="h-12 px-6 font-semibold tracking-widest text-[10px] border-gray-300 rounded-xl"
                                >
                                  Cancel
                                </Button>
                                 <Button
                                   onClick={async (e) => {
                                     await disableTOTP();
                                     setTotpStep("idle");
                                   }}
                                   disabled={totpLoading || totpToken.length !== 6}
                                   className="h-12 px-8 btn-brand-red font-semibold text-sm shadow-md"
                                 >
                                   {totpLoading ? <i className="ph-bold ph-spinner animate-spin text-xl" /> : <i className="ph-bold ph-shield-slash text-xl" />}
                                   Confirm Disable
                                 </Button>
                             </div>
                          </div>
                        )}

                        {/* Recovery Codes Method */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 py-6">
                          <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-zinc-500 shrink-0">
                              <i className="ph-bold ph-shield-check text-[16px]"></i>
                            </div>
                            <div>
                              <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 flex items-center gap-2 leading-tight">
                                Backup Recovery Codes
                                {recoveryCodesCount > 0 ? (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 uppercase tracking-[0.04em]">Active ({recoveryCodesCount} left)</span>
                                ) : (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400 uppercase tracking-[0.04em]">Inactive</span>
                                )}
                              </h4>
                              <p className="text-[12px] font-normal text-gray-500 mt-1 max-w-md dark:text-zinc-400">
                                Generate a list of single-use backup recovery codes. These allow secure access to your account in emergency events.
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 w-full md:w-auto flex justify-end gap-3">
                            {recoveryCodesCount > 0 && (
                              <Button
                                onClick={async () => {
                                  setTotpLoading(true);
                                  try {
                                    const res = await fetch("/api/auth/totp", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ action: "disable-recovery-codes" })
                                    });
                                    const json = await res.json();
                                    if (json.ok) {
                                      setRecoveryCodesCount(0);
                                      toast.success("Recovery Codes Disabled", {
                                        description: "Your emergency backup codes have been invalidated."
                                      });
                                      // Refresh status
                                      const resTOTP = await fetch("/api/auth/totp");
                                      const jsonTOTP = await resTOTP.json().catch(() => null);
                                      if (jsonTOTP?.ok && jsonTOTP.data) {
                                        setTotpEnabled(jsonTOTP.data.enabled);
                                      }
                                    } else {
                                      throw new Error(json.error);
                                    }
                                  } catch (err) {
                                    toast.error("Action Failed", {
                                      description: "Failed to disable recovery codes: " + err.message
                                    });
                                  } finally {
                                    setTotpLoading(false);
                                  }
                                }}
                                disabled={totpLoading}
                                variant="outline"
                                className="h-10 px-4 font-medium text-[13px] tracking-[-0.01em] border-gray-300 rounded-[8px]"
                              >
                                Disable Codes
                              </Button>
                            )}
                            <Button
                               onClick={generateNewRecoveryCodes}
                               disabled={totpLoading}
                               className="h-10 px-6 btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] active:scale-95 disabled:opacity-50"
                             >
                               {totpLoading ? "Generating..." : (recoveryCodesCount > 0 ? "Regenerate" : "Generate")}
                             </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="m-0 border-0 focus-visible:ring-0 animate-in fade-in slide-in-from-right-4 duration-500">
              <Card className="rounded-2xl border-gray-200 shadow-sm overflow-hidden bg-white dark:border-white/10 dark:bg-card">
                <CardHeader className="bg-linear-to-r from-gray-50/80 to-white border-b border-gray-100 p-[28px] dark:bg-muted dark:bg-none dark:border-white/10">
                  <div className="flex items-center gap-5">
                    <div>
                      <CardTitle className="!text-[20px] font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                        System Preference
                      </CardTitle>
                      <CardDescription className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                        Customize how the system looks for you.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-[28px] pt-6">
                  <div className="space-y-6">
                    {/* Tab Navigation */}
                    <div className="grid w-full grid-cols-3 gap-2 pb-2">
                      <button
                        type="button"
                        onClick={() => setPrefTab("visuals")}
                        className={cn(
                          "text-[13px] font-medium py-2 transition-all cursor-pointer text-center outline-none border-b-2",
                          prefTab === "visuals"
                            ? "border-pup-maroon text-pup-maroon dark:border-primary dark:text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-950 dark:hover:text-zinc-200"
                        )}
                      >
                        Visuals
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrefTab("layout")}
                        className={cn(
                          "text-[13px] font-medium py-2 transition-all cursor-pointer text-center outline-none border-b-2",
                          prefTab === "layout"
                            ? "border-pup-maroon text-pup-maroon dark:border-primary dark:text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-950 dark:hover:text-zinc-200"
                        )}
                      >
                        Layout
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrefTab("personal")}
                        className={cn(
                          "text-[13px] font-medium py-2 transition-all cursor-pointer text-center outline-none border-b-2",
                          prefTab === "personal"
                            ? "border-pup-maroon text-pup-maroon dark:border-primary dark:text-primary"
                            : "border-transparent text-gray-500 hover:text-gray-950 dark:hover:text-zinc-200"
                        )}
                      >
                        Personal
                      </button>
                    </div>

                    {/* Visuals Category */}
                    {prefTab === "visuals" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-3">
                          <div className="px-1">
                            <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-450 block">
                              Interface Theme
                            </label>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {['system', 'light', 'dark'].map((t) => (
                              <button
                                type="button"
                                key={t}
                                onClick={() => handleThemeChange({ target: { value: t } })}
                                className={cn(
                                  "relative flex flex-col items-center gap-3 p-5 rounded-[8px] border transition-all group overflow-hidden cursor-pointer",
                                  theme === t 
                                    ? "border-pup-maroon border-[1.5px] bg-red-50/50 dark:border-primary dark:bg-red-500/10" 
                                    : "border-gray-200 border-[0.5px] bg-white hover:border-gray-300 dark:border-white/10 dark:bg-card dark:hover:border-white/20"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 flex items-center justify-center transition-all",
                                  theme === t 
                                    ? "rounded-full bg-pup-maroon text-white dark:bg-primary text-[20px]" 
                                    : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-350 text-[20px]"
                                )}>
                                  <i className={cn(
                                    "ph-bold",
                                    t === 'system' ? "ph-desktop" : t === 'light' ? "ph-sun" : "ph-moon"
                                  )}></i>
                                </div>
                                <span className={cn(
                                  "text-[12px] font-medium tracking-wide",
                                  theme === t ? "text-pup-maroon dark:text-primary" : "text-gray-500 dark:text-zinc-400"
                                )}>
                                  {t.charAt(0).toUpperCase() + t.slice(1)}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <Separator className="bg-gray-100 dark:bg-white/5" />

                        <div className="space-y-3">
                          <div className="px-1">
                            <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-450 block">
                              Accessibility Options
                            </label>
                          </div>

                          <div className="py-4 flex items-center justify-between gap-6">
                            <div className="space-y-1">
                              <h4 className="text-[13px] font-medium text-gray-900 dark:text-zinc-50 tracking-[-0.01em]">High Contrast Mode</h4>
                              <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400">
                                Increases visibility by showing highly contrasting colors.
                              </p>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center shrink-0">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={!!userPreferences.high_contrast}
                                onChange={(e) => handleAccessibilityToggle("high_contrast", e.target.checked)}
                              />
                              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-pup-maroon peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:border-gray-600 dark:bg-zinc-700 dark:peer-focus:ring-red-800"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Layout Category */}
                    {prefTab === "layout" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-3">
                          <div className="px-1">
                            <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400 block">
                              Navigation Layout
                            </label>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                              { key: 'sidebar', label: 'Sidebar Navigation', icon: 'ph-sidebar-simple', desc: 'Traditional left-hand sidebar navigation layout.' },
                              { key: 'topbar', label: 'Top Navbar', icon: 'ph-navigation-arrow', desc: 'Modern top navigation bar layout.' }
                            ].map((item) => {
                              const isActive = item.key === 'topbar' 
                                ? userPreferences.navigation_layout === 'topbar' 
                                : (!userPreferences.navigation_layout || userPreferences.navigation_layout === 'sidebar');
                              return (
                                <button
                                  type="button"
                                  key={item.key}
                                  onClick={() => handleUserPreferenceToggle("navigation_layout", item.key)}
                                  className={cn(
                                    "relative flex items-center gap-4 p-5 rounded-[8px] border transition-all text-left cursor-pointer w-full min-h-[96px]",
                                    isActive
                                      ? "border-pup-maroon border-[1.5px] bg-red-50/50 dark:border-primary dark:bg-red-500/10" 
                                      : "border-gray-200 border-[0.5px] bg-white hover:border-gray-300 dark:border-white/10 dark:bg-card dark:hover:border-white/20"
                                  )}
                                >
                                  <div className="w-5 h-5 flex items-center justify-center text-[16px] text-gray-400 dark:text-zinc-500 shrink-0">
                                    <i className={cn("ph-bold", item.icon)}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <span className={cn(
                                      "text-[13px] font-semibold tracking-[-0.01em] block",
                                      isActive ? "text-pup-maroon dark:text-primary" : "text-gray-900 dark:text-zinc-50"
                                    )}>
                                      {item.label}
                                    </span>
                                    <p className="text-[12px] font-normal text-gray-500 mt-1 dark:text-zinc-400">
                                      {item.desc}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {prefTab === "personal" && (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-3">
                          <div className="px-1">
                            <label className="text-[11px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-400 block">
                              Workflow Preferences
                            </label>
                          </div>

                          <div className="py-4 flex items-center justify-between gap-6">
                            <div className="space-y-1">
                              <h4 className="text-[13px] font-semibold text-gray-900 dark:text-zinc-50 tracking-[-0.01em]">Skip Registration Confirmation</h4>
                              <p className="text-[12px] font-normal text-gray-500 mt-1 dark:text-zinc-400">
                                Bypass the final review modal when provisioning accounts.
                              </p>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center shrink-0">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={!!userPreferences.skip_registration_confirmation}
                                onChange={(e) => handleUserPreferenceToggle("skip_registration_confirmation", e.target.checked)}
                              />
                              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-pup-maroon peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:border-gray-600 dark:bg-zinc-700 dark:peer-focus:ring-red-800"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
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
               <DialogTitle className="text-xl font-semibold tracking-tight relative z-10">Recovery Codes</DialogTitle>
               <DialogDescription className="font-semibold text-white/70 mt-1 relative z-10 text-sm">
                  Generated codes for emergency access.
               </DialogDescription>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100 shadow-inner grid grid-cols-2 gap-4 dark:bg-card dark:border-white/10 dark:shadow-none">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="font-mono text-sm font-semibold text-gray-700 flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-xs dark:text-zinc-200 dark:bg-card dark:border-white/10">
                    <span className="text-[10px] text-pup-maroon dark:text-primary font-semibold bg-red-50 w-5 h-5 flex items-center justify-center rounded dark:data-[state=active]:bg-red-500/10">{idx + 1}</span>
                    <span className="tracking-widest">{code}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 dark:bg-amber-400/10 dark:border-amber-400/20">
                 <i className="ph-fill ph-warning text-xl text-amber-600 shrink-0 dark:text-amber-400"></i>
                 <p className="text-[11px] text-amber-900 font-semibold dark:text-amber-400/90">
                    WARNING: These codes are for emergency use only. Each code can be used once. Save them somewhere safe.
                 </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={copyRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-12 font-semibold tracking-widest text-[10px] border-gray-300 rounded-xl hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 transition-all shadow-xs flex items-center justify-center gap-2 dark:border-white/10"
                  >
                    <i className="ph-bold ph-copy text-lg"></i> Clipboard
                  </Button>
                  <Button 
                    onClick={downloadRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-12 font-semibold tracking-widest text-[10px] border-gray-300 rounded-xl hover:border-pup-maroon hover:text-pup-maroon dark:hover:text-red-500 transition-all shadow-xs flex items-center justify-center gap-2 dark:border-white/10"
                  >
                    <i className="ph-bold ph-download-simple text-lg"></i> Save File
                  </Button>
                </div>
                <Button 
                  onClick={() => setShowRecoveryCodesDialog(false)}
                  className="w-full h-14 bg-linear-to-b from-gray-900 to-black border-4 border-gray-800 hover:bg-gray-800 hover:shadow-xl transition-all text-white font-semibold tracking-widest rounded-xl shadow-lg active:scale-95"
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
