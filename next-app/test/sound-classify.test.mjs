import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyElement,
  KOBRA_UI_PATCH,
  SOUND_NAMES,
} from "../src/lib/soundPatch.js";
import {
  DEFAULT_SOUND_CATEGORIES,
  normalizeSoundCategories,
  isValidSoundCategoriesPreference,
  CUE_TO_CATEGORY,
} from "../src/lib/soundPreferences.js";

function createMockElement({
  dataset = {},
  attributes = {},
  checked = false,
  matchedSelectors = [],
  parentElement = null,
} = {}) {
  return {
    dataset,
    checked,
    parentElement,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : null;
    },
    matches(selectorString) {
      const selectors = selectorString.split(",").map((s) => s.trim());
      return selectors.some((s) => matchedSelectors.includes(s));
    },
  };
}

test("KOBRA_UI_PATCH contains all 19 expected sound cues mapped to categories", () => {
  assert.equal(SOUND_NAMES.length, 19);
  for (const name of SOUND_NAMES) {
    assert.ok(KOBRA_UI_PATCH.sounds[name], `Missing sound definition for ${name}`);
    assert.ok(CUE_TO_CATEGORY[name], `Missing category mapping for ${name}`);
  }
});

test("classifyElement maps standard buttons and ghost variants to tap cue", () => {
  const primaryBtn = createMockElement({
    dataset: { slot: "button", variant: "default" },
  });
  assert.deepEqual(classifyElement(primaryBtn), { sound: "tap", velocity: 1 });

  const ghostBtn = createMockElement({
    dataset: { slot: "button", variant: "ghost" },
  });
  assert.deepEqual(classifyElement(ghostBtn), { sound: "tap", velocity: 0.78 });
});

test("classifyElement maps destructive/danger buttons to heavy destructive cue", () => {
  const destructiveBtn = createMockElement({
    dataset: { slot: "button", variant: "destructive" },
  });
  assert.deepEqual(classifyElement(destructiveBtn), { sound: "destructive" });

  const dangerBtn = createMockElement({
    dataset: { slot: "button", variant: "danger" },
  });
  assert.deepEqual(classifyElement(dangerBtn), { sound: "destructive" });
});

test("classifyElement maps switches and toggles to directional toggleOn/toggleOff", () => {
  const uncheckedSwitch = createMockElement({
    dataset: { slot: "switch" },
    attributes: { "aria-checked": "false" },
  });
  assert.deepEqual(classifyElement(uncheckedSwitch), { sound: "toggleOn" });

  const checkedSwitch = createMockElement({
    dataset: { slot: "switch" },
    attributes: { "aria-checked": "true" },
  });
  assert.deepEqual(classifyElement(checkedSwitch), { sound: "toggleOff" });
});

test("classifyElement maps dialog/popover triggers and close slots to open/close cues", () => {
  const closedTrigger = createMockElement({
    dataset: { slot: "dialog-trigger" },
    attributes: { "aria-expanded": "false" },
  });
  assert.deepEqual(classifyElement(closedTrigger), { sound: "open" });

  const openTrigger = createMockElement({
    dataset: { slot: "dialog-trigger" },
    attributes: { "aria-expanded": "true" },
  });
  assert.deepEqual(classifyElement(openTrigger), { sound: "close" });

  const closeBtn = createMockElement({
    dataset: { slot: "sheet-close" },
  });
  assert.deepEqual(classifyElement(closeBtn), { sound: "close" });
});

test("classifyElement honors explicit data-sound overrides and data-sound='none'", () => {
  const copyBtn = createMockElement({
    dataset: { slot: "button", sound: "copy" },
  });
  assert.deepEqual(classifyElement(copyBtn), { sound: "copy" });

  const silentBtn = createMockElement({
    dataset: { slot: "button", sound: "none" },
  });
  assert.deepEqual(classifyElement(silentBtn), { sound: "none" });
});

test("normalizeSoundCategories and validator enforce canonical 6 categories", () => {
  const partial = normalizeSoundCategories({ presses: false, notifications: false });
  assert.equal(partial.presses, false);
  assert.equal(partial.notifications, false);
  assert.equal(partial.toggles, true);
  assert.equal(partial.surfaces, true);
  assert.equal(partial.values, true);
  assert.equal(partial.outcomes, true);

  assert.equal(isValidSoundCategoriesPreference({ presses: false }), true);
  assert.equal(isValidSoundCategoriesPreference(DEFAULT_SOUND_CATEGORIES), true);
  assert.equal(isValidSoundCategoriesPreference({ unknownCat: true }), false);
  assert.equal(isValidSoundCategoriesPreference({ presses: "yes" }), false);
  assert.equal(isValidSoundCategoriesPreference(null), false);
});
