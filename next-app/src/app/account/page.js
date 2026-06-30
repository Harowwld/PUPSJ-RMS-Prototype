"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

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
  DialogClose,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/PageHeader";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import { isStrongSecurityAnswer } from "@/lib/authSchemas";

function AccountPageContent() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState(null);
  const fileInputRef = useRef(null);

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
        if (user.avatar_filename) {
          setAvatarUrl(`/api/account/avatar?id=${user.id}&t=${Date.now()}`);
        } else {
          setAvatarUrl(null);
        }
        setFname(user.fname || "");
        setLname(user.lname || "");
        setUsername(user.email || user.username || "");
        setUserPreferences(user.preferences || {});


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

  useEffect(() => {
    if (!authUser) return;
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon';
    if (isAdminRole(authUser.role)) {
      link.href = '/admin-logo.png';
    } else {
      link.href = '/staff-logo.png';
    }
    document.getElementsByTagName('head')[0].appendChild(link);
  }, [authUser]);

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
    // Theme switching is disabled (system is locked in light mode)
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

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Upload failed");
      }

      toast.success("Avatar Uploaded", {
        description: "Your profile photo has been successfully updated."
      });
      
      setAvatarUrl(`/api/account/avatar?id=${authUser.id}&t=${Date.now()}`);
      setAuthUser(prev => ({ ...prev, avatar_filename: json.avatar_filename }));
      window.dispatchEvent(new Event("avatar-changed"));
    } catch (err) {
      toast.error("Upload Failed", {
        description: err.message || "Could not update your avatar."
      });
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const res = await fetch("/api/account/avatar", {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Removal failed");
      }

      toast.success("Avatar Removed", {
        description: "Your profile photo has been removed."
      });
      
      setAvatarUrl(null);
      setAuthUser(prev => ({ ...prev, avatar_filename: null }));
      window.dispatchEvent(new Event("avatar-changed"));
    } catch (err) {
      toast.error("Removal Failed", {
        description: err.message || "Could not remove your avatar."
      });
    }
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
      const trimmed = val?.trim();
      if (trimmed) {
        if (!isStrongSecurityAnswer(trimmed)) {
          setSecError("Security answers must be at least 10 characters and not too repetitive.");
          return;
        }
        payload.push({ questionId: q.id, answer: trimmed });
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
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-background font-inter selection:bg-pup-maroon selection:text-white">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="max-w-[1200px] mx-auto py-10 px-4">
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
            className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-10 items-stretch"
          >
          {/* Sidebar Navigation */}
          <aside className="lg:sticky lg:top-24 h-full flex flex-col justify-stretch">
            <div className="bg-transparent p-0 flex flex-col h-full w-full">
              
              {/* Header Section */}
              <div className="flex items-center gap-4 w-full mb-[24px] px-1">
                {/* Avatar: 68px, circular */}
                <div className="flex flex-col items-center shrink-0">
                  <div 
                    onClick={handleAvatarClick}
                    className="relative group w-[68px] h-[68px] shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center justify-center text-[22px] font-semibold shadow-inner cursor-pointer overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-pup-maroon/20"
                  >
                    {avatarUrl ? (
                      <img 
                        src={avatarUrl} 
                        alt="Profile avatar" 
                        className="w-full h-full object-cover"
                        onError={() => setAvatarUrl(null)}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <i className="ph-bold ph-camera text-white text-base"></i>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="mt-1.5 text-[11px] font-medium text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                    >
                      Remove
                    </button>
                  )}
                </div>
                
                {/* Identity Info */}
                <div className="min-w-0 flex flex-col items-start justify-center">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[18px] font-semibold text-gray-900 tracking-[-0.01em] dark:text-zinc-50 leading-tight">
                      {fname} {lname}
                    </h3>
                    {authUser?.role && (
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-[4px] bg-red-50 text-pup-maroon dark:bg-red-500/20 dark:text-red-400 tracking-[0.04em]">
                        {isAdminRole(authUser.role) ? "Admin" : authUser.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] font-normal text-[#8E8E93] dark:text-zinc-400 mt-[4px] truncate">
                    {authUser?.email || authUser?.username}
                  </p>
                </div>
              </div>

              {/* Navigation Menu */}
              <TabsList className="w-full flex flex-col h-auto bg-transparent p-0 gap-[4px]">
                {[
                  { id: "profile", label: "Profile", icon: "ph-identification-card" },
                  { id: "security", label: "Security", icon: "ph-shield-star" }
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="group flex items-center justify-start gap-3 w-full px-4 py-3 rounded-[10px] text-[15px] font-medium tracking-[-0.01em] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-pup-maroon/20 cursor-pointer data-[state=active]:bg-[#F0F0F2] data-[state=active]:text-[#1C1C1E] data-[state=active]:font-semibold dark:data-[state=active]:bg-zinc-800 dark:data-[state=active]:text-zinc-100 text-[#8E8E93] hover:bg-[#F5F5F7] dark:hover:bg-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    <i className={cn(
                      "ph-bold text-[18px] shrink-0 transition-colors",
                      "text-[#8E8E93] group-data-[state=active]:text-[#1C1C1E] dark:text-zinc-500 dark:group-data-[state=active]:text-zinc-100"
                    )}></i>
                    <span className="truncate text-left">{tab.label}</span>
                    <div className="shrink-0 ml-auto w-5 h-5 flex items-center justify-center opacity-0 group-data-[state=active]:opacity-100 transition-opacity">
                      <i className="ph-bold ph-caret-right text-sm text-[#1C1C1E] dark:text-zinc-100"></i>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </aside>

          {/* Content Area */}
          <div className="min-w-0 space-y-8 flex-1">
            <TabsContent value="profile" className="m-0 border-0 focus-visible:ring-0">
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

            <TabsContent value="security" className="m-0 border-0 focus-visible:ring-0">
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
                          className={cn(
                            "h-10 px-6 btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] flex items-center active:scale-95 disabled:opacity-50",
                            pwLoading && "gap-2"
                          )}
                        >
                          {pwLoading && (
                            <i className="ph-bold ph-spinner animate-spin text-base"></i>
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
                                    <div className="h-10 flex items-center px-3 bg-gray-50 border-[0.5px] border-gray-200 rounded-[8px] text-[11px] font-normal text-gray-400 select-none dark:bg-white/5 dark:border-white/10 dark:text-zinc-500">
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
                          className={cn(
                            "h-10 px-6 btn-brand-red !rounded-[8px] text-[13px] font-medium tracking-[-0.01em] flex items-center active:scale-95 disabled:opacity-50",
                            secLoading && "gap-2"
                          )}
                        >
                          {secLoading && (
                            <i className="ph-bold ph-spinner animate-spin text-base"></i>
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
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8 bg-gray-50 rounded-2xl border border-gray-100 p-8 items-center dark:bg-card dark:border-white/10">
                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-gray-900 tracking-tight dark:text-zinc-50">Setup</h4>
                            <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
                              Scan the QR code using your authenticator app (like Google Authenticator or Authy) to link your account.
                            </p>
                            
                            <div className="space-y-2 mt-4">
                               <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-white/10">
                                  <span className="text-[9px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">Secret key</span>
                                  <span className="text-sm font-semibold text-pup-maroon dark:text-primary tracking-wider break-all font-inter">{totpSetupData.secret}</span>
                                </div>
                               <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-white/10">
                                  <span className="text-[9px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">Serial key (Backup)</span>
                                  <span className="text-sm font-semibold text-gray-900 tracking-wider break-all dark:text-zinc-50 font-inter">{totpSetupData.serialKey}</span>
                                </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center w-full">
                            <div className="bg-transparent p-0 border-0 shadow-none dark:bg-transparent w-full flex justify-center">
                              <img
                                src={totpSetupData.qrCode}
                                alt="TOTP QR Code"
                                className="w-full h-auto max-w-[280px] aspect-square object-contain"
                              />
                            </div>
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

                        <div className="pt-8 border-t border-gray-100 flex justify-end gap-2 dark:border-white/10">
                          <Button
                            onClick={cancelTOTPSetup}
                            disabled={totpLoading}
                            variant="ghost"
                            className="h-12 px-8 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center justify-center rounded-xl shadow-none! border-0!"
                          >
                            Cancel
                          </Button>
                          <Button
                             onClick={verifyTOTP}
                             disabled={totpLoading || totpToken.length !== 6}
                             className="h-12 px-10 btn-brand-red font-semibold text-sm shadow-md flex items-center justify-center gap-2"
                           >
                             {totpLoading && (
                               <i className="ph-bold ph-spinner animate-spin text-xl"></i>
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
                                  variant="ghost"
                                  className="h-12 px-6 font-semibold text-sm text-gray-600 hover:text-gray-900 hover:bg-transparent dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-transparent transition-colors flex items-center justify-center rounded-xl shadow-none! border-0!"
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
          </div>
        </Tabs>
        </div>

        {/* Recovery Codes Modal */}
        <Dialog open={showRecoveryCodesDialog} onOpenChange={setShowRecoveryCodesDialog}>
          <DialogContent hideClose={true} className="max-w-[560px] sm:max-w-[560px] rounded-[20px] border-[#E5E5EA] dark:border-zinc-800 p-6 overflow-hidden bg-white shadow-2xl dark:bg-card">
            <div className="relative pb-4">
               <DialogClose asChild>
                 <button className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-full text-[#8E8E93] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 transition-colors focus:outline-none">
                   <i className="ph-bold ph-x text-[16px]"></i>
                 </button>
               </DialogClose>
               <DialogTitle className="text-[20px] font-bold text-[#1C1C1E] dark:text-zinc-100 tracking-tight">Recovery Codes</DialogTitle>
               <DialogDescription className="text-[13.5px] font-normal text-[#8E8E93] mt-1 dark:text-zinc-400">
                  Generated codes for emergency access.
               </DialogDescription>
            </div>
            
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="font-inter text-[14.5px] font-semibold text-[#1C1C1E] dark:text-zinc-200 flex items-center gap-3 bg-[#F5F5F7] p-3 rounded-[10px] border border-[#E5E5EA] dark:bg-white/5 dark:border-zinc-850">
                    <span className="text-[11px] text-[#636366] dark:text-zinc-400 font-bold bg-[#E5E5EA] dark:bg-zinc-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                      {idx + 1}
                    </span>
                    <span className="tracking-widest font-inter">{code}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-[12px] dark:bg-amber-500/10 dark:border-amber-500/25">
                 <p className="text-[13.5px] text-[#8A6D3B] dark:text-amber-300 font-medium leading-relaxed">
                    WARNING: These codes are for emergency use only. Each code can be used once. Save them somewhere safe.
                 </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <Button 
                    onClick={copyRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-11 px-5 font-semibold text-[13px] text-[#1C1C1E] dark:text-zinc-200 border-[#E5E5EA] dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-[10px] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 hover:text-[#1C1C1E] transition-all shadow-none flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-copy text-base"></i> Clipboard
                  </Button>
                  <Button 
                    onClick={downloadRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-11 px-5 font-semibold text-[13px] text-[#1C1C1E] dark:text-zinc-200 border-[#E5E5EA] dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-[10px] hover:bg-[#F5F5F7] dark:hover:bg-zinc-800 hover:text-[#1C1C1E] transition-all shadow-none flex items-center justify-center gap-2"
                  >
                    <i className="ph-bold ph-download-simple text-base"></i> Save File
                  </Button>
                </div>
                <Button 
                  onClick={() => setShowRecoveryCodesDialog(false)}
                  className="w-full h-11 bg-[#0A84FF] hover:bg-[#0070E0] active:bg-[#0062C4] text-white font-semibold text-[14px] rounded-[12px] transition-colors shadow-none active:scale-95 border-0"
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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
