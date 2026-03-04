"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const adminUsernames = ["admin", "admin", "registrar", "head_registrar"];

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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
        try {
          localStorage.setItem(
            "pup_auth_user",
            JSON.stringify({
              id: json?.data?.id || null,
              username: json?.data?.username || usernameInput,
              role,
              mustChangePassword: Boolean(json?.data?.mustChangePassword),
            })
          );
        } catch {
          // ignore storage errors
        }
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
                <a
                  href="#"
                  className="text-xs text-pup-maroon hover:underline font-medium"
                >
                  Forgot Password?
                </a>
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
          <p>&copy; 2024 Polytechnic University of the Philippines</p>
        </div>
      </div>
    </div>
  );
}
