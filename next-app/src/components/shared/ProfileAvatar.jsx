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
}) {
  const avatarSrc = id || avatarFilename
    ? `/api/account/avatar?${new URLSearchParams({
        ...(id ? { id: String(id) } : {}),
        ...(avatarFilename ? { t: avatarFilename } : {}),
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
