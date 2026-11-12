import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  NOTIONISTS_AVATARS,
  NOTIONISTS_AVATAR_COUNT,
  NOTIONISTS_BOLD_COLORS,
  getNotionistAvatar,
  getNotionistAvatarSvg,
  isNotionistAvatarId,
  generateShuffledNotionist,
} from "../src/lib/notionistsAvatars.js";
import { DEFAULT_AVATARS } from "../src/lib/defaultAvatars.js";

test("1. Notionists avatar library exports exactly 19 curated presets (20 including default profile)", () => {
  assert.equal(NOTIONISTS_AVATARS.length, 19, "Must contain exactly 19 curated presets");
  assert.equal(NOTIONISTS_AVATAR_COUNT, 19);

  for (const avatar of NOTIONISTS_AVATARS) {
    assert.ok(avatar.id >= 1 && avatar.id <= 19, `Avatar ID ${avatar.id} must be between 1 and 19`);
    assert.ok(avatar.name && typeof avatar.name === "string", "Avatar must have a name");
    assert.ok(avatar.alt && avatar.alt.includes("(Notionist)"), "Avatar must have an alt tag");
    assert.ok(avatar.svgString.startsWith("<svg"), "Avatar must have valid SVG markup");
    assert.ok(avatar.svgString.includes("xmlns=\"http://www.w3.org/2000/svg\""), "SVG must have XML namespace");
    assert.ok(avatar.svgString.includes("viewBox="), "SVG must have viewBox for responsive scaling across pages");
  }
});

test("2. Notionists helper functions lookup presets deterministically", () => {
  assert.ok(isNotionistAvatarId(1));
  assert.ok(isNotionistAvatarId(19));
  assert.equal(isNotionistAvatarId(0), false);
  assert.equal(isNotionistAvatarId(20), false);
  assert.equal(isNotionistAvatarId("abc"), false);

  const first = getNotionistAvatar(1);
  assert.equal(first.name, "Orion");
  assert.ok(getNotionistAvatarSvg(1).includes("<svg"));
  assert.equal(getNotionistAvatar(99), null);
  assert.equal(getNotionistAvatarSvg(99), null);
});

test("3. generateShuffledNotionist generates unique, sanitized custom avatars", () => {
  const shuffled1 = generateShuffledNotionist();
  const shuffled2 = generateShuffledNotionist();

  assert.ok(shuffled1.seed, "Must generate a seed");
  assert.ok(shuffled1.svgString.startsWith("<svg"), "Must output valid SVG");
  assert.ok(shuffled1.svgString.includes("viewBox="), "Must contain viewBox");
  assert.ok(shuffled1.bgHex && shuffled1.bgHex.startsWith("#"), "Must set pastel background hex");

  // Must not contain unsafe script or event tags
  assert.ok(!shuffled1.svgString.includes("<script"), "Must not contain script tags");
  assert.ok(!shuffled1.svgString.includes("onload="), "Must not contain onload");
  assert.ok(!shuffled1.svgString.includes("javascript:"), "Must not contain javascript URI");

  // Must have scoped IDs
  assert.ok(shuffled1.svgString.includes("shuff-"), "Must scope internal clip or element IDs");
});

test("4. AccountSetupModal supports dual avatar types and shuffle generator", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSetupPreferences.js"), "utf8");

  // Must include Notionists and Beam options
  assert.ok(code.includes("Notionists"), "Must include Notionists option");
  assert.ok(code.includes("Beam Gradients"), "Must include Beam Gradients option");

  // Must include Shuffle button with DiceFaces03Icon
  assert.ok(code.includes("Shuffle"), "Must provide Shuffle action");
  assert.ok(code.includes("DiceFaces03Icon"), "Must render dice icon for shuffle");

  // Must submit avatarType
  assert.ok(code.includes("avatarType"), "Must pass avatarType in submission payload");

  // Must not violate unzoomed test standard
  assert.ok(!code.includes("scale-[1.5]"), "Must not scale 1.5");
  assert.ok(!code.includes("scale-[2.4]"), "Must not scale 2.4");
  assert.ok(code.includes("[&_svg]:size-full"), "Must fit preview using [&_svg]:size-full");
});

test("5. AccountSettingsPanel provides full avatar configuration: Notionists, Beam, and Shuffle generator", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSettingsPanel.js"), "utf8");

  // Must match both default and notionist filenames
  assert.ok(code.includes("notionist(\\d+)"), "Must parse notionist filename IDs");
  assert.ok(code.includes("default(\\d+)"), "Must parse classic default filename IDs");

  // Must support rendering Notionists avatars and avatarUrl
  assert.ok(code.includes("NOTIONISTS_AVATARS"), "Must import NOTIONISTS_AVATARS");
  assert.ok(code.includes("(Notionist)"), "Must label Notionist avatar in card");
  assert.ok(code.includes("<img src={avatarUrl}"), "Must fallback to avatarUrl for custom shuffled avatars");

  // Must feature dual switcher and shuffle in Settings Choose Profile Avatar dialog
  assert.ok(code.includes("Notionists Characters"), "Settings modal must feature Notionists Characters tab");
  assert.ok(code.includes("Beam Gradients"), "Settings modal must feature Beam Gradients tab");
  assert.ok(code.includes("generateShuffledNotionist"), "Settings modal must feature shuffle generation");
  assert.ok(code.includes("handleSelectAvatar"), "Settings modal must save avatar selections via handleSelectAvatar");
});

test("6. Classic Beam default avatars remain 100% intact", () => {
  assert.equal(DEFAULT_AVATARS.length, 48, "Existing default Boring Avatars must remain 48");
  assert.equal(DEFAULT_AVATARS[0].name, "Cupertino");
});

test("7. All Notionists avatars (presets and shuffled) have fully resolved <use> and url() references", () => {
  // Test all 18 presets
  for (const avatar of NOTIONISTS_AVATARS) {
    const definedIds = new Set([...avatar.svgString.matchAll(/\bid="([^"]+)"/g)].map((m) => "#" + m[1]));
    const usedHrefs = [...avatar.svgString.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const usedUrls = [...avatar.svgString.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, ""));

    assert.ok(usedHrefs.length > 0, `${avatar.name} must contain <use> references for character parts`);
    for (const href of usedHrefs) {
      assert.ok(
        definedIds.has(href),
        `In ${avatar.name}, <use href="${href}"> must reference a defined <g id="..."> or <path id="..."> (preventing background-only rendering)`
      );
    }
    for (const u of usedUrls) {
      assert.ok(
        definedIds.has(u),
        `In ${avatar.name}, url(${u}) must reference a defined element`
      );
    }
  }

  // Test 5 random shuffled avatars
  for (let i = 0; i < 5; i++) {
    const shuffled = generateShuffledNotionist();
    const definedIds = new Set([...shuffled.svgString.matchAll(/\bid="([^"]+)"/g)].map((m) => "#" + m[1]));
    const usedHrefs = [...shuffled.svgString.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const usedUrls = [...shuffled.svgString.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, ""));

    assert.ok(usedHrefs.length > 0, "Shuffled avatar must contain <use> references");
    for (const href of usedHrefs) {
      assert.ok(
        definedIds.has(href),
        `In shuffled avatar, <use href="${href}"> must reference a defined element`
      );
    }
    for (const u of usedUrls) {
      assert.ok(
        definedIds.has(u),
        `In shuffled avatar, url(${u}) must reference a defined element`
      );
    }
  }
});

test("8. Bold color palette includes ff5d8f and shuffle utilizes all 11 Notionists components", () => {
  assert.ok(NOTIONISTS_BOLD_COLORS.includes("ff5d8f"), "Bold color palette must include ff5d8f");
  const orion = getNotionistAvatar(1);
  assert.equal(orion.bgHex, "#ff5d8f", "Orion preset must use bold pink ff5d8f");

  const componentsObserved = new Set();
  for (let i = 0; i < 40; i++) {
    const s = generateShuffledNotionist(`test-comp-coverage-${i}`);
    const uses = [...s.svgString.matchAll(/href="#(?:shuff-[^-]+-)?([a-zA-Z]+)-/g)].map((m) => m[1]);
    for (const u of uses) componentsObserved.add(u);
  }

  const expectedComponents = [
    "head",
    "clothes",
    "clothesGraphic",
    "hair",
    "mouth",
    "nose",
    "eyes",
    "eyebrows",
    "beard",
    "glasses",
    "gesture",
  ];

  for (const comp of expectedComponents) {
    assert.ok(
      componentsObserved.has(comp),
      `Shuffle generator must utilize '${comp}' component across randomized shuffles`
    );
  }
});

test("9. Settings avatar modal implements top header with 2-sided layout, standard capsule tabs, shuffle palette toggle, and motion", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSettingsPanel.js"), "utf8");

  // 1. Header sits above 2-sided content and header/footer dividing lines are removed
  const modalStart = code.indexOf("<Dialog open={showAvatarModal}");
  assert.ok(modalStart > 0, "Must contain showAvatarModal dialog");
  const modalChunk = code.slice(modalStart, code.indexOf("</Dialog>", modalStart));

  const headerIdx = modalChunk.indexOf("<DialogHeader>");
  const leftPaneIdx = modalChunk.indexOf("Left");
  const rightPaneIdx = modalChunk.indexOf("Right");

  assert.ok(headerIdx > 0, "Must have DialogHeader");
  assert.ok(headerIdx < leftPaneIdx, "DialogHeader must sit above the left pane");
  assert.ok(headerIdx < rightPaneIdx, "DialogHeader must sit above the right pane");
  assert.ok(modalChunk.includes("md:flex-row"), "Content below header must be 2-sided layout on desktop");

  // Header bottom dividing line and footer top dividing line removed
  assert.ok(!modalChunk.includes("px-5 sm:px-6 pt-5 pb-4 border-b"), "Header must not have dividing border line");
  assert.ok(!modalChunk.includes("border-t border-black/[0.06]"), "Footer must not have top dividing line");

  // 2. Standard Apple Capsule Tab component used (rounded-full)
  assert.ok(modalChunk.includes('<TabsList variant="capsule"'), "Must use standard capsule TabsList (rounded-full)");
  assert.ok(modalChunk.includes('<TabsTrigger value="notionists" size="capsule"'), "Must use capsule TabsTrigger for notionists");
  assert.ok(modalChunk.includes('<TabsTrigger value="beam" size="capsule"'), "Must use capsule TabsTrigger for beam");
  assert.ok(modalChunk.includes('<TabsTrigger value="bold" size="capsule"'), "Must use capsule TabsTrigger for bold palette");
  assert.ok(modalChunk.includes('<TabsTrigger value="pastel" size="capsule"'), "Must use capsule TabsTrigger for pastel palette");

  // 3. Backdrop Palette choosing & "Shuffle Palette" toggle
  assert.ok(modalChunk.includes("Backdrop Palette"), "Must contain Backdrop Palette section");
  assert.ok(modalChunk.includes("handleSelectColorSwatch"), "Must allow choosing backdrop from swatches");
  assert.ok(modalChunk.includes("Shuffle Palette with Character"), "Must include Shuffle Palette toggle label");
  assert.ok(modalChunk.includes("shufflePaletteWithCharacter"), "Must wire shufflePaletteWithCharacter state");

  // 4. Motion applied
  assert.ok(code.includes("useAppReducedMotion"), "Must respect reduced motion");
  assert.ok(modalChunk.includes("<motion.div"), "Must use motion.div for animated viewport transitions");
  assert.ok(modalChunk.includes('layoutId="active-backdrop-swatch-ring"'), "Must use layoutId motion for smooth swatch glide");
});

test("10. Preset avatar priority, 6-col swatches, fixed palette switcher, and right side rounded container", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSettingsPanel.js"), "utf8");

  // 1. Preset avatar selection prioritizes native as-is style and color
  assert.ok(
    code.includes("bgHex: avatar.bgHex") && code.includes("setAvatarSelectedColor(avatar.bgHex)"),
    "Clicking default character must prioritize its native as-is style and set avatarSelectedColor to avatar.bgHex"
  );

  // 2. Bold and Pastel tab fixed width in UI
  assert.ok(
    code.includes('w-[124px] grid grid-cols-2') || code.includes('w-32 grid grid-cols-2'),
    "Bold and Pastel switcher must have fixed width and equal 2-column grid in UI"
  );

  // 3. Swatches distributed into 6 columns
  assert.ok(
    code.includes("grid grid-cols-6 gap-2 place-items-center"),
    "Color swatches must be distributed into 6 columns"
  );

  // 4. Right side is inside container with border radius
  assert.ok(
    code.includes("rounded-[22px]") || code.includes("rounded-2xl"),
    "Right side must be enclosed inside a container with border radius"
  );
});

test("11. Non-scrollable right pane, descriptive color names, aligned capsule tabs, and perfect circle swatches", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSettingsPanel.js"), "utf8");

  const modalStart = code.indexOf("Choose Profile Avatar");
  assert.ok(modalStart > 0, "Must contain Choose Profile Avatar modal");
  const modalChunk = code.slice(modalStart, code.indexOf("</Dialog>", modalStart));

  // 1. Right side pane must not be scrollable (overflow-hidden, no overflow-y-auto)
  const rightSideIdx = modalChunk.indexOf("Right Side: Container with border radius");
  assert.ok(rightSideIdx > 0, "Must contain right side container");
  const rightSideChunk = modalChunk.slice(rightSideIdx);

  assert.ok(!rightSideChunk.includes("overflow-y-auto"), "Right side container must not be scrollable (no overflow-y-auto)");
  assert.ok(rightSideChunk.includes("overflow-hidden"), "Right side container must use overflow-hidden");

  // 2. Descriptive color name rather than hex code
  assert.ok(
    rightSideChunk.includes("title={color.name}") && rightSideChunk.includes("aria-label={color.name}"),
    "Swatches must use descriptive color name for title and aria-label"
  );

  // 3. Aligned capsule tab with standard typography matching the left side
  assert.ok(
    rightSideChunk.includes('<TabsTrigger value="bold" size="capsule" className="text-xs">') &&
    rightSideChunk.includes('<TabsTrigger value="pastel" size="capsule" className="text-xs">'),
    "Bold and Pastel triggers must use standard capsule size and text-xs typography"
  );

  // 4. Perfect circle swatches with aligned cell wrappers and no scale distortion
  assert.ok(
    rightSideChunk.includes("aspect-square") && rightSideChunk.includes("rounded-full") && rightSideChunk.includes("shrink-0"),
    "Color swatches must be perfect circles with aspect-square, rounded-full, and shrink-0"
  );
  assert.ok(
    !rightSideChunk.includes('isCurrentColor ? "scale-110"'),
    "Active swatch must not use scale-110 distortion which breaks spacing alignment"
  );
});

test("12. Avatar modal includes Custom tile saving shuffled applied avatar, removes 1 preset for clean grid, and checkmark is only visible on current applied avatar", () => {
  const code = fs.readFileSync(path.resolve("src/components/shared/AccountSettingsPanel.js"), "utf8");

  // 1. notionistChoices and avatarChoices have Default + Custom + sliced presets
  assert.ok(
    code.includes('id: "custom"') && code.includes('name: "Custom"'),
    "Must define Custom avatar tile in avatar choices"
  );
  assert.ok(
    code.includes("NOTIONISTS_AVATARS.slice(0, 18)"),
    "Must slice NOTIONISTS_AVATARS to 18 so Default (1) + Custom (1) + Presets (18) = exactly 20 items (divisible by 4)"
  );
  assert.ok(
    code.includes("DEFAULT_AVATARS.slice(0, 46)"),
    "Must slice DEFAULT_AVATARS to 46 so Default (1) + Custom (1) + Presets (46) = exactly 48 items (divisible by 4)"
  );

  // 2. Applied avatar detection and checkmark separation
  assert.ok(
    code.includes("appliedAvatarInfo"),
    "Must compute appliedAvatarInfo for the active user"
  );
  assert.ok(
    code.includes("isCurrentApplied") && code.includes("isStaged"),
    "Must decouple isCurrentApplied from isStaged so picking does not show checkmark"
  );
  assert.ok(
    code.includes("{isCurrentApplied && (") && code.includes('<Tick01Icon size="0.65em" />'),
    "Checkmark must only appear on the currently applied avatar (isCurrentApplied), not when picking"
  );

  // 3. Custom avatar persistence and staging
  assert.ok(
    code.includes("pupsj_custom_avatar"),
    "Must persist custom shuffled avatar to localStorage"
  );
});




