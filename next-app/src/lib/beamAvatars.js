import React from "react";

const SIZE = 36;

function hashCode(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const character = name.charCodeAt(i);
    hash = (hash << 5) - hash + character;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getDigit(number, n) {
  return Math.floor((number / Math.pow(10, n)) % 10);
}

function getBoolean(number, n) {
  return !((getDigit(number, n)) % 2);
}

function getUnit(number, range, index) {
  const value = number % range;
  if (index && ((getDigit(number, index)) % 2) === 0) {
    return -value;
  }
  return value;
}

function getRandomColor(number, colors, range) {
  return colors[number % range];
}

function getContrast(hexcolor) {
  let hex = hexcolor.startsWith("#") ? hexcolor.slice(1) : hexcolor;
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 >= 128 ? "#000000" : "#FFFFFF";
}

export function generateBeamData(name, colors) {
  const numFromName = hashCode(String(name || "beam"));
  const range = colors && colors.length ? colors.length : 1;
  const wrapperColor = getRandomColor(numFromName, colors, range);
  const preTranslateX = getUnit(numFromName, 10, 1);
  const wrapperTranslateX = preTranslateX < 5 ? preTranslateX + SIZE / 9 : preTranslateX;
  const preTranslateY = getUnit(numFromName, 10, 2);
  const wrapperTranslateY = preTranslateY < 5 ? preTranslateY + SIZE / 9 : preTranslateY;

  return {
    wrapperColor,
    faceColor: getContrast(wrapperColor),
    backgroundColor: getRandomColor(numFromName + 13, colors, range),
    wrapperTranslateX,
    wrapperTranslateY,
    wrapperRotate: getUnit(numFromName, 360),
    wrapperScale: 1 + getUnit(numFromName, SIZE / 12) / 10,
    isMouthOpen: getBoolean(numFromName, 2),
    isCircle: getBoolean(numFromName, 1),
    eyeSpread: getUnit(numFromName, 5),
    mouthSpread: getUnit(numFromName, 3),
    faceRotate: getUnit(numFromName, 10, 3),
    faceTranslateX: wrapperTranslateX > SIZE / 6 ? wrapperTranslateX / 2 : getUnit(numFromName, 8, 1),
    faceTranslateY: wrapperTranslateY > SIZE / 6 ? wrapperTranslateY / 2 : getUnit(numFromName, 7, 2),
  };
}

export function generateBeamSvgString(name, colors, maskId = null) {
  const id = maskId || `beam-${Math.random().toString(36).slice(2, 8)}`;
  const data = generateBeamData(name, colors);
  return `<svg viewBox="0 0 36 36" fill="none" role="img" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36"><rect width="36" height="36" rx="72" fill="#FFFFFF"></rect></mask><g mask="url(#${id})"><rect width="36" height="36" fill="${data.backgroundColor}"></rect><rect x="0" y="0" width="36" height="36" transform="translate(${data.wrapperTranslateX} ${data.wrapperTranslateY}) rotate(${data.wrapperRotate} 18 18) scale(${data.wrapperScale})" fill="${data.wrapperColor}" rx="${data.isCircle ? 36 : 6}"></rect><g transform="translate(${data.faceTranslateX} ${data.faceTranslateY}) rotate(${data.faceRotate} 18 18)">${data.isMouthOpen ? `<path d="M15 ${19 + data.mouthSpread}c2 1 4 1 6 0" stroke="${data.faceColor}" fill="none" stroke-linecap="round"></path>` : `<path d="M13 ${19 + data.mouthSpread}c1-0.75 4-1.5 5 0.5 1-2 5-1.5 5 0" stroke="${data.faceColor}" fill="none" stroke-linecap="round"></path>`}<rect x="${14 - data.eyeSpread}" y="14" width="1.5" height="2" rx="1" stroke="none" fill="${data.faceColor}"></rect><rect x="${20 + data.eyeSpread}" y="14" width="1.5" height="2" rx="1" stroke="none" fill="${data.faceColor}"></rect></g></g></svg>`;
}

export const BEAM_CLASSIC_PALETTES = [
  { id: "maroon-gold", name: "Maroon Gold", colors: ["#800000", "#f5c518", "#fff4d6", "#5a0000", "#e8a317"] },
  { id: "ocean", name: "Ocean", colors: ["#0b3d91", "#1e90ff", "#87cefa", "#e0f4ff", "#00bfa6"] },
  { id: "forest", name: "Forest", colors: ["#1b5e20", "#66bb6a", "#c8e6c9", "#f1f8e9", "#a5d6a7"] },
  { id: "slate", name: "Slate", colors: ["#1f2937", "#4b5563", "#9ca3af", "#e5e7eb", "#f9fafb"] },
  { id: "midnight", name: "Midnight", colors: ["#0f172a", "#1e293b", "#38bdf8", "#64748b", "#f8fafc"] },
  { id: "amber-gold", name: "Amber Gold", colors: ["#78350f", "#b45309", "#fef3c7", "#d97706", "#f59e0b"] },
];

export const BEAM_VIBRANT_PALETTES = [
  { id: "sunset", name: "Sunset", colors: ["#ff6b35", "#f7c59f", "#efefd0", "#004e89", "#1a659e"] },
  { id: "orchid", name: "Orchid", colors: ["#6a4c93", "#c77dff", "#e0aaff", "#240046", "#ff9ecd"] },
  { id: "candy", name: "Candy", colors: ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"] },
  { id: "coral", name: "Coral", colors: ["#ff7f50", "#ffd1dc", "#20b2aa", "#264653", "#e9c46a"] },
  { id: "electric-neon", name: "Electric Neon", colors: ["#06b6d4", "#10b981", "#ff5d8f", "#8b5cf6", "#f97316"] },
  { id: "aurora", name: "Aurora", colors: ["#042f2e", "#0d9488", "#5eead4", "#a7f3d0", "#6ee7b7"] },
];

export const BEAM_PALETTES = [...BEAM_CLASSIC_PALETTES, ...BEAM_VIBRANT_PALETTES];

export const BEAM_SEEDS = ["Ada", "Bryn", "Cato", "Dara", "Eli", "Fenn"];

export function getBeamPalette(idOrName) {
  if (!idOrName) return null;
  const clean = String(idOrName).toLowerCase().replace(/[\s_]+/g, "-");
  return BEAM_PALETTES.find((p) => p.id === clean || p.name.toLowerCase() === String(idOrName).toLowerCase()) || null;
}

export function getBeamPresetInfo(presetId) {
  const numId = Number(presetId);
  if (!Number.isInteger(numId) || numId < 1 || numId > 48) return null;
  // Presets 1-48 map cyclically across the 8 default palettes and 6 seeds
  const default8Palettes = [
    BEAM_CLASSIC_PALETTES[0], // Maroon Gold
    BEAM_CLASSIC_PALETTES[1], // Ocean
    BEAM_CLASSIC_PALETTES[2], // Forest
    BEAM_VIBRANT_PALETTES[0], // Sunset
    BEAM_VIBRANT_PALETTES[1], // Orchid
    BEAM_VIBRANT_PALETTES[2], // Candy
    BEAM_CLASSIC_PALETTES[3], // Slate
    BEAM_VIBRANT_PALETTES[3], // Coral
  ];
  const palette = default8Palettes[(numId - 1) % 8];
  const seedName = BEAM_SEEDS[Math.floor((numId - 1) / 8)] || "Ada";
  const seed = `${seedName}-${palette.name}`;
  return { seed, palette, seedName };
}

export function generateShuffledBeam(forcedSeed = null, paletteMode = "classic", specificPaletteId = null) {
  const seed = forcedSeed || `beam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  let palette;
  if (specificPaletteId) {
    palette = getBeamPalette(specificPaletteId) || BEAM_CLASSIC_PALETTES[0];
  } else {
    const list = paletteMode === "vibrant" ? BEAM_VIBRANT_PALETTES : BEAM_CLASSIC_PALETTES;
    palette = list[Math.floor(Math.random() * list.length)] || list[0];
  }
  const svgString = generateBeamSvgString(seed, palette.colors);
  return {
    id: "custom-beam",
    type: "custom",
    name: "Custom Beam Gradient",
    seed,
    palette,
    colors: palette.colors,
    svgString,
    svg: React.createElement("span", {
      style: { display: "contents" },
      dangerouslySetInnerHTML: { __html: svgString },
    }),
  };
}
