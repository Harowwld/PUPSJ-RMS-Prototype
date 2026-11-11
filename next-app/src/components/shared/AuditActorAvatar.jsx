"use client";

import ProfileAvatar from "@/components/shared/ProfileAvatar";

function getInitials(name) {
  return String(name || "System")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AU";
}

export default function AuditActorAvatar({ log, className, fallbackClassName }) {
  const name = log?.actor_display_name || log?.user || log?.actor || "System";
  const id =
    log?.actor_id ||
    log?.actorId ||
    log?.created_by ||
    (String(log?.role || "").toLowerCase() === "student" ? log?.actor : null) ||
    name;
  const avatarFilename = log?.avatar_filename || log?.avatarFilename || null;

  return (
    <ProfileAvatar
      id={id}
      avatarFilename={avatarFilename}
      name={name}
      initials={getInitials(name)}
      className={className}
      fallbackClassName={fallbackClassName}
    />
  );
}
