import React from "react";
import { GENERATED_AVATARS } from "./defaultAvatarsGenerated";

// Default avatars are precomputed Boring Avatars (beam variant).
// Regenerate with: node scripts/generate-default-avatars.mjs
export const DEFAULT_AVATARS = GENERATED_AVATARS.map((avatar) => ({
  ...avatar,
  svg: <span style={{ display: "contents" }} dangerouslySetInnerHTML={{ __html: avatar.svgString }} />,
}));

export const DEFAULT_AVATAR_COUNT = DEFAULT_AVATARS.length;

// Number of avatars shown before "View More" is pressed.
export const DEFAULT_AVATAR_VISIBLE_COUNT = 24;

export function getDefaultAvatar(id) {
  const numericId = Number(id);
  return DEFAULT_AVATARS.find((a) => a.id === numericId) || null;
}

export function getDefaultAvatarSvg(id) {
  const avatar = getDefaultAvatar(id);
  return avatar ? avatar.svgString : null;
}

export function isDefaultAvatarId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId >= 1 && numericId <= DEFAULT_AVATAR_COUNT;
}
