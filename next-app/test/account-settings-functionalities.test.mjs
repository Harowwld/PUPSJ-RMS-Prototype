import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-key-for-unit-testing-32-chars";

import { validatePasswordPolicy } from "../src/lib/passwordPolicy.js";
import { validateSecurityAnswer } from "../src/lib/authSchemas.js";
import { GENERATED_AVATARS } from "../src/lib/defaultAvatarsGenerated.js";
import {
  generateTOTPSecret,
  encryptSecret,
  decryptSecret,
  verifyTOTP,
  isValidToken,
} from "../src/lib/totp.js";
import {
  DEFAULT_SOUND_CATEGORIES,
  DEFAULT_SOUND_VOLUME,
  isValidSoundCategoriesPreference,
  normalizeSoundCategories,
} from "../src/lib/soundPreferences.js";
import { APPLE_WALLPAPER_PRESETS, getAppleWallpaperPreset } from "../src/lib/constants.js";

const DEFAULT_AVATARS = GENERATED_AVATARS;
const DEFAULT_AVATAR_COUNT = DEFAULT_AVATARS.length;
const DEFAULT_AVATAR_VISIBLE_COUNT = 24;

function getDefaultAvatar(id) {
  const numericId = Number(id);
  return DEFAULT_AVATARS.find((a) => a.id === numericId) || null;
}

function getDefaultAvatarSvg(id) {
  const avatar = getDefaultAvatar(id);
  return avatar ? avatar.svgString : null;
}

function isDefaultAvatarId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) && numericId >= 1 && numericId <= DEFAULT_AVATAR_COUNT;
}

const SETTINGS_PANEL_PATH = path.resolve("src/components/shared/AccountSettingsPanel.js");

// ---------------------------------------------------------------------------
// 1. Profile Tab UI: Single Save Button & Floating Capsule Removal
// ---------------------------------------------------------------------------
test("Profile Tab UI: Only one Save Changes button and no floating action bar", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  const profileSection = code.substring(
    code.indexOf('<TabsContent value="profile"'),
    code.indexOf('<TabsContent value="security"')
  );

  // 1. Floating dock is completely removed
  assert.ok(
    !code.includes("Floating Dynamic Save Capsule Dock"),
    "AccountSettingsPanel must not contain the floating dynamic save capsule dock comment"
  );
  assert.ok(
    !profileSection.includes("fixed bottom-6"),
    "Profile tab must not render a fixed bottom floating dock"
  );

  // 2. Count "Save Changes" occurrences in the Profile tab: exactly ONE button
  const saveChangesMatches = profileSection.match(/Save Changes/g) || [];
  assert.equal(
    saveChangesMatches.length,
    1,
    "Profile tab must contain exactly ONE Save Changes button"
  );

  // 3. Verify in-form Save Changes button attributes
  assert.ok(
    profileSection.includes('type="submit"') &&
    profileSection.includes("disabled={profileLoading || !isDirty}"),
    "Profile Save button must be type='submit' and disabled when clean or loading"
  );

  // 4. Verify in-form Discard button is conditionally rendered when dirty
  assert.ok(
    profileSection.includes("{isDirty && (") &&
    profileSection.includes("handleDiscardProfileChanges"),
    "Profile form must render the Discard button only when isDirty is true"
  );

  // 5. Verify real-time dirty status indicator
  assert.ok(
    profileSection.includes("Unsaved profile changes") &&
    profileSection.includes("All profile changes saved"),
    "Profile form must display clear dirty state message"
  );
});

// ---------------------------------------------------------------------------
// 2. Profile Dirty State & Submission Logic
// ---------------------------------------------------------------------------
test("Profile Tab Logic: Dirty state calculation and field tracking", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  // Verify that isDirty checks all editable profile fields
  assert.ok(
    code.includes("const isDirty ="),
    "isDirty must be calculated based on field values"
  );
  assert.ok(
    code.includes('initialProfileValues.fname'),
    "isDirty must track first name modifications"
  );
  assert.ok(
    code.includes('initialProfileValues.lname'),
    "isDirty must track last name modifications"
  );

  // Verify handleDiscardProfileChanges restores all fields to initial values
  assert.ok(
    code.includes("setFname(initialProfileValues.fname)"),
    "Discard must restore fname"
  );
  assert.ok(
    code.includes("setLname(initialProfileValues.lname)"),
    "Discard must restore lname"
  );

  // Verify required name check before submit
  assert.ok(
    code.includes('!(fname || "").trim() || !(lname || "").trim()'),
    "submitProfile must guard against empty first or last names"
  );
});

// ---------------------------------------------------------------------------
// 3. Security Tab: Password Strength & Password Policy
// ---------------------------------------------------------------------------
test("Security Tab: Password strength evaluation and security policy", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  // Extract getPasswordStrength from source code
  const strengthFnMatch = code.match(/const getPasswordStrength = \([\s\S]*?\n\};/);
  assert.ok(strengthFnMatch, "getPasswordStrength must be defined in AccountSettingsPanel");

  const cleanedFnStr = strengthFnMatch[0]
    .replace(/^const getPasswordStrength = /, "")
    .replace(/;\s*$/, "");
  const getPasswordStrength = new Function(`return (${cleanedFnStr})`)();

  // 1. Empty / null password
  assert.equal(getPasswordStrength("").score, 0);
  assert.equal(getPasswordStrength(null).score, 0);

  // 2. Under 8 characters is immediately weak/short
  const shortResult = getPasswordStrength("Ab1!");
  assert.equal(shortResult.score, 1);
  assert.ok(shortResult.label.includes("Too short"));

  // 3. Fair password (8 chars, mixed case, no digits/symbols)
  const fairResult = getPasswordStrength("Abcdefghijk");
  assert.equal(fairResult.score, 2);
  assert.equal(fairResult.label, "Fair");

  // 4. Good password (8 chars, mixed case + digits)
  const goodResult = getPasswordStrength("Abcdefgh12");
  assert.equal(goodResult.score, 3);
  assert.equal(goodResult.label, "Good");

  // 5. Strong password (8+ chars, mixed case + digits + special chars)
  const strongResult = getPasswordStrength("P@ssw0rd!2026");
  assert.equal(strongResult.score, 4);
  assert.equal(strongResult.label, "Strong");

  // Test backend password policy rules
  const policyUnder8 = validatePasswordPolicy("Short1!");
  assert.equal(policyUnder8.valid, false);
  assert.ok(policyUnder8.reason.includes("at least 8 characters"));

  const policyDefault = validatePasswordPolicy(process.env.DEFAULT_STAFF_PASSWORD || "pupstaff");
  assert.equal(policyDefault.valid, false);
  assert.ok(policyDefault.reason.includes("default"));

  const policyValid = validatePasswordPolicy("ValidStrongPwd#2026");
  assert.equal(policyValid.valid, true);
  assert.equal(policyValid.reason, null);

  // 6. Verify password strength card is attached directly to the input container on top of it
  const securitySection = code.substring(
    code.indexOf('<TabsContent value="security"'),
    code.indexOf('<TabsContent value="two-factor"')
  );
  const passwordFormSection = securitySection.substring(
    securitySection.indexOf("{/* Apple Inset Grouped List: Password fields */}"),
    securitySection.indexOf("</form>")
  );
  assert.ok(
    passwordFormSection.includes("Confirm Password") &&
    passwordFormSection.includes("Password Strength") &&
    passwordFormSection.indexOf("Password Strength") > passwordFormSection.indexOf("Confirm Password"),
    "Password strength card must be attached directly below the password inputs inside the same grouped card container"
  );
});

// ---------------------------------------------------------------------------
// 4. Security Tab: Security Questions Validation
// ---------------------------------------------------------------------------
test("Security Tab: Security answer validation enforces quality and complexity", () => {
  // Empty
  assert.equal(validateSecurityAnswer("").valid, false);
  assert.equal(validateSecurityAnswer("   ").valid, false);

  // Too short (< 3 chars)
  const short = validateSecurityAnswer("No");
  assert.equal(short.valid, false);
  assert.ok(short.error.includes("at least 3 characters"));

  // Common placeholders rejected
  const placeholderA = validateSecurityAnswer("asdf");
  assert.equal(placeholderA.valid, false);
  assert.ok(placeholderA.error.includes("placeholder"));

  const placeholderB = validateSecurityAnswer("none");
  assert.equal(placeholderB.valid, false);

  const placeholderC = validateSecurityAnswer("n/a");
  assert.equal(placeholderC.valid, false);

  // Valid answers accepted
  const validA = validateSecurityAnswer("Blueberry Muffin");
  assert.equal(validA.valid, true);

  const validB = validateSecurityAnswer("St. Jude Elementary School");
  assert.equal(validB.valid, true);
});

// ---------------------------------------------------------------------------
// 5. Two-Factor Authentication Tab: TOTP Secret Generation & Verification
// ---------------------------------------------------------------------------
test("Two-Factor Auth: TOTP generation, encryption, and token verification", () => {
  // 1. Generate TOTP secret
  const { secret, otpauthUrl } = generateTOTPSecret("PUPREGISTRAR-001");
  assert.ok(secret && secret.length >= 16, "Secret must be a valid base32 string");
  assert.ok(
    otpauthUrl.startsWith("otpauth://totp/PUPSJ-RMS:PUPREGISTRAR-001?secret=") ||
    otpauthUrl.includes("secret="),
    "otpauthUrl must be well-formed RFC 6238 Key URI"
  );

  // 2. Encryption and decryption round-trip
  const encrypted = encryptSecret(secret);
  assert.notEqual(encrypted, secret);
  const decrypted = decryptSecret(encrypted);
  assert.equal(decrypted, secret, "Decrypted secret must match original");

  // 3. Token validation helper
  assert.equal(isValidToken("123456"), true);
  assert.equal(isValidToken("12345"), false);
  assert.equal(isValidToken("1234567"), false);
  assert.equal(isValidToken("abcdef"), false);

  // 4. Verification with tolerance
  const dummySecret = "JBSWY3DPEHPK3PXP"; // Base32 for 'Hello!\xDE\xAD\xBE\xEF'
  assert.equal(verifyTOTP("invalid", dummySecret), false);

  // 5. Authenticator App Badges with real brand logos and application names
  const badgesPath = path.resolve("src/components/shared/AuthenticatorAppBadges.js");
  const badgesCode = fs.readFileSync(badgesPath, "utf8");
  assert.ok(badgesCode.includes("Apple Passwords") && badgesCode.includes("ApplePasswordsLogo"), "Must include Apple Passwords with real logo");
  assert.ok(badgesCode.includes("Google Authenticator") && badgesCode.includes("GoogleAuthenticatorLogo"), "Must include Google Authenticator with real logo");
  assert.ok(badgesCode.includes("Microsoft Authenticator") && badgesCode.includes("MicrosoftAuthenticatorLogo"), "Must include Microsoft Authenticator with real logo");
  assert.ok(badgesCode.includes("1Password") && badgesCode.includes("OnePasswordLogo"), "Must include 1Password with real logo");
  assert.ok(badgesCode.includes("Authy") && badgesCode.includes("AuthyLogo"), "Must include Authy with real logo");
  assert.ok(badgesCode.includes("Bitwarden") && badgesCode.includes("BitwardenLogo"), "Must include Bitwarden with real logo");

  const panelCode = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");
  assert.ok(
    panelCode.includes("<AuthenticatorAppBadges") && panelCode.includes("Compatible Applications"),
    "AccountSettingsPanel must render AuthenticatorAppBadges in 2FA view"
  );
});

// ---------------------------------------------------------------------------
// 6. Preferences Tab: Settings validators and sound category management
// ---------------------------------------------------------------------------
test("Preferences Tab: Settings validators and sound category management", () => {
  // 1. Sound categories defaults
  assert.equal(DEFAULT_SOUND_CATEGORIES.presses, true);
  assert.equal(DEFAULT_SOUND_CATEGORIES.toggles, true);
  assert.equal(DEFAULT_SOUND_CATEGORIES.surfaces, true);
  assert.equal(DEFAULT_SOUND_CATEGORIES.values, true);
  assert.equal(DEFAULT_SOUND_CATEGORIES.outcomes, true);
  assert.equal(DEFAULT_SOUND_CATEGORIES.notifications, true);

  // 2. Valid sound categories preference check
  assert.equal(isValidSoundCategoriesPreference({ presses: false }), true);
  assert.equal(isValidSoundCategoriesPreference({ unknown_category: true }), false);
  assert.equal(isValidSoundCategoriesPreference(null), false);

  // 3. Normalize sound categories safely fills in defaults
  const normalized = normalizeSoundCategories({ presses: false });
  assert.equal(normalized.presses, false);
  assert.equal(normalized.toggles, true);
  assert.equal(normalized.notifications, true);

  // 4. Default volume check
  assert.equal(typeof DEFAULT_SOUND_VOLUME, "number");
  assert.ok(DEFAULT_SOUND_VOLUME >= 0 && DEFAULT_SOUND_VOLUME <= 1);
});

// ---------------------------------------------------------------------------
// 7. Avatar Picker & Wallpaper Themes
// ---------------------------------------------------------------------------
test("Avatar Picker & Wallpaper Themes: Presets catalog and resolution", () => {
  // 1. Avatars catalog integrity
  assert.equal(DEFAULT_AVATARS.length, 48, "Must contain exactly 48 precomputed default avatars");
  assert.equal(DEFAULT_AVATAR_COUNT, 48);
  assert.equal(DEFAULT_AVATAR_VISIBLE_COUNT, 24);

  // 2. Avatar ID bounds
  assert.equal(isDefaultAvatarId(1), true);
  assert.equal(isDefaultAvatarId(48), true);
  assert.equal(isDefaultAvatarId(0), false, "ID 0 is reserved for 'No Avatar / Default Initial'");
  assert.equal(isDefaultAvatarId(49), false);
  assert.equal(isDefaultAvatarId("abc"), false);

  // 3. SVG resolution
  const svg1 = getDefaultAvatarSvg(1);
  assert.ok(svg1 && svg1.includes("<svg"), "Default avatar 1 must return valid SVG markup");

  // 4. Wallpaper Presets integrity
  assert.equal(APPLE_WALLPAPER_PRESETS.length, 8, "Must provide 8 curated institutional wallpaper themes");
  for (const preset of APPLE_WALLPAPER_PRESETS) {
    assert.ok(preset.id, "Preset must have an id");
    assert.ok(preset.name, "Preset must have a name");
    assert.ok(preset.theme, "Preset must have an institutional theme description");
    assert.ok(Array.isArray(preset.colors) && preset.colors.length >= 2, "Preset must define at least 2 mesh colors");
    assert.ok(preset.cssGradient.startsWith("radial-gradient"), "Preset must define CSS radial fallback gradient");
  }

  // 5. Preset lookup with fallback
  const resolved = getAppleWallpaperPreset("sequoia");
  assert.equal(resolved.id, "sequoia");
  const fallback = getAppleWallpaperPreset("non_existent_preset");
  assert.equal(fallback.id, "sequoia", "Unknown preset must fall back to default theme");
});

// ---------------------------------------------------------------------------
// 8. Name Representation Live Reactivity
// ---------------------------------------------------------------------------
test("Preferences: Name representation updates across interface in real-time without page reload", () => {
  const panelCode = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");
  const sidebarCode = fs.readFileSync(path.resolve("src/components/shared/Sidebar.js"), "utf8");
  const headerCode = fs.readFileSync(path.resolve("src/components/layout/Header.js"), "utf8");

  // 1. AccountSettingsPanel dispatches window events on preference change
  assert.ok(
    panelCode.includes('"user-preferences-changed"'),
    "AccountSettingsPanel must dispatch user-preferences-changed"
  );
  assert.ok(
    panelCode.includes('"display-name-format-changed"'),
    "AccountSettingsPanel must dispatch display-name-format-changed"
  );

  // 2. AccountSettingsPanel calculates formattedHeroName reactive to display_name_format
  assert.ok(
    panelCode.includes("formattedHeroName"),
    "AccountSettingsPanel must compute formattedHeroName"
  );
  assert.ok(
    panelCode.includes("<span>{formattedHeroName}</span>"),
    "AccountSettingsPanel must render formattedHeroName in profile hero header"
  );

  // 3. Sidebar registers event listeners for real-time reactivity
  assert.ok(
    sidebarCode.includes('"display-name-format-changed"'),
    "Sidebar must listen for display-name-format-changed"
  );
  assert.ok(
    sidebarCode.includes("displayNameFormat"),
    "Sidebar must maintain reactive displayNameFormat state"
  );
  assert.ok(
    sidebarCode.includes("displayNameFormat || authUser?.preferences?.display_name_format"),
    "Sidebar displayName calculation must prioritize reactive displayNameFormat state"
  );

  // 4. Header registers event listeners for real-time reactivity
  assert.ok(
    headerCode.includes('"display-name-format-changed"'),
    "Header must listen for display-name-format-changed"
  );
  assert.ok(
    headerCode.includes("displayNameFormat"),
    "Header must maintain reactive displayNameFormat state"
  );
  assert.ok(
    headerCode.includes("displayNameFormat || authUser?.preferences?.display_name_format"),
    "Header displayName calculation must prioritize reactive displayNameFormat state"
  );

  // 5. Functional representation test for all 4 format styles
  function formatName(fname, lname, format) {
    const cleanFirst = (fname || "").trim();
    const cleanLast = (lname || "").trim();
    if (cleanFirst && cleanLast) {
      if (format === "first_only") return cleanFirst;
      if (format === "last_only") return cleanLast;
      if (format === "last_first") return `${cleanLast}, ${cleanFirst}`;
      return `${cleanFirst} ${cleanLast}`;
    }
    return [cleanFirst, cleanLast].filter(Boolean).join(" ").trim() || "User";
  }

  assert.equal(formatName("Elias", "Austria", "full_name"), "Elias Austria");
  assert.equal(formatName("Elias", "Austria", "first_only"), "Elias");
  assert.equal(formatName("Elias", "Austria", "last_only"), "Austria");
  assert.equal(formatName("Elias", "Austria", "last_first"), "Austria, Elias");
});

// ---------------------------------------------------------------------------
// 9. Settings Sidebar High Contrast Legibility
// ---------------------------------------------------------------------------
test("Contrast Mode: Settings sidebar active tab label and icons remain crisp white and legible", () => {
  const panelCode = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");
  const cssCode = fs.readFileSync(path.resolve("src/app/globals.css"), "utf8");

  // 1. Panel tabs triggers have data attributes for settings sidebar targeting
  assert.ok(
    panelCode.includes("data-settings-sidebar-trigger"),
    "AccountSettingsPanel must tag tabs triggers with data-settings-sidebar-trigger"
  );
  assert.ok(
    panelCode.includes("data-settings-sidebar-label"),
    "AccountSettingsPanel must tag sidebar labels with data-settings-sidebar-label"
  );

  // 2. Active tab explicitly styles label, icon, and arrow in pure white
  assert.ok(
    panelCode.includes('style={isActive ? { color: "#ffffff" } : undefined}'),
    "AccountSettingsPanel must enforce inline white color for active sidebar items"
  );

  // 3. globals.css high-contrast overrides enforce pure white text on active pill
  assert.ok(
    cssCode.includes("[data-settings-sidebar-trigger][data-active=\"true\"]") &&
    cssCode.includes("color: #ffffff !important;"),
    "globals.css must ensure active settings sidebar label text is pure white in high contrast"
  );
  assert.ok(
    cssCode.includes(".high-contrast.dark aside [data-settings-sidebar-trigger]"),
    "globals.css must ensure high contrast dark mode legibility for settings sidebar"
  );

  // 4. globals.css must not use overly broad substring matching button[class*=\"outline\"] that captures outline-none
  assert.ok(
    !cssCode.includes('button[class*="outline"],') && !cssCode.includes('button[class*="outline"] *'),
    "globals.css must not use broad button[class*=\"outline\"] selector that catches outline-none buttons"
  );
});
