import React from "react";
import { cn } from "@/lib/utils";

export function ApplePasswordsLogo({ className = "size-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="5.5" className="fill-zinc-900 dark:fill-zinc-100" />
      <path
        d="M15.5 12.8c-.02-1.7 1.39-2.52 1.45-2.56-.8-1.16-2.03-1.32-2.47-1.34-1.05-.11-2.06.62-2.6.62-.53 0-1.36-.6-2.24-.59-1.15.02-2.22.67-2.81 1.7-1.2 2.08-.31 5.17.85 6.85.57.82 1.25 1.74 2.14 1.71.86-.03 1.18-.55 2.22-.55 1.03 0 1.33.55 2.22.53.92-.02 1.5-.83 2.06-1.66.66-.96.93-1.89.95-1.94-.02-.01-1.74-.67-1.77-2.73zM13.8 7.5c.47-.58.8-1.38.71-2.19-.69.03-1.52.46-2.01 1.04-.43.5-.81 1.32-.7 2.11.77.06 1.54-.39 2-.96z"
        className="fill-white dark:fill-zinc-900"
      />
    </svg>
  );
}

export function GoogleAuthenticatorLogo({ className = "size-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#FFFFFF" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
      <path
        fill="#4285F4"
        d="M17.6 12.16c0-.5-.04-.98-.12-1.44H12v2.73h3.14c-.14.73-.55 1.36-1.18 1.78v1.48h1.91c1.12-1.03 1.73-2.55 1.73-4.55z"
      />
      <path
        fill="#34A853"
        d="M12 18c1.62 0 2.98-.54 3.97-1.46l-1.91-1.48c-.54.36-1.23.57-2.06.57-1.59 0-2.93-1.07-3.41-2.52H6.62v1.53C7.65 16.69 9.68 18 12 18z"
      />
      <path
        fill="#FBBC05"
        d="M8.59 13.11c-.12-.36-.19-.75-.19-1.11s.07-.75.19-1.11V9.36H6.62A5.98 5.98 0 0 0 6 12c0 .97.23 1.89.62 2.64l1.97-1.53z"
      />
      <path
        fill="#EA4335"
        d="M12 8.38c.88 0 1.67.3 2.3.9l1.72-1.72C14.97 6.59 13.62 6 12 6 9.68 6 7.65 7.31 6.62 9.36l1.97 1.53c.48-1.45 1.82-2.51 3.41-2.51z"
      />
    </svg>
  );
}

export function MicrosoftAuthenticatorLogo({ className = "size-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#0078D4" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 5.5a3 3 0 0 0-3 3V10H8.5A1.5 1.5 0 0 0 7 11.5v5A1.5 1.5 0 0 0 8.5 18h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 15.5 10H15V8.5a3 3 0 0 0-3-3zm1.5 4.5h-3V8.5a1.5 1.5 0 1 1 3 0V10zm-1.5 3a1.25 1.25 0 0 0-.75 2.25V16.5a.75.75 0 0 0 1.5 0v-1.25A1.25 1.25 0 0 0 12 13z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function OnePasswordLogo({ className = "size-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#0572EC" />
      <circle cx="12" cy="12" r="6.75" stroke="#FFFFFF" strokeWidth="1.75" fill="none" />
      <rect x="8.5" y="11" width="7" height="2" rx="1" fill="#FFFFFF" />
    </svg>
  );
}

export function AuthyLogo({ className = "size-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#EC1C24" />
      <path
        d="M12 6a6 6 0 0 0-3.7 10.72c.36.2.8-.07.8-.49v-1.44a.4.4 0 0 0-.2-.35 4.2 4.2 0 1 1 6.2 0 .4.4 0 0 0-.2.35v1.44c0 .42.44.69.8.49A6 6 0 0 0 12 6zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function BitwardenLogo({ className = "size-4" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="5.5" fill="#175DDC" />
      <path
        d="M12 6l-5 2.19v4.06c0 3.25 2.13 6.31 5 7.19 2.87-.88 5-3.94 5-7.19V8.19L12 6zm-1 8.44V9.31l3.12 1.38v3c0 2-1.19 3.88-3.12 4.5v-3.75zm1.88 0v3.75c-1.94-.62-3.13-2.5-3.13-4.5v-3l3.13-1.38v5.13z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export const AUTHENTICATOR_APPS = [
  {
    id: "apple-passwords",
    name: "Apple Passwords",
    subtitle: "Built-in on iOS, iPadOS & macOS",
    Icon: ApplePasswordsLogo,
  },
  {
    id: "google-authenticator",
    name: "Google Authenticator",
    subtitle: "Android, iOS & Chrome",
    Icon: GoogleAuthenticatorLogo,
  },
  {
    id: "microsoft-authenticator",
    name: "Microsoft Authenticator",
    subtitle: "Android, iOS & Enterprise SSO",
    Icon: MicrosoftAuthenticatorLogo,
  },
  {
    id: "1password",
    name: "1Password",
    subtitle: "Cross-platform Vault",
    Icon: OnePasswordLogo,
  },
  {
    id: "authy",
    name: "Authy",
    subtitle: "Multi-device Cloud Sync",
    Icon: AuthyLogo,
  },
  {
    id: "bitwarden",
    name: "Bitwarden",
    subtitle: "Open Source Password Manager",
    Icon: BitwardenLogo,
  },
];

export default function AuthenticatorAppBadges({
  className,
  size = "default",
  showSubtitles = false,
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {AUTHENTICATOR_APPS.map((app) => {
        const AppIcon = app.Icon;
        return (
          <div
            key={app.id}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-zinc-800 shadow-2xs hover:border-black/[0.12] dark:hover:border-white/[0.16] hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-all select-none",
              size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"
            )}
          >
            <div className="shrink-0 size-4 flex items-center justify-center overflow-hidden rounded-[4px] shadow-xs">
              <AppIcon className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800 dark:text-zinc-200 leading-none">
                {app.name}
              </span>
              {showSubtitles && (
                <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">
                  {app.subtitle}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
