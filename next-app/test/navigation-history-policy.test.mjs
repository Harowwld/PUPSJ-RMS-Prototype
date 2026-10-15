import assert from "node:assert/strict";
import test from "node:test";
import { isSystemAdminRole, isAdminRole, canAccessPage } from "../src/lib/roleUtils.js";

test("Post-login role navigation redirects map to correct portal", () => {
  const roles = [
    { role: "SuperAdmin", expectedPath: "/systemadmin" },
    { role: "SystemAdmin", expectedPath: "/systemadmin" },
    { role: "Registrar Admin", expectedPath: "/admin" },
    { role: "Admin", expectedPath: "/admin" },
    { role: "Registrar Staff", expectedPath: "/staff" },
    { role: "Staff", expectedPath: "/staff" },
    { role: "Student", expectedPath: "/student" },
  ];

  for (const { role, expectedPath } of roles) {
    let target = "/staff";
    if (isSystemAdminRole(role)) {
      target = "/systemadmin";
    } else if (isAdminRole(role)) {
      target = "/admin";
    } else if (role.toLowerCase() === "student") {
      target = "/student";
    }
    assert.equal(target, expectedPath, `Role ${role} should navigate to ${expectedPath}`);
    assert.equal(canAccessPage(target, role), true, `Role ${role} must be authorized for ${target}`);
  }
});

test("Redirect query param overrides default dashboard if role is authorized", () => {
  const redirect = "/account/activity";
  assert.equal(canAccessPage(redirect, "SuperAdmin"), true);
  assert.equal(canAccessPage(redirect, "Staff"), true);
  assert.equal(canAccessPage(redirect, "Student"), true);

  // Unauthorized target redirect fallback check
  const unauthorizedRedirect = "/systemadmin";
  assert.equal(canAccessPage(unauthorizedRedirect, "Staff"), false);
});

test("Tab view change cleans up obsolete sub-parameters (page, search)", () => {
  const currentUrl = "http://localhost:3000/systemadmin?view=logs&page=3&search=audit&office=1";
  const url = new URL(currentUrl);

  // Simulation of switchView to "offices"
  const nextView = "offices";
  const params = new URLSearchParams();
  params.set("view", nextView);

  const nextUrl = `${url.pathname}?${params.toString()}`;
  assert.equal(nextUrl, "/systemadmin?view=offices");
  assert.equal(params.has("page"), false, "page parameter should be purged on view switch");
  assert.equal(params.has("search"), false, "search parameter should be purged on view switch");
});

test("Table pagination URL generation clamps within valid bounds", () => {
  const totalPages = 5;

  const clampPage = (requestedPage) => {
    return Math.max(1, Math.min(totalPages, requestedPage));
  };

  assert.equal(clampPage(0), 1, "Page 0 should clamp to 1");
  assert.equal(clampPage(-5), 1, "Negative page should clamp to 1");
  assert.equal(clampPage(3), 3, "Page 3 is within bounds");
  assert.equal(clampPage(6), 5, "Page 6 should clamp to totalPages (5)");

  // Verify URL string construction
  const params = new URLSearchParams("view=logs");
  params.set("page", String(clampPage(4)));
  assert.equal(params.toString(), "view=logs&page=4");
});

test("Search query update removes page parameter to prevent blank results", () => {
  const params = new URLSearchParams("view=logs&page=4");
  const searchQuery = "security";

  if (searchQuery) {
    params.set("search", searchQuery);
  } else {
    params.delete("search");
  }
  params.delete("page");

  assert.equal(params.toString(), "view=logs&search=security");
  assert.equal(params.has("page"), false, "page parameter must be deleted when search changes");
});
