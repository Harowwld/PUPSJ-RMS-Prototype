import React from "react";
import { GENERATED_NOTIONISTS } from "./notionistsAvatarsGenerated.js";
import { Style, Avatar } from "@dicebear/core";
import notionistsDefinition from "@dicebear/styles/notionists.json" with { type: "json" };

const style = new Style(notionistsDefinition);

export const NOTIONISTS_AVATARS = GENERATED_NOTIONISTS.map((avatar) => ({
  ...avatar,
  svg: React.createElement("span", {
    style: { display: "contents" },
    dangerouslySetInnerHTML: { __html: avatar.svgString },
  }),
}));

export const NOTIONISTS_AVATAR_COUNT = NOTIONISTS_AVATARS.length;

export function getNotionistAvatar(id) {
  const numericId = Number(id);
  return NOTIONISTS_AVATARS.find((a) => a.id === numericId) || null;
}

export function getNotionistAvatarSvg(id) {
  const avatar = getNotionistAvatar(id);
  return avatar ? avatar.svgString : null;
}

export function isNotionistAvatarId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId >= 1 && numericId <= NOTIONISTS_AVATAR_COUNT;
}

export const NOTIONISTS_BOLD_PALETTE = [
  { id: "hot-pink", name: "Hot Pink", hex: "ff5d8f" },
  { id: "electric-cyan", name: "Electric Cyan", hex: "06b6d4" },
  { id: "bright-tangerine", name: "Bright Tangerine", hex: "f97316" },
  { id: "emerald-green", name: "Emerald Green", hex: "10b981" },
  { id: "royal-violet", name: "Royal Violet", hex: "8b5cf6" },
  { id: "amber-gold", name: "Amber Gold", hex: "f59e0b" },
  { id: "cobalt-blue", name: "Cobalt Blue", hex: "3b82f6" },
  { id: "neon-magenta", name: "Neon Magenta", hex: "ec4899" },
  { id: "bright-teal", name: "Bright Teal", hex: "14b8a6" },
  { id: "crimson-rose", name: "Crimson Rose", hex: "f43f5e" },
  { id: "vivid-indigo", name: "Vivid Indigo", hex: "6366f1" },
  { id: "lime-punch", name: "Lime Punch", hex: "84cc16" },
];

export const NOTIONISTS_PASTEL_PALETTE = [
  { id: "rose-pink", name: "Rose Pink", hex: "ffe4e6" },
  { id: "sky-cyan", name: "Sky Cyan", hex: "e0f2fe" },
  { id: "soft-peach", name: "Soft Peach", hex: "ffedd5" },
  { id: "mint-green", name: "Mint Green", hex: "dcfce7" },
  { id: "lavender", name: "Lavender", hex: "f3e8ff" },
  { id: "butter-gold", name: "Butter Gold", hex: "fef3c7" },
  { id: "powder-blue", name: "Powder Blue", hex: "dbeafe" },
  { id: "soft-magenta", name: "Soft Magenta", hex: "fce7f3" },
  { id: "soft-teal", name: "Soft Teal", hex: "ccfbf1" },
  { id: "blush-rose", name: "Blush Rose", hex: "ffe4e9" },
  { id: "soft-indigo", name: "Soft Indigo", hex: "e0e7ff" },
  { id: "soft-lime", name: "Soft Lime", hex: "ecfccb" },
];

export const NOTIONISTS_BOLD_COLORS = NOTIONISTS_BOLD_PALETTE.map((c) => c.hex);
export const NOTIONISTS_PASTEL_COLORS = NOTIONISTS_PASTEL_PALETTE.map((c) => c.hex);

export function getPaletteColorName(hex) {
  if (!hex) return "";
  const clean = hex.replace("#", "").toLowerCase();
  const foundBold = NOTIONISTS_BOLD_PALETTE.find((c) => c.hex.toLowerCase() === clean);
  if (foundBold) return foundBold.name;
  const foundPastel = NOTIONISTS_PASTEL_PALETTE.find((c) => c.hex.toLowerCase() === clean);
  if (foundPastel) return foundPastel.name;
  return `#${clean.toUpperCase()}`;
}

export function replaceSvgBg(svg, newHex) {
  if (!svg || typeof svg !== "string") return svg;
  const cleanHex = newHex.startsWith("#") ? newHex : `#${newHex}`;
  return svg.replace(/<rect width="1744" height="1744" fill="[^"]+"/, `<rect width="1744" height="1744" fill="${cleanHex}"`);
}

export function scopeSvgIds(svg, prefix) {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  if (!ids.length) return svg;
  const uniqueIds = [...new Set(ids)].sort((a, b) => b.length - a.length);

  let out = svg;
  for (const rawId of uniqueIds) {
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "");
    const safeId = `${safePrefix}-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
    out = out.split(`id="${rawId}"`).join(`id="${safeId}"`);
    out = out.split(`href="#${rawId}"`).join(`href="#${safeId}"`);
    out = out.split(`xlink:href="#${rawId}"`).join(`xlink:href="#${safeId}"`);
    out = out.split(`url(#${rawId})`).join(`url(#${safeId})`);
    out = out.split(`url('#${rawId}')`).join(`url('#${safeId}')`);
    out = out.split(`url("#${rawId}")`).join(`url("#${safeId}")`);
  }
  return out;
}

export function generateShuffledNotionist(customSeed = null, colorMode = "bold", selectedColor = null) {
  const seed = customSeed || `custom-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
  const palette = colorMode === "pastel" ? NOTIONISTS_PASTEL_COLORS : NOTIONISTS_BOLD_COLORS;
  const cleanColor = selectedColor ? (selectedColor.startsWith("#") ? selectedColor.slice(1) : selectedColor) : null;
  const bg = cleanColor || palette[Math.floor(Math.random() * palette.length)];
  const avatar = new Avatar(style, {
    seed,
    borderRadius: 50,
    backgroundColor: [bg],
    title: "Custom Avatar",
    gestureProbability: 50,
    glassesProbability: 40,
    beardProbability: 35,
    clothesGraphicProbability: 75,
  });

  const rawSvg = avatar
    .toString()
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<metadata[\s\S]*?<\/metadata>/g, "")
    .trim();

  // Scoped IDs to prevent DOM collision across multiple avatars
  const safeHash = Math.random().toString(36).substring(2, 8);
  const scopedSvg = scopeSvgIds(rawSvg, `shuff-${safeHash}`);

  return {
    seed,
    bgHex: `#${bg}`,
    name: "Custom Avatar",
    svgString: scopedSvg,
    svg: React.createElement("span", {
      style: { display: "contents" },
      dangerouslySetInnerHTML: { __html: scopedSvg },
    }),
  };
}
