"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Apple macOS Contacts / Messages 8-palette deterministic vibrant gradients
 */
const MAC_AVATAR_THEMES = [
  // 0. Blue (Apple Mail / Contacts)
  {
    bg: "bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 dark:from-blue-500 dark:via-blue-600 dark:to-blue-700",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-blue-400/40 dark:border-blue-400/30",
  },
  // 1. Purple (Apple Contacts)
  {
    bg: "bg-gradient-to-b from-purple-400 via-purple-500 to-purple-600 dark:from-purple-500 dark:via-purple-600 dark:to-purple-700",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-purple-400/40 dark:border-purple-400/30",
  },
  // 2. Emerald (Apple FaceTime)
  {
    bg: "bg-gradient-to-b from-emerald-400 via-emerald-500 to-teal-600 dark:from-emerald-500 dark:via-emerald-600 dark:to-teal-700",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-emerald-400/40 dark:border-emerald-400/30",
  },
  // 3. Amber (Apple Notes)
  {
    bg: "bg-gradient-to-b from-amber-400 via-orange-500 to-orange-600 dark:from-amber-500 dark:via-orange-500 dark:to-orange-700",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-amber-400/40 dark:border-amber-400/30",
  },
  // 4. Rose (Apple Music)
  {
    bg: "bg-gradient-to-b from-rose-400 via-rose-500 to-pink-600 dark:from-rose-500 dark:via-rose-600 dark:to-pink-700",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-rose-400/40 dark:border-rose-400/30",
  },
  // 5. Indigo (Apple Podcasts)
  {
    bg: "bg-gradient-to-b from-indigo-400 via-indigo-500 to-indigo-700 dark:from-indigo-500 dark:via-indigo-600 dark:to-indigo-800",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-indigo-400/40 dark:border-indigo-400/30",
  },
  // 6. Teal (Apple Messages)
  {
    bg: "bg-gradient-to-b from-cyan-400 via-teal-500 to-teal-600 dark:from-cyan-500 dark:via-teal-500 dark:to-teal-700",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-teal-400/40 dark:border-teal-400/30",
  },
  // 7. Ruby / PUP Maroon (Apple Institutional)
  {
    bg: "bg-gradient-to-b from-red-500 via-rose-700 to-pup-darkMaroon dark:from-red-600 dark:via-red-800 dark:to-pup-darkMaroon",
    text: "text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    border: "border-red-500/40 dark:border-red-400/30",
  },
];

function getMacTheme(seed) {
  if (!seed || typeof seed !== "string") return MAC_AVATAR_THEMES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return MAC_AVATAR_THEMES[Math.abs(hash) % MAC_AVATAR_THEMES.length];
}

function extractInitials(name) {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileAvatar({
  id,
  avatarFilename,
  name,
  initials,
  className,
  fallbackClassName,
  fallbackStyle,
  imageClassName,
  studentNo,
  accountId,
  account_id,
  studentAccountId,
  student_account_id,
  staffId,
  staff_id,
  variant = "mac",
}) {
  const lookupId = [
    id,
    studentNo,
    accountId,
    account_id,
    studentAccountId,
    student_account_id,
    staffId,
    staff_id,
  ].find((value) => value !== null && value !== undefined && String(value).trim() !== "");

  // Parse clean filename and timestamp if passed
  let cleanFilename = null;
  let timestampParam = null;
  if (typeof avatarFilename === "string" && avatarFilename.trim()) {
    const raw = avatarFilename.trim();
    const tMatch = raw.match(/[?&]t=([^&]+)/);
    if (tMatch) {
      timestampParam = tMatch[1];
      cleanFilename = raw.split(/[?&]t=/)[0];
    } else {
      cleanFilename = raw;
    }
  }

  // If avatarFilename is explicitly null or false, the caller explicitly indicates no custom avatar
  const hasExplicitNoAvatar = avatarFilename === null || avatarFilename === false;

  const queryParams = {};
  if (lookupId) queryParams.id = String(lookupId);
  if (cleanFilename) queryParams.filename = cleanFilename;
  if (timestampParam) queryParams.t = timestampParam;

  const avatarSrc = !hasExplicitNoAvatar && (cleanFilename || lookupId)
    ? `/api/account/avatar?${new URLSearchParams(queryParams)}`
    : null;

  const resolvedInitials = initials || extractInitials(name);
  const theme = variant === "mac" ? getMacTheme(name || lookupId || resolvedInitials) : null;

  return (
    <Avatar className={cn("size-10 shrink-0", className)}>
      {avatarSrc && (
        <AvatarImage
          src={avatarSrc}
          alt={name ? `${name} profile photo` : "Profile photo"}
          className={imageClassName}
        />
      )}
      <AvatarFallback
        className={cn(
          "flex size-full items-center justify-center rounded-full font-sans font-semibold tracking-[-0.01em] select-none",
          "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45),0_1px_2px_rgba(0,0,0,0.08)]",
          theme ? [theme.border, theme.bg, theme.text] : "border border-black/10 dark:border-white/15 bg-gradient-to-b from-zinc-400 via-zinc-500 to-zinc-600 text-white font-semibold drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
          fallbackClassName
        )}
        style={fallbackStyle}
      >
        {resolvedInitials}
      </AvatarFallback>
    </Avatar>
  );
}
