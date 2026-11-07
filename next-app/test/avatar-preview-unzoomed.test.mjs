import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ACCOUNT_SETTINGS_PATH = path.resolve("src/components/shared/AccountSettingsPanel.js");
const ACCOUNT_SETUP_PATH = path.resolve("src/components/shared/AccountSetupModal.js");

test("Choose Profile Avatar modal previews in AccountSettingsPanel are not zoomed in or clipped", () => {
  const code = fs.readFileSync(ACCOUNT_SETTINGS_PATH, "utf8");

  // In Choose Profile Avatar modal
  const chooseAvatarModalIdx = code.indexOf("Choose Profile Avatar");
  assert.ok(chooseAvatarModalIdx > 0, "AccountSettingsPanel must have Choose Profile Avatar modal");

  const dialogCloseIdx = code.indexOf("</Dialog>", chooseAvatarModalIdx);
  const modalSection = code.slice(chooseAvatarModalIdx, dialogCloseIdx > chooseAvatarModalIdx ? dialogCloseIdx : chooseAvatarModalIdx + 5000);

  // Must not have scale-[1.5] or scale-150 in the modal avatar preview
  assert.ok(
    !modalSection.includes("scale-[1.5]"),
    "Choose Profile Avatar modal must not scale-[1.5] avatar previews"
  );
  assert.ok(
    !modalSection.includes("scale-150"),
    "Choose Profile Avatar modal must not scale-150 avatar previews"
  );

  // Must use size-full for svg fitting
  assert.ok(
    modalSection.includes("[&_svg]:size-full"),
    "Avatar previews in modal must fit container using [&_svg]:size-full"
  );
});

test("Profile Avatar card and preview elements in settings are unzoomed", () => {
  const code = fs.readFileSync(ACCOUNT_SETTINGS_PATH, "utf8");

  // Profile Avatar card in Preferences must not use scale-[1.7]
  assert.ok(
    !code.includes("scale-[1.7]"),
    "Profile Avatar card must not zoom avatar using scale-[1.7]"
  );

  // AccountSetupModal must not zoom avatar previews
  const setupCode = fs.readFileSync(ACCOUNT_SETUP_PATH, "utf8");
  assert.ok(
    !setupCode.includes("scale-[1.5]"),
    "AccountSetupModal must not use scale-[1.5]"
  );
  assert.ok(
    !setupCode.includes("scale-[2.4]"),
    "AccountSetupModal must not use scale-[2.4]"
  );
});

test("AccountSettingsPanel primary action buttons align with dashboard standard h-9 px-4 sizing", () => {
  const code = fs.readFileSync(ACCOUNT_SETTINGS_PATH, "utf8");

  // Save Changes in Profile tab must use h-9 px-4 (aligning with dashboard pages like Departments & Stations)
  assert.ok(
    !code.includes("h-9 px-4.5"),
    "Save Changes button in settings must not use irregular h-9 px-4.5"
  );
  assert.ok(
    code.includes('className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"'),
    "Save Changes button must use standard dashboard h-9 px-4"
  );

  // Update Password must use h-9 px-4
  assert.ok(
    code.includes('className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"'),
    "Update Password and Save Security Questions must use standard dashboard h-9 px-4"
  );
});
