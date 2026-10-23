"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

  const avatarSrc = lookupId || avatarFilename
    ? `/api/account/avatar?${new URLSearchParams({
        ...(lookupId ? { id: String(lookupId) } : {}),
        ...(avatarFilename ? { t: String(avatarFilename) } : {}),
        ...(avatarFilename ? { filename: String(avatarFilename) } : {}),
      })}`
    : null;

  return (
    <Avatar className={cn("size-10 shrink-0", className)}>
      {avatarSrc && (
        <AvatarImage
          src={avatarSrc}
          alt={name ? `${name} profile photo` : "Profile photo"}
          className={imageClassName}
        />
      )}
      <AvatarFallback className={fallbackClassName} style={fallbackStyle}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
