import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPage } from "../src/lib/roleUtils.js";

const cases = [
  ["logged-out student portal", "/student", null, { authenticated: false }, true],
  ["student portal for Student", "/student", "Student", undefined, true],
  ["student portal rejects Staff", "/student", "Staff", undefined, false],
  ["staff accepts Staff", "/staff", "Staff", undefined, true],
  ["staff accepts office Admin", "/staff", "Admin", undefined, true],
  ["staff rejects SystemAdmin", "/staff", "SystemAdmin", undefined, false],
  ["admin accepts office Admin", "/admin", "Admin", undefined, true],
  ["admin rejects SystemAdmin", "/admin", "SystemAdmin", undefined, false],
  ["systemadmin accepts SuperAdmin", "/systemadmin", "SuperAdmin", undefined, true],
  ["systemadmin rejects Admin", "/systemadmin", "Admin", undefined, false],
  ["account accepts authenticated Student", "/account", "Student", undefined, true],
  ["account rejects unauthenticated request", "/account", null, { authenticated: false }, false],
];

for (const [name, pathname, role, options, expected] of cases) {
  test(name, () => {
    assert.equal(canAccessPage(pathname, role, options), expected);
  });
}
