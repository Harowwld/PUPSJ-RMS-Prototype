// Dynamic WebGL Mesh Gradient Generator for Profile Cover Banners

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export const DYNAMIC_COVER_MOODS = [
  {
    id: "all",
    label: "All Harmonies",
    dotColor: "#8b5cf6",
    swatchGradient: "linear-gradient(135deg, #a855f7 0%, #ec4899 35%, #3b82f6 70%, #10b981 100%)",
  },
  {
    id: "institutional",
    label: "PUP Heritage",
    dotColor: "#800000",
    swatchGradient: "linear-gradient(135deg, #800000 0%, #991b1b 50%, #d97706 100%)",
  },
  {
    id: "sunset",
    label: "Sunset Glow",
    dotColor: "#ea580c",
    swatchGradient: "linear-gradient(135deg, #f43f5e 0%, #ea580c 50%, #f59e0b 100%)",
  },
  {
    id: "ocean",
    label: "Oceanic Azure",
    dotColor: "#0284c7",
    swatchGradient: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 50%, #06b6d4 100%)",
  },
  {
    id: "neon",
    label: "Cyber Neon",
    dotColor: "#ec4899",
    swatchGradient: "linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #06b6d4 100%)",
  },
  {
    id: "aurora",
    label: "Northern Aurora",
    dotColor: "#10b981",
    swatchGradient: "linear-gradient(135deg, #059669 0%, #10b981 50%, #8b5cf6 100%)",
  },
  {
    id: "velvet",
    label: "Velvet Midnight",
    dotColor: "#6366f1",
    swatchGradient: "linear-gradient(135deg, #312e81 0%, #6366f1 50%, #86198f 100%)",
  },
];

const ADJECTIVES = [
  "Crimson", "Celestial", "Radiant", "Luminescent", "Velvet",
  "Prismatic", "Solar", "Oceanic", "Cyber", "Starlight",
  "Ember", "Emerald", "Mystic", "Aura", "Obsidian", "Golden",
  "Amethyst", "Zenith", "Borealis", "Twilight", "Eclipse"
];

const NOUNS = [
  "Dawn", "Horizon", "Nebula", "Bloom", "Dusk",
  "Breeze", "Wave", "Tide", "Solstice", "Cascade",
  "Mirage", "Twilight", "Pulse", "Echo", "Current",
  "Corona", "Flux", "Flow", "Atmosphere", "Zenith"
];

export function getCssFallbackGradient(colors) {
  if (!colors || colors.length < 4) {
    return "radial-gradient(at 10% 20%, #800000 0px, transparent 55%), radial-gradient(at 80% 0%, #ea580c 0px, transparent 50%), radial-gradient(at 50% 80%, #7c3aed 0px, transparent 55%), #1e1b4b";
  }
  return `radial-gradient(at 15% 20%, ${colors[0]} 0px, transparent 55%), radial-gradient(at 85% 15%, ${colors[1]} 0px, transparent 50%), radial-gradient(at 50% 85%, ${colors[2]} 0px, transparent 55%), ${colors[3]}`;
}

export function generateDynamicCoverTheme(mood = "all", customSeed = null) {
  let baseHue;
  let sat1 = 85, sat2 = 80, sat3 = 75;
  let light1 = 34, light2 = 46, light3 = 52, light4 = 10;
  let offset1 = 35, offset2 = 80;

  if (mood === "institutional") {
    // Crimson Maroon & Amber Gold
    baseHue = 350 + Math.floor(Math.random() * 20 - 10);
    offset1 = 30; // Orange / Amber
    offset2 = 45; // Gold
    light1 = 28;
    light2 = 42;
    light3 = 54;
    light4 = 8;
  } else if (mood === "sunset") {
    baseHue = 15 + Math.floor(Math.random() * 25);
    offset1 = -35; // Magenta / Fuchsia
    offset2 = 45;  // Amber Gold
    light1 = 38;
    light2 = 48;
    light3 = 56;
    light4 = 12;
  } else if (mood === "ocean") {
    baseHue = 195 + Math.floor(Math.random() * 30);
    offset1 = -25; // Deep Sapphire
    offset2 = 35;  // Electric Teal
    light1 = 30;
    light2 = 45;
    light3 = 52;
    light4 = 9;
  } else if (mood === "neon") {
    baseHue = 270 + Math.floor(Math.random() * 60);
    offset1 = 120; // Neon Green or Cyan
    offset2 = -60; // Hot Magenta
    sat1 = 95; sat2 = 95; sat3 = 90;
    light1 = 42; light2 = 50; light3 = 56; light4 = 6;
  } else if (mood === "aurora") {
    baseHue = 165 + Math.floor(Math.random() * 30);
    offset1 = 90;  // Royal Purple
    offset2 = -30; // Mint Emerald
    light1 = 32; light2 = 48; light3 = 58; light4 = 8;
  } else if (mood === "velvet") {
    baseHue = 240 + Math.floor(Math.random() * 30);
    offset1 = 35;  // Purple Plum
    offset2 = -40; // Deep Cobalt
    light1 = 28; light2 = 40; light3 = 48; light4 = 7;
  } else {
    // All moods: algorithmic color harmonies
    baseHue = Math.floor(Math.random() * 360);
    offset1 = 35 + Math.floor(Math.random() * 40);
    offset2 = 110 + Math.floor(Math.random() * 70);
  }

  const c1 = hslToHex(baseHue, sat1, light1);
  const c2 = hslToHex(baseHue + offset1, sat2, light2);
  const c3 = hslToHex(baseHue + offset2, sat3, light3);
  const c4 = hslToHex(baseHue + 180, 40, light4);

  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const name = `${adj} ${noun}`;
  const randomSuffix = customSeed || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id: `custom-mesh-${randomSuffix}`,
    name,
    mood,
    theme: `${adj} Harmony`,
    colors: [c1, c2, c3, c4],
    cssGradient: getCssFallbackGradient([c1, c2, c3, c4]),
    tagline: `Dynamic algorithmic blend of ${c1}, ${c2}, and ${c3}`,
    isDynamic: true,
  };
}
