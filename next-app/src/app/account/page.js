"use client";
import HugeIcon from "@/components/shared/HugeIcon";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { getClientSession } from "@/lib/clientAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { formatPHDateTime } from "@/lib/timeFormat";
import { cn } from "@/lib/utils";
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, PageTransition } from "@/components/ui/motion";
import {
  isAdminRole,
  isSystemAdminRole,
  hasAdminPrivileges,
  getRoleLabel,
  getDefaultDashboardPath,
} from "@/lib/roleUtils";
import { getRoleBranding } from "@/lib/roleBranding";
import { ZOOM_PERCENTAGES } from "@/hooks/useLayoutZoom";
import { renderToStaticMarkup } from "react-dom/server";

function AccountPageContent() {
  const router = useRouter();

  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const roleBranding = getRoleBranding(authUser);
  const brandAccent = "#0070e2";
  const brandForeground = roleBranding.foreground || "#FFFFFF";

  useEffect(() => {
    if (typeof window !== "undefined" && brandAccent) {
      document.documentElement.style.setProperty("--brand-accent", brandAccent);
      document.documentElement.style.setProperty("--brand-foreground", brandForeground);
    }
  }, [brandAccent, brandForeground]);

  // Avatar State
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
    const fileInputRef = useRef(null);

  // Profile Form State
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [mname, setMname] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [clientType, setClientType] = useState("Student");
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
  const [hasTotpSecret, setHasTotpSecret] = useState(false);
  const [totpSetupData, setTotpSetupData] = useState(null);
  const [totpToken, setTotpToken] = useState("");
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSetupLoading, setTotpSetupLoading] = useState(false);
  const [recoveryCodesLoading, setRecoveryCodesLoading] = useState(false);
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

  useEffect(() => {
    (async () => {
      try {
        const [resAuth, resUserSecurity] = await Promise.all([
          getClientSession(),
          fetch("/api/staff/security")
        ]);

        if (!resAuth.ok || !resAuth.data) {
          if (resAuth.status === 401) {
            router.push("/login");
          }
          return;
        }
        const user = resAuth.data;
        setAuthUser(user);
        if (user.avatar_filename) {
          setAvatarUrl(`/api/account/avatar?id=${user.id}&t=${Date.now()}`);
        } else {
          setAvatarUrl(null);
        }
        setFname(user.fname || "");
        setLname(user.lname || "");
        setMname(user.mname || "");
        setUsername(user.email || user.username || "");
        setStudentNo(user.student_no || "");
        setClientType(user.client_type || (user.course_code === "ALUMNI" || (user.student_no && user.student_no.startsWith("ALUM-")) ? "Alumni" : "Student"));
        setUserPreferences(user.preferences || {});


        // If admin or superadmin, fetch global system settings
        if (hasAdminPrivileges(user.role)) {
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
          setHasTotpSecret(jsonTOTP.data.hasSecret);
          setRecoveryCodesCount(jsonTOTP.data.recoveryCodesCount || 0);
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);


  useEffect(() => {
    setAvatarLoaded(false);
  }, [avatarUrl]);

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

  const activeZoomNode = typeof userPreferences?.zoom_node === "number"
    ? userPreferences.zoom_node
    : (typeof window !== "undefined" && (localStorage.getItem(`pup_zoom_node_${authUser?.id}`) || localStorage.getItem("pup_zoom_node")) !== null
        ? parseInt(localStorage.getItem(`pup_zoom_node_${authUser?.id}`) || localStorage.getItem("pup_zoom_node"), 10)
        : 3);

  const handleZoomPreferenceChange = async (node) => {
    const oldPrefs = { ...userPreferences };
    setUserPreferences((prev) => ({ ...prev, zoom_node: node }));
    if (typeof window !== "undefined") {
      if (authUser?.id) {
        localStorage.setItem(`pup_zoom_node_${authUser.id}`, String(node));
      }
      localStorage.setItem("pup_zoom_node", String(node));
      window.dispatchEvent(new Event("storage"));
    }

    try {
      const res = await fetch("/api/auth/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { zoom_node: node } }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      toast.success("Zoom Preference Saved", {
        description: `Default layout scale set to ${ZOOM_PERCENTAGES[node] ?? 100}%.`
      });
    } catch (error) {
      setUserPreferences(oldPrefs);
      toast.error("Save Failed", {
        description: error.message || "Could not update zoom preference."
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
    window.location.href = "/login";
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

    if (!(fname || "").trim() || !(lname || "").trim()) {
      setProfileError("Please fill all required fields.");
      return;
    }

    setProfileError("");
    setProfileLoading(true);

    try {
      const payload = authUser?.role === "Student"
        ? {
            fname: (fname || "").trim(),
            lname: (lname || "").trim(),
            mname: (mname || "").trim(),
            student_no: (studentNo || "").trim(),
            client_type: clientType,
          }
        : {
            fname: (fname || "").trim(),
            lname: (lname || "").trim(),
            email: (username || "").trim(),
          };

      const res = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update profile");
      }

      toast.success("Profile Updated", {
        description: "Your changes have been saved successfully.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
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
    if (pwNext.length < 8) {
      setPwError("New password must be at least 8 characters long.");
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

    const requiredQuestions = globalQuestions.filter((q) => q.is_required);
    for (const q of requiredQuestions) {
      const hasExisting = q.hasAnswer;
      const hasNewInput = !!(secAnswers[q.id] && secAnswers[q.id].trim());
      if (!hasExisting && !hasNewInput) {
        setSecError(`Please provide an answer for the required question: "${q.question}"`);
        return;
      }
    }

    if (payload.length === 0) {
      setSecError("Please provide at least one answer to save.");
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

  const refreshTOTPStatus = async () => {
    try {
      const res = await fetch("/api/auth/totp");
      const json = await res.json();
      if (json?.ok && json.data) {
        setTotpEnabled(json.data.enabled);
        setHasTotpSecret(json.data.hasSecret);
        setRecoveryCodesCount(json.data.recoveryCodesCount || 0);
      }
    } catch (err) {
      console.error("Failed to refresh TOTP status:", err);
    }
  };

  const startTOTPSetup = async () => {
    setTotpSetupLoading(true);
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
      setTotpSetupLoading(false);
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
      setHasTotpSecret(true);
      setTotpStep("idle");
      setTotpSetupData(null);
      setTotpToken("");
      toast.success("Two-Factor Auth Enabled", {
        description: "Your account is now extra secure.",
      });
      await refreshTOTPStatus();
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
      setHasTotpSecret(false);
      setTotpToken("");
      toast.success("Two-Factor Auth Disabled", {
        description: "Your account is now using standard security.",
      });
      await refreshTOTPStatus();
    } catch (err) {
      setTotpError(err?.message || "Invalid code");
      toast.error("Disable Failed", {
        description: err?.message || "Unable to turn off two-factor auth.",
      });
    } finally {
      setTotpLoading(false);
    }
  };
  const cancelTOTPSetup = async () => {
    setTotpSetupLoading(true);
    try {
      await fetch("/api/auth/totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel-setup" }),
      });
    } catch (err) {
      console.error("Failed to cancel TOTP setup on server:", err);
    } finally {
      setTotpStep("idle");
      setTotpSetupData(null);
      setTotpToken("");
      setTotpError("");
      setTotpSetupLoading(false);
    }
  };

  const generateNewRecoveryCodes = async () => {
    setRecoveryCodesLoading(true);
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
      await refreshTOTPStatus();
      toast.success("Codes Generated", {
        description: "Please save these codes somewhere safe.",
      });
    } catch (err) {
      toast.error("Generation Failed", {
        description: err?.message || "Unable to generate recovery codes.",
      });
    } finally {
      setRecoveryCodesLoading(false);
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
      <div className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-background font-jakarta">
        <Header authUser={authUser} onLogout={handleLogout} />
        <main className="flex-1 min-h-0 overflow-y-auto w-full">
          <div className="w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto py-6 px-4 sm:px-8">
            <Card className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none min-h-[600px]">
              <div className="p-6 border-b border-border dark:border-border flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="w-48 h-6" />
                  <Skeleton className="w-72 h-4" />
                </div>
                <Skeleton className="w-28 h-10 rounded-xl" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] flex-1">
                <div className="p-6 border-b lg:border-b-0 lg:border-r border-border dark:border-border space-y-6 bg-gray-50/40 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="w-28 h-4" />
                      <Skeleton className="w-20 h-3" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="w-full h-10 rounded-xl" />
                    <Skeleton className="w-full h-10 rounded-xl" />
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <Skeleton className="w-40 h-6" />
                  <Skeleton className="w-full h-32 rounded-xl" />
                  <Skeleton className="w-full h-32 rounded-xl" />
                </div>
              </div>
            </Card>
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
    <div 
      className="h-screen overflow-hidden flex flex-col bg-gray-50 dark:bg-background font-jakarta selection:bg-gray-900 selection:text-white"
      style={{
        "--brand-accent": brandAccent,
        "--brand-foreground": brandForeground,
      }}
    >
      <Header authUser={authUser} onLogout={handleLogout} />

      <PageTransition className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1760px] mx-auto py-6 px-4 sm:px-8">
          {/* ONE Single Card Container encapsulating Header, Sidebar & Tab Content */}
          <Card className="flex h-auto w-full flex-col p-0 gap-0 overflow-visible rounded-2xl border border-border bg-white shadow-sm dark:border-border dark:bg-card dark:shadow-none isolate font-jakarta mb-4 min-h-0 flex-1">
            <PageHeader
              icon="ph-user-gear"
              title="Account Settings"
              description="Update your personal info and security settings."
              showBorder={false}
              className="p-6 border-b border-border dark:border-border"
              titleClassName="text-2xl font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50"
              descriptionClassName="text-lg font-normal text-gray-500 dark:text-zinc-400 mt-[4px]"
              actions={
                <Button
                  variant="outline"
                  onClick={() => {
                    const path = getDefaultDashboardPath(authUser?.role);
                    router.push(path);
                  }}
                  className="h-10 px-5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Dashboard
                </Button>
              }
            />

            <Tabs
              defaultValue="profile"
              value={activeTab}
              onValueChange={setActiveTab}
              className="grid grid-cols-1 lg:grid-cols-[280px_1fr] flex-1 items-stretch min-h-[600px]"
            >
              {/* Sidebar Navigation */}
              <aside className="border-b lg:border-b-0 lg:border-r border-border dark:border-border p-6 flex flex-col bg-gray-50/40 dark:bg-white/[0.02]">
                <div className="flex flex-col h-full w-full">
                  {/* Header Section */}
                  <div className="flex flex-col items-center justify-center w-full mb-8 mt-4">
                    {/* Avatar: 80px, circular */}
                    <div className="flex flex-col items-center shrink-0">
                      <div 
                                                className="relative w-20 h-20 shrink-0 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center justify-center text-2xl font-medium shadow-inner overflow-hidden mb-3"
                      >
                        {avatarUrl ? (
                          <>
                            <img 
                              src={avatarUrl} 
                              alt="" 
                              className={`w-full h-full object-cover ${avatarLoaded ? "block" : "hidden"}`}
                              onLoad={() => setAvatarLoaded(true)}
                              onError={() => setAvatarUrl(null)}
                            />
                            {!avatarLoaded && (
                              <div className="flex h-full w-full items-center justify-center bg-gray-200 dark:bg-zinc-800 animate-pulse">
                                <HugeIcon  className="ph-bold ph-user text-[24px] text-gray-400 dark:text-zinc-500" />
                              </div>
                            )}
                          </>
                        ) : (
                          <span>{initials}</span>
                        )}
                                              </div>
                                            {avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="mt-1 text-[13px] font-medium text-red-500 hover:text-red-700 cursor-pointer bg-transparent border-none p-0 focus:outline-none"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    {/* Identity Info */}
                    <div className="flex flex-col items-center justify-center text-center mt-1">
                      <h3 className="text-xl font-semibold text-gray-900 tracking-tight dark:text-zinc-50 leading-tight">
                        {fname} {lname}
                      </h3>
                      <p className="text-lg font-normal text-gray-500 dark:text-zinc-400 mt-0.5 truncate max-w-[240px]">
                        {authUser?.role === "Student" && studentNo ? (
                          <span className="font-mono text-sm text-gray-700 dark:text-zinc-300 font-medium">{studentNo}</span>
                        ) : (
                          authUser?.email || authUser?.username
                        )}
                      </p>
                      {authUser?.role && (
                        <div className="mt-2.5">
                          <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {authUser.role === "Student" ? (clientType || "Student") : getRoleLabel(authUser.role)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Menu */}
                  <TabsList className="w-full flex flex-col h-auto bg-transparent p-0 gap-1.5">
                    {[
                      { id: "profile", label: "Profile", icon: "ph-user-circle" },
                      { id: "security", label: "Security", icon: "ph-shield-star" },
                      { id: "preferences", label: "Preferences", icon: "ph-gear-six" }
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="group flex items-center justify-start gap-3 w-full px-3.5 py-2.5 rounded-xl text-[14px] font-semibold tracking-[-0.01em] whitespace-nowrap transition-all outline-none cursor-pointer data-[state=active]:bg-gray-200/60 dark:data-[state=active]:bg-white/10 data-[state=active]:text-gray-900 dark:data-[state=active]:text-zinc-50 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-gray-100/60 dark:hover:bg-zinc-800/40 border border-transparent"
                      >
                        <HugeIcon  className={cn(
                          "ph-bold text-lg shrink-0 transition-colors",
                          "text-gray-400 group-data-[state=active]:text-gray-900 dark:text-zinc-500 dark:group-data-[state=active]:text-white",
                          tab.icon
                        )}></HugeIcon>
                        <span className="truncate text-left">{tab.label}</span>
                        <div className="shrink-0 ml-auto w-4 h-4 flex items-center justify-center opacity-0 group-data-[state=active]:opacity-100 transition-opacity">
                          <HugeIcon  className="ph-bold ph-caret-right text-sm text-gray-400 dark:text-zinc-400"></HugeIcon>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </aside>

              {/* Content Area */}
              <div className="min-w-0 flex-1">
                <TabsContent value="profile" className="m-0 border-0 focus-visible:ring-0">
                  <div className="p-8">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                        Profile
                      </h3>
                      <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                        Your name appears across the platform and generated audit certificates.
                      </p>
                    </div>

                    <div className="mt-6">
                  <form onSubmit={submitProfile} className="space-y-6">
                    {profileError && (
                      <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-lg flex items-center gap-3 animate-in shake-1 dark:bg-red-500/10 dark:border-red-500/20">
                        <HugeIcon  className="ph-fill ph-warning-circle text-lg"></HugeIcon>
                        {profileError}
                      </div>
                    )}

                    {authUser?.role === "Student" ? (
                      <>
                        <div className="merged-container bg-white dark:bg-zinc-800">
                          <div className="flex flex-col md:flex-row w-full border-b border-border dark:border-border/50 md:divide-x divide-y md:divide-y-0 divide-border dark:divide-border/50">
                            <div className="flex-1 min-w-0">
                              <div className={`field-wrapper ${fname ? "active" : ""}`}>
                                <label>First Name</label>
                                <Input
                                  type="text"
                                  placeholder=" "
                                  className="focus-visible:ring-0 focus-visible:ring-offset-0"
                                  value={fname}
                                  onChange={(e) => setFname(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`field-wrapper ${mname ? "active" : ""}`}>
                                <label>Middle Name (Optional)</label>
                                <Input
                                  type="text"
                                  placeholder=" "
                                  className="focus-visible:ring-0 focus-visible:ring-offset-0"
                                  value={mname}
                                  onChange={(e) => setMname(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`field-wrapper ${lname ? "active" : ""}`}>
                                <label>Last Name</label>
                                <Input
                                  type="text"
                                  placeholder=" "
                                  className="focus-visible:ring-0 focus-visible:ring-offset-0"
                                  value={lname}
                                  onChange={(e) => setLname(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className={`field-wrapper active`}>
                            <label>Email Address</label>
                            <Input
                              type="email"
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-400 cursor-not-allowed select-none bg-gray-50/50 dark:bg-white/5"
                              value={username}
                              readOnly
                            />
                          </div>
                        </div>
                        <p className="text-[13px] text-gray-400 font-normal mt-1.5 ml-1 dark:text-zinc-500">
                          Your email is your account identifier and cannot be changed.
                        </p>

                        <div className="pt-4 border-t border-border dark:border-border space-y-4">
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                              Academic Information
                            </h4>
                            <p className="text-[14px] text-gray-500 dark:text-zinc-400 mt-0.5">
                              Manage your affiliation and student credentials for registrar records.
                            </p>
                          </div>

                          <div className="merged-container bg-white dark:bg-zinc-800 mt-2">
                            <div className="flex flex-col md:flex-row w-full divide-y md:divide-y-0 md:divide-x divide-border dark:divide-border/50">
                              <div className="flex-1 min-w-0">
                                <div className="field-wrapper select-wrapper active h-full">
                                  <label className="text-gray-400 dark:text-zinc-500">Client Type</label>
                                  <Select
                                    value={clientType}
                                    onChange={(e) => setClientType(e.target.value)}
                                    className="border-none shadow-none bg-transparent hover:bg-transparent focus:ring-0 dark:border-none dark:bg-transparent dark:hover:bg-transparent h-[52px] pt-[16px] px-[14px] text-[15px] font-normal w-full"
                                  >
                                    <option value="Student">Student (Currently Enrolled)</option>
                                    <option value="Alumni">Alumni (Graduate / Former Student)</option>
                                  </Select>
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className={`field-wrapper ${studentNo ? "active" : ""}`}>
                                  <label>Student Number (Optional)</label>
                                  <Input
                                    type="text"
                                    placeholder=" "
                                    className="focus-visible:ring-0 focus-visible:ring-offset-0 font-mono"
                                    value={studentNo}
                                    onChange={(e) => setStudentNo(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="text-[13px] text-gray-400 font-normal mt-1.5 ml-1 dark:text-zinc-500">
                            Optional in your profile. Choose whether you are currently enrolled or requesting as an alumnus.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="merged-container bg-white dark:bg-zinc-800">
                          <div className="flex flex-col md:flex-row w-full border-b border-border dark:border-border/50 md:divide-x divide-y md:divide-y-0 divide-border dark:divide-border/50">
                            <div className="flex-1 min-w-0">
                              <div className={`field-wrapper ${fname ? "active" : ""}`}>
                                <label>First Name</label>
                                <Input
                                  type="text"
                                  placeholder=" "
                                  className="focus-visible:ring-0 focus-visible:ring-offset-0"
                                  value={fname}
                                  onChange={(e) => setFname(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`field-wrapper ${lname ? "active" : ""}`}>
                                <label>Last Name</label>
                                <Input
                                  type="text"
                                  placeholder=" "
                                  className="focus-visible:ring-0 focus-visible:ring-offset-0"
                                  value={lname}
                                  onChange={(e) => setLname(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                          <div className={`field-wrapper active`}>
                            <label>Email Address</label>
                            <Input
                              type="email"
                              placeholder=" "
                              className="focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-400 cursor-not-allowed select-none bg-gray-50/50 dark:bg-white/5"
                              value={username}
                              readOnly
                            />
                          </div>
                        </div>
                        <p className="text-[13px] text-gray-400 font-normal mt-1.5 ml-1 dark:text-zinc-500">
                          Your email is managed by administrators and cannot be changed.
                        </p>
                      </>
                    )}

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        disabled={profileLoading}
                        className="h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {profileLoading && (
                          <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                        )}
                        {profileLoading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="m-0 border-0 focus-visible:ring-0">
              <div className="p-8 space-y-8 divide-y divide-border dark:divide-border">
                {/* Password Rotation Section */}
                <div>
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Password
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Keep your account secure with a strong password.
                      {authUser?.password_last_changed && (
                        <span className="block text-[13px] font-normal text-gray-400 dark:text-zinc-550 mt-1">
                          Last changed {new Date(authUser.password_last_changed).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-6">
                    <form onSubmit={submitPassword} className="space-y-6">
                      {pwError && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-lg flex items-center gap-3 animate-in shake-1 dark:bg-red-500/10 dark:border-red-500/20">
                          <HugeIcon  className="ph-fill ph-warning-circle text-lg"></HugeIcon>
                          {pwError}
                        </div>
                      )}

                      <div className="merged-container bg-white dark:bg-zinc-800">
                        <div className={`field-wrapper border-b border-border dark:border-border/50 ${pwCurrent ? "active" : ""}`}>
                          <label>Current Password</label>
                          <Input
                            type={showPw.current ? "text" : "password"}
                            placeholder=" "
                            className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0 tracking-widest"
                            value={pwCurrent}
                            onChange={(e) => setPwCurrent(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(prev => ({ ...prev, current: !prev.current }))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors dark:text-zinc-500 z-10"
                          >
                            <HugeIcon  className={cn("ph-bold", showPw.current ? "ph-eye-slash" : "ph-eye")}></HugeIcon>
                          </button>
                        </div>

                        <div className="flex flex-col md:flex-row w-full divide-y md:divide-y-0 md:divide-x divide-border dark:divide-border/50">
                          <div className="flex-1 min-w-0">
                            <div className={`field-wrapper ${pwNext ? "active" : ""}`}>
                              <label>New Password</label>
                              <Input
                                type={showPw.next ? "text" : "password"}
                                placeholder=" "
                                className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0 tracking-widest"
                                value={pwNext}
                                onChange={(e) => setPwNext(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPw(prev => ({ ...prev, next: !prev.next }))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors dark:text-zinc-500 z-10"
                              >
                                <HugeIcon  className={cn("ph-bold", showPw.next ? "ph-eye-slash" : "ph-eye")}></HugeIcon>
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className={`field-wrapper ${pwConfirm ? "active" : ""}`}>
                              <label>Confirm Password</label>
                              <Input
                                type={showPw.confirm ? "text" : "password"}
                                placeholder=" "
                                className="pr-11 focus-visible:ring-0 focus-visible:ring-offset-0 tracking-widest"
                                value={pwConfirm}
                                onChange={(e) => setPwConfirm(e.target.value)}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPw(prev => ({ ...prev, confirm: !prev.confirm }))}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors dark:text-zinc-500 z-10"
                              >
                                <HugeIcon  className={cn("ph-bold", showPw.confirm ? "ph-eye-slash" : "ph-eye")}></HugeIcon>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 px-1 dark:text-zinc-500 mt-1">
                        Must be at least 8 characters long.
                      </p>

                      <div className="flex justify-end pt-4">
                        <Button
                          type="submit"
                          disabled={pwLoading}
                          className="h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {pwLoading && (
                            <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                          )}
                          {pwLoading ? "Updating..." : "Update"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Security Questions Section */}
                <div className="pt-8">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Security Questions
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Set up questions to help recover your account.
                      {hasSetSecurity && (
                        <span className="block text-[13px] font-normal text-emerald-600 dark:text-emerald-400 mt-1">
                          Recovery questions are active.
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="mt-6">
                    <form onSubmit={submitSecurity} className="space-y-6">
                      {secError && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold rounded-lg flex items-center gap-3 animate-in shake-1 dark:bg-red-500/10 dark:border-red-500/20">
                          <HugeIcon  className="ph-fill ph-warning-circle text-lg"></HugeIcon>
                          {secError}
                        </div>
                      )}

                      <div className="space-y-6">
                        {globalQuestions.length === 0 ? (
                          <div className="p-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-border text-gray-400 font-medium text-sm dark:bg-card dark:border-border dark:text-zinc-500">
                            <HugeIcon  className="ph-duotone ph-mask-sad text-xl mb-3 block opacity-40"></HugeIcon>
                            No recovery questions configured.
                          </div>
                        ) : (
                          globalQuestions.map((q) => {
                            const isEditing = !!editingSecQuestions[q.id];
                            const showInput = !q.hasAnswer || isEditing;

                            return (
                              <div key={q.id} className="space-y-1">
                                <div className="flex items-center justify-between mb-1 px-1">
                                  <label className="text-[13px] font-medium uppercase tracking-[0.04em] text-gray-500 dark:text-zinc-450 flex items-center gap-1">
                                    <span>{q.question}</span>
                                    {q.is_required ? (
                                      <span className="text-red-500 font-bold text-sm" title="Required challenge">*</span>
                                    ) : (
                                      <span className="text-sm lowercase text-gray-400 dark:text-zinc-500 tracking-normal font-normal">(optional)</span>
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
                                      className="text-[14px] font-medium text-gray-900 dark:text-red-400 hover:text-black dark:hover:text-red-300 transition-colors cursor-pointer"
                                    >
                                      {isEditing ? "Cancel" : "Edit"}
                                    </button>
                                  )}
                                </div>

                                <div className="relative">
                                  {showInput ? (
                                    <Input
                                      type="text"
                                      className="h-10 rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 px-3.5 text-sm font-normal text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-none focus-visible:outline-none focus-visible:border-gray-900 focus-visible:ring-1 focus-visible:ring-gray-900 dark:focus-visible:border-red-500/80 dark:focus-visible:ring-red-500/80 transition-all animate-in fade-in slide-in-from-top-1 duration-normal"
                                      placeholder="••••••••"
                                      value={secAnswers[q.id] || ""}
                                      onChange={(e) => setSecAnswers({ ...secAnswers, [q.id]: e.target.value })}
                                      autoFocus={isEditing}
                                    />
                                  ) : (
                                    <div className="h-10 flex items-center px-3.5 bg-gray-50/70 border border-border dark:border-border rounded-xl text-sm font-normal text-gray-400 select-none dark:bg-white/5 dark:text-zinc-500">
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
                          className="h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {secLoading && (
                            <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                          )}
                          {secLoading ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Two-Factor Authentication Section */}
                <div className="pt-8">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Two-Factor Authentication
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Add an extra layer of security to your account with time-based OTP and backup recovery codes.
                    </p>
                  </div>

                  <div className="mt-6">
                    {totpStep === "setup" && totpSetupData ? (
                      <div className="space-y-6 animate-in zoom-in-95 duration-slow">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8 bg-gray-50 rounded-2xl border border-border p-8 items-center dark:bg-card dark:border-border">
                          <div className="space-y-4">
                            <h4 className="text-lg font-semibold text-gray-900 tracking-tight dark:text-zinc-50">Setup</h4>
                            <p className="text-sm font-medium text-gray-600 dark:text-zinc-300">
                              Scan the QR code using your authenticator app (like Google Authenticator or Authy) to link your account.
                            </p>
                            
                            <div className="space-y-2 mt-4">
                               <div className="bg-white px-4 py-3 rounded-xl border border-border flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-border">
                                  <span className="text-[9px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">Secret key</span>
                                  <span className="text-sm font-semibold text-gray-900 dark:text-primary tracking-wider break-all font-jakarta">{totpSetupData.secret}</span>
                                </div>
                               <div className="bg-white px-4 py-3 rounded-xl border border-border flex flex-col gap-1.5 shadow-xs dark:bg-card dark:border-border">
                                  <span className="text-[9px] font-semibold text-gray-400 tracking-widest dark:text-zinc-500">Serial key (Backup)</span>
                                  <span className="text-sm font-semibold text-gray-900 tracking-wider break-all dark:text-zinc-50 font-jakarta">{totpSetupData.serialKey}</span>
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
                          <label className="text-sm font-semibold tracking-widest text-gray-500 px-1 dark:text-zinc-400">
                            Enter Verification Code
                          </label>
                          <Input
                            type="text"
                            maxLength={6}
                            className="h-16 rounded-xl border border-border bg-white text-center text-xl font-semibold text-gray-900 shadow-inner transition-all focus-visible:border-gray-900/20 focus-visible:ring-4 focus-visible:ring-gray-900/5 dark:border-border dark:bg-card dark:text-zinc-50 dark:shadow-none"
                            placeholder="000000"
                            value={totpToken}
                            onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            autoFocus
                          />
                        </div>

                        {totpError && (
                          <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-semibold rounded-xl flex items-center gap-4 animate-in shake-1 dark:data-[state=active]:bg-red-500/10">
                            <HugeIcon  className="ph-fill ph-warning-circle text-xl"></HugeIcon>
                            {totpError}
                          </div>
                        )}

                        <div className="pt-8 border-t border-border flex justify-end gap-2.5 dark:border-border">
                          <Button
                            type="button"
                            onClick={cancelTOTPSetup}
                            disabled={totpLoading}
                            variant="outline"
                            className="h-10 px-5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={verifyTOTP}
                            disabled={totpLoading || totpToken.length !== 6}
                            className="h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {totpLoading && (
                              <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                            )}
                            Activate
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-border dark:divide-border animate-in fade-in duration-slow">
                        {/* Authenticator App Method */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 py-6">
                          <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-zinc-500 shrink-0">
                              <HugeIcon  className="ph-bold ph-device-mobile text-[16px]"></HugeIcon>
                            </div>
                            <div>
                              <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 flex items-center gap-2 leading-tight">
                                Authenticator App
                                {totpEnabled && hasTotpSecret ? (
                                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Active</span>
                                ) : (
                                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">Inactive</span>
                                )}
                              </h4>
                              <p className="text-[14px] font-normal text-gray-500 mt-1 max-w-md dark:text-zinc-400">
                                Secure your account with temporary, rotating 6-digit codes generated from an authenticator app (like Google Authenticator or Authy).
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 w-full md:w-auto flex justify-end">
                             {totpEnabled && hasTotpSecret ? (
                               <Button
                                 type="button"
                                 onClick={() => setTotpStep("disable-flow")}
                                 variant="outline"
                                 className="h-10 px-5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                               >
                                 Disable
                               </Button>
                             ) : (
                               <Button
                                 type="button"
                                 onClick={startTOTPSetup}
                                 disabled={totpSetupLoading}
                                 className="h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                               >
                                 {totpSetupLoading && (
                                   <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                                 )}
                                 Configure
                               </Button>
                             )}
                           </div>
                        </div>

                        {/* TOTP Disable Form Flow */}
                        {totpStep === "disable-flow" && (
                          <div className="bg-gray-50 rounded-2xl border border-border p-8 space-y-6 animate-in zoom-in-95 duration-normal dark:bg-white/5 dark:border-border">
                             <div className="space-y-2">
                                <label className="text-sm font-semibold tracking-widest text-gray-500 px-1 dark:text-zinc-400">
                                  Enter Authenticator Code to Disable
                                </label>
                                <Input
                                  type="text"
                                  maxLength={6}
                                  className="h-16 rounded-xl border border-border bg-white text-center text-xl font-semibold text-gray-900 shadow-inner transition-all focus-visible:border-red-500/20 focus-visible:ring-4 focus-visible:ring-red-500/5 dark:border-border dark:bg-card dark:text-zinc-50 dark:shadow-none"
                                  placeholder="000000"
                                  value={totpToken}
                                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                  autoFocus
                                />
                             </div>

                             {totpError && (
                               <div className="p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-semibold rounded-xl flex items-center gap-4 animate-in shake-1 dark:bg-red-500/10">
                                 <HugeIcon  className="ph-fill ph-warning-circle text-xl"></HugeIcon>
                                 {totpError}
                               </div>
                             )}

                             <div className="flex justify-end gap-2.5">
                                <Button
                                  type="button"
                                  onClick={() => { setTotpStep("idle"); setTotpToken(""); setTotpError(""); }}
                                  variant="outline"
                                  className="h-10 px-5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  onClick={async () => {
                                    await disableTOTP();
                                    setTotpStep("idle");
                                  }}
                                  disabled={totpLoading || totpToken.length !== 6}
                                  className="h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                  {totpLoading && (
                                    <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                                  )}
                                  Disable
                                </Button>
                             </div>
                          </div>
                        )}

                        {/* Recovery Codes Method */}
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 py-6">
                          <div className="flex gap-3 items-start">
                            <div className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-zinc-500 shrink-0">
                              <HugeIcon  className="ph-bold ph-shield-check text-[16px]"></HugeIcon>
                            </div>
                            <div>
                              <h4 className="text-[14px] font-semibold tracking-[-0.01em] text-gray-900 dark:text-zinc-50 flex items-center gap-2 leading-tight">
                                Backup Recovery Codes
                                {recoveryCodesCount > 0 ? (
                                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Active ({recoveryCodesCount} left)</span>
                                ) : (
                                  <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400">Inactive</span>
                                )}
                              </h4>
                              <p className="text-[14px] font-normal text-gray-500 mt-1 max-w-md dark:text-zinc-400">
                                Generate a list of single-use backup recovery codes. These allow secure access to your account in emergency events.
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 w-full md:w-auto flex justify-end gap-2.5">
                            {recoveryCodesCount > 0 && (
                              <Button
                                type="button"
                                onClick={async () => {
                                  setRecoveryCodesLoading(true);
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
                                      await refreshTOTPStatus();
                                    } else {
                                      throw new Error(json.error);
                                    }
                                  } catch (err) {
                                    toast.error("Action Failed", {
                                      description: "Failed to disable recovery codes: " + err.message
                                    });
                                  } finally {
                                    setRecoveryCodesLoading(false);
                                  }
                                }}
                                disabled={recoveryCodesLoading}
                                variant="outline"
                                className="h-10 px-5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                              >
                                Disable
                              </Button>
                            )}
                            <Button
                              type="button"
                              onClick={generateNewRecoveryCodes}
                              disabled={recoveryCodesLoading}
                              className="h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {recoveryCodesLoading && (
                                <HugeIcon className="ph-bold ph-spinner animate-spin text-sm" />
                              )}
                              {recoveryCodesCount > 0 ? "Regenerate" : "Generate"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="m-0 border-0 focus-visible:ring-0">
              <div className="p-8 space-y-8 divide-y divide-border dark:divide-border">
                {/* Interface Layout Zoom Section */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                        Interface Layout Zoom
                      </h3>
                      <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                        Choose your default viewport scaling level. Your preferred zoom persists across all dashboard sessions.
                      </p>
                    </div>
                    <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border border-border shrink-0">
                      Active: {ZOOM_PERCENTAGES[activeZoomNode] ?? 100}%
                    </span>
                  </div>

                  <div className="mt-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {ZOOM_PERCENTAGES.map((pct, idx) => {
                        const isSelected = activeZoomNode === idx;
                        const label = idx === 0 ? "Compact (75%)" : idx === 3 ? "Default (100%)" : idx === 6 ? "Large (125%)" : `${pct}%`;
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleZoomPreferenceChange(idx)}
                            className={cn(
                              "flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer select-none",
                              isSelected
                                ? "border-pup-maroon bg-pup-maroon/5 text-pup-maroon font-semibold shadow-xs dark:border-red-500 dark:bg-red-500/10 dark:text-red-400 ring-1 ring-pup-maroon/20 dark:ring-red-500/20"
                                : "border-border bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60 hover:border-gray-300 dark:hover:border-white/10"
                            )}
                          >
                            <span className="text-base font-bold tracking-tight">{pct}%</span>
                            <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-1">
                              {idx === 0 ? "Compact" : idx === 3 ? "Default" : idx === 6 ? "Large" : `Node ${idx}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[12px] text-gray-400 font-normal mt-3 ml-1 dark:text-zinc-500 flex items-center gap-1.5">
                      <HugeIcon className="ph-bold ph-info text-sm" />
                      <span>You can also dynamically adjust this scale at any time from the zoom slider in the sidebar.</span>
                    </p>
                  </div>
                </div>

                {/* Navigation Layout Section */}
                <div className="pt-8">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Navigation Bar Layout
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Choose how main navigation is presented across the system.
                    </p>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleUserPreferenceToggle("navigation_layout", "sidebar")}
                      className={cn(
                        "flex items-start gap-4 p-5 rounded-2xl border text-left transition-all cursor-pointer",
                        (userPreferences?.navigation_layout || "sidebar") === "sidebar"
                          ? "border-pup-maroon bg-pup-maroon/5 text-gray-900 dark:text-zinc-100 shadow-xs ring-1 ring-pup-maroon/20 dark:border-red-500 dark:bg-red-500/10"
                          : "border-border bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-sidebar text-2xl text-pup-maroon dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-100">Sidebar (Default)</h4>
                        <p className="text-[12px] text-gray-500 dark:text-zinc-400 mt-1">
                          Vertical navigation pinned to the side of the screen with quick collapse.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUserPreferenceToggle("navigation_layout", "topbar")}
                      className={cn(
                        "flex items-start gap-4 p-5 rounded-2xl border text-left transition-all cursor-pointer",
                        userPreferences?.navigation_layout === "topbar"
                          ? "border-pup-maroon bg-pup-maroon/5 text-gray-900 dark:text-zinc-100 shadow-xs ring-1 ring-pup-maroon/20 dark:border-red-500 dark:bg-red-500/10"
                          : "border-border bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      <HugeIcon className="ph-bold ph-browsers text-2xl text-pup-maroon dark:text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[14px] font-semibold text-gray-900 dark:text-zinc-100">Top Horizontal Bar</h4>
                        <p className="text-[12px] text-gray-500 dark:text-zinc-400 mt-1">
                          Compact horizontal header tabs maximizing horizontal screen width.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Accessibility Section */}
                <div className="pt-8">
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                      Accessibility
                    </h3>
                    <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                      Display settings to improve text visibility and readability.
                    </p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="p-5 bg-gray-50 rounded-2xl border border-border dark:bg-white/5 dark:border-border flex items-center justify-between gap-6">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">High Contrast Mode</h4>
                        <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md">
                          Enhances border boundaries, text contrast, and focused outlines across data tables and panels.
                        </p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center shrink-0">
                        <input 
                          type="checkbox" 
                          className="sr-only peer"
                          checked={!!userPreferences.high_contrast}
                          onChange={(e) => handleAccessibilityToggle("high_contrast", e.target.checked)}
                        />
                        <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-pup-maroon peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-zinc-700"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Workflow Preferences (Admin-only) */}
                {hasAdminPrivileges(authUser?.role) && (
                  <div className="pt-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900 transition-colors dark:text-zinc-50">
                          Workflow Preferences
                        </h3>
                        <p className="mt-1 text-[14px] font-normal text-gray-500 transition-colors dark:text-zinc-400">
                          Personal administrative workflow shortcuts.
                        </p>
                      </div>
                      <Badge variant="outline" className="h-5 px-2 bg-red-50 border-red-200 text-red-600 font-semibold text-[9px] uppercase dark:bg-red-950/30 dark:border-red-900/30 dark:text-red-400">
                        Personal
                      </Badge>
                    </div>

                    <div className="mt-6">
                      <div className="p-5 bg-gray-50 rounded-2xl border border-border dark:bg-white/5 dark:border-border flex items-center justify-between gap-6">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-50">Skip Registration Confirmation</h4>
                          <p className="text-[12px] font-normal text-gray-500 dark:text-zinc-400 leading-relaxed max-w-md">
                            When enabled, the final review modal is bypassed for faster account provisioning.
                          </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center shrink-0">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={!!userPreferences.skip_registration_confirmation}
                            onChange={(e) => handleUserPreferenceToggle("skip_registration_confirmation", e.target.checked)}
                          />
                          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-pup-maroon peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:border-gray-600 dark:bg-zinc-700"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

        {/* Recovery Codes Modal */}
        <Dialog open={showRecoveryCodesDialog} onOpenChange={setShowRecoveryCodesDialog}>
          <DialogContent hideClose={true} className="max-w-[560px] sm:max-w-[560px] rounded-[20px] border-[#E5E5EA] dark:border-border p-6 overflow-hidden bg-white shadow-2xl dark:bg-card">
            <div className="relative pb-4">
               <DialogClose asChild>
                 <button className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer">
                   <HugeIcon  className="ph-bold ph-x text-sm"></HugeIcon>
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
                  <div key={idx} className="font-jakarta text-[14.5px] font-semibold text-[#1C1C1E] dark:text-zinc-200 flex items-center gap-3 bg-[#F5F5F7] p-3 rounded-[10px] border border-[#E5E5EA] dark:bg-white/5 dark:border-zinc-850">
                    <span className="text-[13px] text-[#636366] dark:text-zinc-400 font-bold bg-[#E5E5EA] dark:bg-zinc-800 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                      {idx + 1}
                    </span>
                    <span className="tracking-widest font-jakarta">{code}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-[12px] dark:bg-amber-500/10 dark:border-amber-500/25">
                 <p className="text-[13.5px] text-[#8A6D3B] dark:text-amber-300 font-medium leading-relaxed">
                    WARNING: These codes are for emergency use only. Each code can be used once. Save them somewhere safe.
                 </p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-2.5">
                  <Button 
                    type="button"
                    onClick={copyRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-10 px-5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Copy
                  </Button>
                  <Button 
                    type="button"
                    onClick={downloadRecoveryCodes}
                    variant="outline" 
                    className="flex-1 h-10 px-5 text-sm font-semibold rounded-xl border border-border dark:border-border bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Save
                  </Button>
                </div>
                <Button 
                  type="button"
                  onClick={() => setShowRecoveryCodesDialog(false)}
                  className="w-full h-12 px-6 text-[15px] font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </PageTransition>
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
