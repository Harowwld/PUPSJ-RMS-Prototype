import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SETTINGS_PANEL_PATH = path.resolve("src/components/shared/AccountSettingsPanel.js");

test("AccountSettingsPanel inner sidebar matches outer sidebar design architecture", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  // Grid column alignment for 240px Apple sidebar
  assert.ok(
    code.includes("lg:grid-cols-[240px_1fr]"),
    "AccountSettingsPanel must use lg:grid-cols-[240px_1fr] matching outer sidebar width"
  );

  // Section header inside sidebar
  assert.ok(
    code.includes("tracking-[0.05em] uppercase") && code.includes("Settings"),
    "AccountSettingsPanel sidebar must include standardized uppercase section header"
  );

  // Navigation item geometry: 40px height, rounded-xl, 13.5px font-medium
  assert.ok(
    code.includes("h-[40px] px-3.5 rounded-xl text-[13.5px] font-medium"),
    "AccountSettingsPanel tabs triggers must adopt outer sidebar item geometry and typography"
  );

  // Sidebar container does not contain the old vertical avatar stack
  const sidebarSection = code.substring(
    code.indexOf("{/* Sidebar Navigation */}"),
    code.indexOf("{/* Content Area */}")
  );

  assert.ok(
    !sidebarSection.includes("relative w-20 h-20"),
    "Inner sidebar must not contain the 80px avatar"
  );
  assert.ok(
    !sidebarSection.includes("{fname} {lname}"),
    "Inner sidebar must not contain the user name block"
  );
});

test("AccountSettingsPanel relocates the name and identity group inside the Profile tab with social media layout", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  const profileSection = code.substring(
    code.indexOf('<TabsContent value="profile"'),
    code.indexOf('<TabsContent value="security"')
  );

  // Identity Hero Card exists inside Profile tab
  assert.ok(
    profileSection.includes("{/* Relocated Identity Hero Card */}"),
    "Profile tab must contain the relocated Identity Hero Card"
  );

  // Contains Apple Profile Cover banner
  assert.ok(
    profileSection.includes("<AppleProfileCover />"),
    "Profile tab must include AppleProfileCover dynamic wallpaper banner"
  );

  // Contains overlapping circular avatar
  assert.ok(
    profileSection.includes("shrink-0 rounded-full") && profileSection.includes("-mt-12"),
    "Profile tab must contain the overlapping circular avatar"
  );

  // Contains name
  assert.ok(
    profileSection.includes("{fname} {lname}"),
    "Profile tab must display the user's full name"
  );

  // Contains email/student number
  assert.ok(
    profileSection.includes("studentNo") && profileSection.includes("authUser?.email"),
    "Profile tab must display the account identifier (studentNo or email)"
  );

  // Contains role badge
  assert.ok(
    profileSection.includes("getOfficeRoleLabel"),
    "Profile tab must display the institutional role badge"
  );

  // Contains social metadata cards
  assert.ok(
    profileSection.includes("PUP San Juan") && profileSection.includes("2FA Security"),
    "Profile tab must include social metadata cards strip"
  );

  // Institutional SSO Verified badge is removed
  assert.ok(
    !profileSection.includes("Institutional SSO Verified"),
    "Profile tab must not display Institutional SSO Verified badge"
  );
});

test("AppleProfileCover dynamically updates WebGL background and hides button until hover", () => {
  const coverCode = fs.readFileSync(path.resolve("src/components/shared/AppleProfileCover.js"), "utf8");

  // WebGL MeshGradient key={activeId} and options={{ colors: ... }}
  assert.ok(
    coverCode.includes("key={activeId}"),
    "AppleProfileCover must key MeshGradient with activeId for immediate remount on theme change"
  );
  assert.ok(
    coverCode.includes("options={{") && coverCode.includes("colors: currentPreset.colors"),
    "AppleProfileCover must pass colors through options to MeshGradient"
  );

  // Top-left theme name badge is removed
  assert.ok(
    !coverCode.includes("<SparklesIcon"),
    "AppleProfileCover must remove the top-left theme name badge and icon"
  );

  // Change Cover button is hidden until hover
  assert.ok(
    coverCode.includes("opacity-0") && coverCode.includes("group-hover:opacity-100"),
    "Change Cover button must be hidden until the background is hovered"
  );

  // Change Cover button is text-only without leading icon
  const buttonSnippet = coverCode.substring(
    coverCode.indexOf('onClick={() => setPickerOpen(true)}'),
    coverCode.indexOf('</Button>')
  );
  assert.ok(
    !buttonSnippet.includes("<PaintBoardIcon"),
    "Change Cover button must be text-only without a leading icon"
  );

  // Modal follows clean frameless design: no header icon, no line separator, no helper string
  assert.ok(
    !coverCode.includes("<PaintBoardIcon"),
    "Modal dialog header must not have icons"
  );
  assert.ok(
    !coverCode.includes("border-b border-black") && !coverCode.includes("border-t border-black"),
    "Modal dialog must not have line separators in header or footer"
  );
  assert.ok(
    !coverCode.includes("Select a theme to immediately customize your profile banner"),
    "Modal footer must not contain helper banner text"
  );

  // Compact themes to reduce modal height
  assert.ok(
    coverCode.includes("size-11") && coverCode.includes("p-2.5"),
    "Modal theme cards must use compact padding and swatches to reduce height"
  );

  // Swatch preview uses circle geometry
  assert.ok(
    coverCode.includes("rounded-full") && coverCode.includes("preset.cssGradient"),
    "Theme background modal preview swatch must use circular (rounded-full) preview"
  );
});

test("APPLE_WALLPAPER_PRESETS defines 8 curated institutional themes without macOS naming", () => {
  const constantsCode = fs.readFileSync(path.resolve("src/lib/constants.js"), "utf8");
  assert.ok(
    constantsCode.includes("APPLE_WALLPAPER_PRESETS = ["),
    "constants.js must export APPLE_WALLPAPER_PRESETS"
  );
  assert.ok(
    constantsCode.includes("getAppleWallpaperPreset"),
    "constants.js must export getAppleWallpaperPreset helper"
  );
  assert.ok(
    constantsCode.includes("Crimson Dawn") && constantsCode.includes("Golden Horizon") && constantsCode.includes("PUP Heritage"),
    "APPLE_WALLPAPER_PRESETS must include distinct institutional and ambient themes"
  );
  assert.ok(
    !constantsCode.includes("macOS Sequoia") && !constantsCode.includes("macOS Sonoma"),
    "APPLE_WALLPAPER_PRESETS must not use 'macOS' in visible preset names"
  );
});

test("AccountSettingsPanel implements 4x1 Bento grid, in-situ avatar picker, tactile copy, and Apple Inset Grouped lists", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  const profileSection = code.substring(
    code.indexOf('<TabsContent value="profile"'),
    code.indexOf('<TabsContent value="security"')
  );

  // 1. 4x1 Bento grid for metadata cards
  assert.ok(
    profileSection.includes("lg:grid-cols-4"),
    "Profile metadata strip must use 4x1 grid layout (lg:grid-cols-4) on desktop"
  );

  // 2. In-situ Apple Avatar Picker Dialog trigger
  assert.ok(
    profileSection.includes("onClick={() => setShowAvatarModal(true)}"),
    "Avatar camera pill must open in-situ Apple Avatar Picker Dialog directly"
  );
  assert.ok(
    code.includes("<Dialog open={showAvatarModal}"),
    "AccountSettingsPanel must render global Dialog open={showAvatarModal} accessible across tabs"
  );
  assert.ok(
    code.includes("Choose Profile Avatar"),
    "Avatar picker dialog must contain Choose Profile Avatar title"
  );

  // 3. Tactile Student Number copy feedback
  assert.ok(
    profileSection.includes("handleCopyStudentNo"),
    "Student Number button must call handleCopyStudentNo"
  );
  assert.ok(
    profileSection.includes('copiedItem === "studentNo"') && profileSection.includes("<Tick01Icon"),
    "Student Number copy button must morph into Tick01Icon when copied"
  );

  // 4. macOS Inset Grouped lists
  assert.ok(
    profileSection.includes("rounded-2xl border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.06]"),
    "Profile form must use Apple Inset Grouped list with rounded-2xl hairline border and divided rows"
  );
  assert.ok(
    !profileSection.includes("merged-container"),
    "Profile tab must replace legacy merged-container with Apple Inset Grouped lists"
  );

  // 5. Dynamic Dirty state tracking and in-form Save & Discard Actions
  assert.ok(
    code.includes("const isDirty ="),
    "AccountSettingsPanel must compute real-time isDirty state tracking"
  );
  assert.ok(
    profileSection.includes("Unsaved profile changes") && profileSection.includes("handleDiscardProfileChanges"),
    "Profile tab must render in-form Discard and Save buttons with real-time dirty state tracking when isDirty"
  );

  // 6. Avatar picker modal width, visible name cards, and default no-avatar profile
  assert.ok(
    code.includes("max-w-md sm:max-w-lg") && (code.includes("grid-cols-3 sm:grid-cols-4") || code.includes("sm:grid-cols-4")),
    "Avatar picker modal must use compact reduced width (max-w-md sm:max-w-lg) with responsive 4-column grid"
  );
  assert.ok(
    code.includes("size-10 sm:size-11"),
    "Avatar picker must use reduced circular avatar dimensions"
  );
  assert.ok(
    code.includes("{avatar.name}") && !code.includes("Avatar {avatar.id}"),
    "Avatar picker modal must display clean avatar name without Avatar ID subtitle"
  );
  assert.ok(
    code.includes("avatarChoices") && code.includes('name: "Default"') && code.includes("id: 0"),
    "Avatar picker must feature Default profile (no avatar) as first choice replacing 1 illustrated avatar"
  );
  assert.ok(
    code.includes("avatar.id === 0") && code.includes("<UserIcon"),
    "Avatar picker must render default user profile icon for avatar 0"
  );
  assert.ok(
    profileSection.includes("PUPSJ Records Keeping System"),
    "Profile bio statement must refer to PUPSJ Records Keeping System"
  );
});

test("AccountSettingsPanel establishes dedicated Two-Factor Auth sidebar tab and decouples from Security tab", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  // 1. Sidebar tab registry includes two-factor with SmartPhone01Icon
  assert.ok(
    code.includes('id: "two-factor"') && code.includes('label: "Two-Factor Auth"') && code.includes('icon: "SmartPhone01Icon"'),
    "AccountSettingsPanel sidebar must include dedicated Two-Factor Auth tab"
  );

  // 2. Active tab resolution supports two-factor and aliased 2fa query param
  assert.ok(
    code.includes('validTabs = ["profile", "security", "two-factor", "preferences", "activity"]') ||
    code.includes('"two-factor"'),
    "AccountSettingsPanel must register two-factor in validTabs"
  );
  assert.ok(
    code.includes('tab === "2fa" ? "two-factor" : tab'),
    "AccountSettingsPanel must resolve 2fa alias to two-factor"
  );

  // 3. Profile Card 4 links directly to two-factor tab
  const profileSection = code.substring(
    code.indexOf('<TabsContent value="profile"'),
    code.indexOf('<TabsContent value="security"')
  );
  assert.ok(
    profileSection.includes('onClick={() => handleTabChange("two-factor")}'),
    "Profile Card 4 must link directly to two-factor tab"
  );
  assert.ok(
    profileSection.includes("Manage 2FA credentials"),
    "Profile Card 4 action button must read 'Manage 2FA credentials'"
  );

  // 4. Security tab contains Password Rotation and Security Questions only
  const securitySection = code.substring(
    code.indexOf('<TabsContent value="security"'),
    code.indexOf('<TabsContent value="two-factor"')
  );
  assert.ok(
    securitySection.includes("Password") && securitySection.includes("Security Questions"),
    "Security tab must contain Password and Security Questions"
  );
  assert.ok(
    !securitySection.includes("Two-Factor Authentication") && !securitySection.includes("Authenticator App"),
    "Security tab must not contain 2FA or Authenticator App components"
  );
  assert.ok(
    !securitySection.includes("Backup Recovery Codes"),
    "Security tab must not contain Backup Recovery Codes"
  );

  // 5. Dedicated Two-Factor tab contains 2FA header, Authenticator App, and Recovery Codes
  const twoFactorSection = code.substring(
    code.indexOf('<TabsContent value="two-factor"'),
    code.indexOf('<TabsContent value="preferences"')
  );
  assert.ok(
    twoFactorSection.includes("Two-Factor Authentication"),
    "Two-Factor tab must contain Two-Factor Authentication header"
  );
  assert.ok(
    twoFactorSection.includes("2FA Active") && twoFactorSection.includes("2FA Not Configured"),
    "Two-Factor tab must display live status badge"
  );
  assert.ok(
    twoFactorSection.includes("Authenticator App"),
    "Two-Factor tab must contain Authenticator App method"
  );
  assert.ok(
    twoFactorSection.includes("Backup Recovery Codes"),
    "Two-Factor tab must contain Backup Recovery Codes method"
  );

  // 6. Security Tab Bento Strip & Password Inset Grouped List
  assert.ok(
    securitySection.includes("Password Strength") && securitySection.includes("pwStrength"),
    "Security tab must feature an interactive password strength indicator"
  );
  assert.ok(
    securitySection.includes("Current Password") && securitySection.includes("New Password") && securitySection.includes("Confirm Password"),
    "Security tab must structure password fields in an Apple Inset Grouped list"
  );

  // 7. Two-Factor Tab Bento Strip & Tactile Copy for Secret Keys
  assert.ok(
    twoFactorSection.includes("handleTactileCopy") && twoFactorSection.includes("totpSecret"),
    "Two-Factor setup flow must provide tactile 1-click copy feedback for secret key"
  );
  assert.ok(
    twoFactorSection.includes("Apple Passwords") && twoFactorSection.includes("Google Authenticator"),
    "Two-Factor tab must render supported authenticator app pill tags"
  );
});

test("AccountSettingsPanel Preferences and Accessibility tabs implement streamlined Apple HIG layout, default home view, and dedicated accommodations", () => {
  const code = fs.readFileSync(SETTINGS_PANEL_PATH, "utf8");

  // 1. Sidebar includes both Preferences and Accessibility tabs
  assert.ok(
    code.includes('id: "preferences"') && code.includes('id: "accessibility"') && code.includes('GlassesIcon'),
    "AccountSettingsPanel sidebar must include dedicated Preferences and Accessibility tabs"
  );

  const preferencesSection = code.substring(
    code.indexOf('<TabsContent value="preferences"'),
    code.indexOf('<TabsContent value="accessibility"')
  );

  const accessibilitySection = code.substring(
    code.indexOf('<TabsContent value="accessibility"'),
    code.includes('<TabsContent value="activity"')
      ? code.indexOf('<TabsContent value="activity"')
      : code.indexOf('</Tabs>')
  );

  const securitySection = code.substring(
    code.indexOf('<TabsContent value="security"'),
    code.indexOf('<TabsContent value="two-factor"')
  );

  const twoFactorSection = code.substring(
    code.indexOf('<TabsContent value="two-factor"'),
    code.indexOf('<TabsContent value="preferences"')
  );

  // 2. Redundant summary strips removed from Security, 2FA, and Preferences
  assert.ok(
    !securitySection.includes("Bento Strip for Security") && !securitySection.includes("Credential Architecture"),
    "Security tab must not contain redundant vanity summary strip"
  );
  assert.ok(
    !twoFactorSection.includes("Bento Strip for Two-Factor") && !twoFactorSection.includes("Security Posture"),
    "Two-Factor tab must not contain redundant vanity summary strip"
  );
  assert.ok(
    !preferencesSection.includes("Bento Strip for Preferences"),
    "Preferences tab must not contain redundant vanity summary strip"
  );

  // 3. Default Home View section & role-aware options with Apple Select dropdown in Preferences
  assert.ok(
    preferencesSection.includes("Default Home View") && preferencesSection.includes("availableHomeViews.map"),
    "Preferences tab must contain Default Home View section rendering availableHomeViews"
  );
  assert.ok(
    preferencesSection.includes("<Select") && code.includes('handlePreferenceChange("default_home_view"'),
    "Preferences tab must render a Select dropdown for default_home_view changes"
  );

  // 4. Display Name Format section & live previews with Apple Select dropdown in Preferences
  assert.ok(
    preferencesSection.includes("Display Name Format") && preferencesSection.includes("displayNameFormats.map"),
    "Preferences tab must contain Display Name Format section rendering displayNameFormats"
  );
  assert.ok(
    code.includes('handlePreferenceChange("display_name_format"'),
    "Preferences tab must handle display_name_format changes"
  );

  // 5. Table Row Density and Profile Avatar in Preferences
  assert.ok(
    preferencesSection.includes("Table Row Density") && preferencesSection.includes("TABLE_DENSITY_OPTIONS.map"),
    "Preferences tab must contain Table Row Density card selection buttons"
  );
  assert.ok(
    code.includes("handleTableDensityChange"),
    "Preferences tab must handle table density card selection"
  );
  assert.ok(
    preferencesSection.includes("Profile Avatar") && preferencesSection.includes("Choose Avatar..."),
    "Preferences tab must include Profile Avatar section with Choose Avatar button triggering modal"
  );

  // 6. Text & Font Size 5-step Segmented Control in Accessibility
  assert.ok(
    accessibilitySection.includes("Text & Font Size") && accessibilitySection.includes("FONT_SIZE_OPTIONS.map"),
    "Accessibility tab must contain Text & Font Size segmented control"
  );
  assert.ok(
    code.includes("handleFontSizePreferenceChange"),
    "Accessibility tab must handle font size changes"
  );

  // 7. Interface Layout Zoom in Accessibility
  assert.ok(
    accessibilitySection.includes("Interface Layout Zoom") && accessibilitySection.includes("ZOOM_PERCENTAGES.map"),
    "Accessibility tab must contain Interface Layout Zoom segmented selector"
  );

  // 8. Accessibility toggles (High Contrast, Reduce Motion, and Interactive Pointer Cursor) in Accessibility
  assert.ok(
    accessibilitySection.includes("High Contrast") && accessibilitySection.includes("Reduce Motion") && accessibilitySection.includes("Interactive Pointer Cursor"),
    "Accessibility tab must contain accessibility toggles for High Contrast, Reduce Motion, and Interactive Pointer Cursor"
  );
  assert.ok(
    code.includes('handleAccessibilityToggle("pointer_cursor"'),
    "Accessibility tab must support toggling interactive pointer cursor"
  );

  // 8. Verify API and staffRepo support for preferences
  const routeCode = fs.readFileSync(path.resolve("src/app/api/auth/preferences/route.js"), "utf8");
  assert.ok(
    routeCode.includes("default_home_view:") && routeCode.includes("display_name_format:") &&
    routeCode.includes("font_size:") && routeCode.includes("pointer_cursor:"),
    "Preferences API route must validate default_home_view, display_name_format, font_size, and pointer_cursor"
  );

  const repoCode = fs.readFileSync(path.resolve("src/lib/staffRepo.js"), "utf8");
  assert.ok(
    repoCode.includes("getStaffDisplayName") && repoCode.includes("display_name_format") &&
    repoCode.includes("font_size") && repoCode.includes("pointer_cursor"),
    "staffRepo.js must implement getStaffDisplayName and defaultPreferences with font_size and pointer_cursor"
  );

  // 9. Verify globals.css defines font size scale and pointer cursor rules
  const cssCode = fs.readFileSync(path.resolve("src/app/globals.css"), "utf8");
  assert.ok(
    cssCode.includes('html[data-font-size="smaller"]') &&
    cssCode.includes('html[data-font-size="small"]') &&
    cssCode.includes('html[data-font-size="default"]') &&
    cssCode.includes('html[data-font-size="large"]') &&
    cssCode.includes('html[data-font-size="larger"]'),
    "globals.css must define dynamic typography scaling for smaller, small, default, large, larger"
  );
  assert.ok(
    cssCode.includes(".pointer-cursor button") && cssCode.includes("cursor: pointer !important;"),
    "globals.css must define interactive pointer cursor rules"
  );
  assert.ok(
    cssCode.includes('html[data-pointer-cursor="false"]') && cssCode.includes("cursor: default !important;"),
    "globals.css must enforce cursor: default when pointer cursor is disabled"
  );
  assert.ok(
    cssCode.includes('html[data-pointer-cursor="false"] input') && cssCode.includes("cursor: text !important;"),
    "globals.css must preserve cursor: text on text inputs when pointer cursor is disabled"
  );
  assert.ok(
    cssCode.includes(".rms-sidebar") && cssCode.includes("--app-font-scale"),
    "globals.css must define sidebar typography scaling linked to --app-font-scale"
  );

  // 10. Verify card active styling (black border line and grayish bg) and dotless badges
  assert.ok(
    preferencesSection.includes("border-gray-950 dark:border-white") &&
    preferencesSection.includes("bg-gray-100/80 dark:bg-zinc-800"),
    "Preferences choice cards must use the black border line and grayish bg for active state"
  );
  assert.ok(
    !code.includes("Password Protected</span>\n                      <span className=\"size-1.5") &&
    !code.includes("animate-pulse\" />\n                      Password Protected"),
    "Badges must not use pulsing dots"
  );

  // 11. Verify Department Features and Catalog Credentials cards adopt the black border active style
  const moduleCode = fs.readFileSync(path.resolve("src/components/systemadmin/ModuleConfigTab.js"), "utf8");
  assert.ok(
    moduleCode.includes("border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800"),
    "Department Features cards must adopt the black border and grayish bg active styling"
  );

  const catalogCode = fs.readFileSync(path.resolve("src/components/systemadmin/LandingCatalogCmsView.js"), "utf8");
  assert.ok(
    catalogCode.includes("border-gray-950 dark:border-white bg-gray-100/80 dark:bg-zinc-800"),
    "Catalog Credentials cards must adopt the black border and grayish bg active styling"
  );
});
