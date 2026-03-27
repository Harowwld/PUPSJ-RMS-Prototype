"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          router.push("/");
          return;
        }
        const user = json.data;
        setAuthUser(user);
        setFname(user.fname || "");
        setLname(user.lname || "");
        setUsername(user.username || "");
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

      toast.success("Profile updated perfectly. Reloading session...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setProfileError(err?.message || "Failed to update profile");
      toast.error(err?.message || "Failed to update profile");
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

      toast.success("Security credentials updated securely!");
      setPwCurrent("");
      setPwNext("");
      setPwConfirm("");
    } catch (err) {
      setPwError(err?.message || "Failed to change password");
      toast.error(err?.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50/50">
        <header className="bg-white border-b border-gray-200 h-16 flex items-center px-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-48 h-6 ml-3" />
        </header>
        <main className="flex-1 p-8 w-full max-w-[1000px] mx-auto space-y-8">
          <Skeleton className="w-64 h-8" />
          <Skeleton className="w-full h-[400px] rounded-brand" />
        </main>
      </div>
    );
  }

  const initials = authUser?.fname && authUser?.lname 
    ? (authUser.fname[0] + authUser.lname[0]).toUpperCase()
    : "AD";

  const isSuperAdmin = authUser?.role === "SuperAdmin";
  const roleBadgeColor = isSuperAdmin 
    ? "bg-amber-100/50 text-amber-800 border-amber-200" 
    : "bg-red-50 text-pup-maroon border-red-100";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 font-inter selection:bg-pup-maroon selection:text-white pb-24">
      <Header authUser={authUser} onLogout={handleLogout} />

      <main className="flex-1 w-full max-w-[760px] mx-auto py-8 px-6">
        
        {/* Sleek Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Account Settings</h1>
            <p className="text-sm text-gray-500 font-medium">Manage your personal profile and security preferences.</p>
          </div>
          
          <button
            onClick={() => {
              const path = authUser?.role === "Administrator" || authUser?.role === "SuperAdmin" ? "/admin" : "/staff";
              router.push(path);
            }}
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-pup-maroon px-4 py-2 rounded-brand font-bold text-sm shadow-sm transition-all active:scale-[0.98] flex items-center gap-2 group shrink-0"
          >
            <i className="ph-bold ph-arrow-left transition-transform group-hover:-translate-x-1"></i> Back to Dashboard
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Profile Card */}
          <section className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 text-pup-maroon flex items-center justify-center text-lg font-bold border border-white shadow-sm shrink-0">
                  {initials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Personal Profile</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium text-gray-500">Currently logged in as</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${roleBadgeColor}`}>
                      {authUser?.role || "Admin"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={submitProfile} className="p-6">
              {profileError && (
                <div className="mb-6 p-4 bg-red-50/80 border border-red-200 text-red-700 text-sm font-semibold rounded-brand flex items-center gap-3">
                  <i className="ph-fill ph-warning-circle text-xl"></i>
                  {profileError}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-brand focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900 shadow-sm"
                    placeholder="Enter your first name"
                    value={fname}
                    onChange={(e) => setFname(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Last Name</label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-brand focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900 shadow-sm"
                    placeholder="Enter your last name"
                    value={lname}
                    onChange={(e) => setLname(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address (Username)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="ph-bold ph-envelope-simple text-gray-400 text-lg"></i>
                  </div>
                  <input
                    type="email"
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-300 rounded-brand focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900 shadow-sm"
                    placeholder="name@pup.edu.ph"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2.5 font-medium ml-1">This email acts as your primary login identifier.</p>
              </div>

              <div className="flex items-center justify-end border-t border-gray-100 pt-6">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="bg-pup-maroon hover:bg-red-900 text-white px-6 py-2.5 rounded-brand font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2"
                >
                  {profileLoading ? <i className="ph-bold ph-spinner animate-spin text-lg"></i> : <i className="ph-bold ph-check text-lg"></i>}
                  {profileLoading ? "Saving Changes..." : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          {/* Security Card */}
          <section className="bg-white rounded-brand border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-gray-50/30">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                <i className="ph-duotone ph-shield-check text-xl"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Security Credentials</h2>
                <p className="text-sm font-medium text-gray-500 mt-0.5">Update your password to stay secure.</p>
              </div>
            </div>

            <form onSubmit={submitPassword} className="p-6">
              {pwError && (
                <div className="mb-6 p-4 bg-red-50/80 border border-red-200 text-red-700 text-sm font-semibold rounded-brand flex items-center gap-3">
                  <i className="ph-fill ph-warning-circle text-xl"></i>
                  {pwError}
                </div>
              )}
              
              <div className="space-y-6 mb-8 max-w-lg">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-brand focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900 shadow-sm"
                    placeholder="••••••••"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-brand focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900 shadow-sm"
                    placeholder="Minimal 6 characters"
                    value={pwNext}
                    onChange={(e) => setPwNext(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-brand focus:ring-2 focus:ring-pup-maroon focus:border-pup-maroon outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900 shadow-sm"
                    placeholder="Repeat new password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden sm:block">
                  Protected <i className="ph-fill ph-lock-key"></i>
                </span>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="bg-pup-maroon hover:bg-red-900 text-white px-6 py-2.5 rounded-brand font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                  {pwLoading ? <i className="ph-bold ph-spinner animate-spin text-lg"></i> : <i className="ph-bold ph-shield text-lg"></i>}
                  {pwLoading ? "Updating Security..." : "Update Password"}
                </button>
              </div>
            </form>
          </section>

        </div>
      </main>
    </div>
  );
}
