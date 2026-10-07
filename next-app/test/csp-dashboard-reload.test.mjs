import assert from "node:assert/strict";
import test from "node:test";
import { getSessionCookieName, signSessionToken } from "../src/lib/jwt.js";

// Run against the built app: CSP_TEST_URL=http://localhost:3000 node --env-file=.env --test test/csp-dashboard-reload.test.mjs
const appUrl = process.env.CSP_TEST_URL;

for (const [path, role] of [["/systemadmin", "SuperAdmin"], ["/admin", "Admin"], ["/staff", "Staff"]]) {
  test(`${path} reload authorizes every script with a fresh CSP nonce`, { skip: !appUrl }, async () => {
    const token = await signSessionToken({ sub: "csp-render-check", role, username: "CSP render check" });
    const nonces = [];
    for (let request = 0; request < 2; request++) {
      const response = await fetch(new URL(path, appUrl), {
        headers: { Cookie: `${getSessionCookieName()}=${token}` },
        redirect: "manual",
      });
      assert.equal(response.status, 200, "Dashboard must render instead of redirecting");
      const policy = response.headers.get("content-security-policy") || "";
      const nonce = policy.match(/script-src[^;]*'nonce-([^']+)'/)?.[1];
      assert.ok(nonce, "Response CSP must contain a script nonce");
      assert.match(policy, /'strict-dynamic'/);
      assert.doesNotMatch(policy, /'unsafe-inline'/);
      const scripts = [...(await response.text()).matchAll(/<script\b([^>]*)>/g)];
      assert.ok(scripts.length > 1, "Must check the dashboard's framework and inline scripts");
      for (const [, attributes] of scripts) {
        assert.equal(attributes.match(/\bnonce="([^"]+)"/)?.[1], nonce, "Every rendered script must match the response CSP");
      }
      nonces.push(nonce);
    }
    assert.notEqual(nonces[0], nonces[1], "Reload must generate a new nonce");
  });
}
