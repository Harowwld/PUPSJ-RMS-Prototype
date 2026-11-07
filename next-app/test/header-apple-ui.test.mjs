import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const HEADER_PATH = path.resolve("src/components/layout/Header.js");

test("Header Apple UI elevation conforms to macOS menu bar and capsule pill standards", () => {
  const code = fs.readFileSync(HEADER_PATH, "utf8");

  // 1. ProfileAvatar imported
  assert.ok(
    code.includes('import ProfileAvatar from "@/components/shared/ProfileAvatar"'),
    "Header must import ProfileAvatar"
  );

  // 2. Translucent macOS menu bar header
  assert.ok(
    code.includes("backdrop-blur-2xl") && code.includes("bg-white/80 dark:bg-zinc-950/80"),
    "Header container must use macOS 2xl backdrop blur and translucent background"
  );

  // 3. User profile capsule pill
  assert.ok(
    code.includes("rounded-full") && code.includes("group/pill"),
    "Profile pill trigger must use rounded-full capsule styling"
  );

  // 4. ProfileAvatar adoption in pill trigger and dropdown header zone
  const profileAvatarOccurrences = (code.match(/<ProfileAvatar/g) || []).length;
  assert.ok(
    profileAvatarOccurrences >= 2,
    `ProfileAvatar should be used at least twice (pill trigger & dropdown header), found ${profileAvatarOccurrences}`
  );
});
