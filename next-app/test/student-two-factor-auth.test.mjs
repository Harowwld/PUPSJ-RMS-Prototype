import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadRouteHandler(relativePath, method, bindings) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const code = source
    .replace(/^import\s+[\s\S]*?\s+from\s+["'][^"']+["'];\s*/gm, "")
    .replace(/^export /gm, "");
  return new Function(...Object.keys(bindings), `${code}\nreturn ${method};`)(...Object.values(bindings));
}

const student = {
  id: 42,
  accountId: 42,
  principalType: "student",
  role: "Student",
  email: "student@example.test",
  studentNo: "2024-00042-SJ-0",
  fname: "Test",
  lname: "Student",
};

const nextResponse = { json: (body, init) => Response.json(body, init) };

function postRequest(url, body) {
  return new Request(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

test("student 2FA settings can read status, configure an authenticator, and generate backup codes", async () => {
  const calls = [];
  let enabled = false;
  let storedSecret = null;
  const bindings = {
    NextResponse: nextResponse,
    requireAuth: async () => ({ user: student }),
    createAuthErrorResponse: (error, status) => Response.json({ ok: false, error }, { status }),
    getAccountSecurity: async (type, id) => {
      calls.push(["get", type, id]);
      return { totp_enabled: enabled, totp_secret: storedSecret };
    },
    getAccountRecoveryCodesCount: async (type, id) => {
      calls.push(["count", type, id]);
      return 0;
    },
    updateAccountTOTPSecret: async (type, id, secret) => { calls.push(["secret", type, id, secret]); storedSecret = secret; },
    updateAccountTOTPEnabled: async (type, id, value) => { calls.push(["enabled", type, id, value]); enabled = value; },
    setAccountSerialKey: async (type, id, key) => calls.push(["serial", type, id, key]),
    generateAccountRecoveryCodes: async (type, id) => {
      calls.push(["generate-codes", type, id]);
      return ["A1B2C3D4", "E5F6A7B8"];
    },
    writeAuditLog: async () => {},
    decryptSecret: () => "decoded-secret",
    encryptSecret: () => "encrypted-secret",
    generateQRCode: async () => "data:image/png;base64,qr",
    generateTOTPSecret: () => ({ secret: "new-secret", otpauthUrl: "otpauth://totp/test" }),
    isValidToken: (token) => /^\d{6}$/.test(token),
    verifyTOTP: () => true,
    clearAccountTOTP: async () => {},
    deleteAccountRecoveryCodes: async () => {},
  };

  const get = await loadRouteHandler("../src/app/api/auth/totp/route.js", "GET", bindings);
  const statusResponse = await get(new Request("http://localhost:3000/api/auth/totp"));
  assert.equal(statusResponse.status, 200);
  assert.deepEqual((await statusResponse.json()).data, { enabled: false, hasSecret: false, recoveryCodesCount: 0 });

  const post = await loadRouteHandler("../src/app/api/auth/totp/route.js", "POST", bindings);
  const setupResponse = await post(postRequest("/api/auth/totp", { action: "setup" }));
  assert.equal(setupResponse.status, 200);
  assert.deepEqual((await setupResponse.json()).data, {
    secret: "new-secret",
    qrCode: "data:image/png;base64,qr",
    serialKey: calls.find(([kind]) => kind === "serial")[3],
  });

  const verifyResponse = await post(postRequest("/api/auth/totp", { action: "verify", token: "123456" }));
  assert.equal(verifyResponse.status, 200);
  assert.equal((await verifyResponse.json()).data.enabled, true);

  const recoveryResponse = await post(postRequest("/api/auth/totp", { action: "generate-recovery-codes" }));
  assert.equal(recoveryResponse.status, 200);
  assert.deepEqual((await recoveryResponse.json()).data.codes, ["A1B2C3D4", "E5F6A7B8"]);
  assert.ok(calls.some(([kind, type, id]) => kind === "generate-codes" && type === "student" && id === 42));
  assert.ok(calls.some(([kind, type, id]) => kind === "secret" && type === "student" && id === 42));
  assert.ok(calls.every((call) => !["get", "count", "secret", "enabled", "serial", "generate-codes"].includes(call[0]) || call[1] === "student"));
});

test("staff 2FA settings remain scoped to the staff account", async () => {
  let lookedUp;
  const get = await loadRouteHandler("../src/app/api/auth/totp/route.js", "GET", {
    NextResponse: nextResponse,
    requireAuth: async () => ({ user: { ...student, id: "STAFF-42", principalType: "staff", accountId: undefined, role: "Staff" } }),
    createAuthErrorResponse: (error, status) => Response.json({ ok: false, error }, { status }),
    getAccountSecurity: async (type, id) => { lookedUp = [type, id]; return { totp_enabled: false, totp_secret: null }; },
    getAccountRecoveryCodesCount: async () => 0,
  });
  const response = await get(new Request("http://localhost:3000/api/auth/totp"));
  assert.equal(response.status, 200);
  assert.deepEqual(lookedUp, ["staff", "STAFF-42"]);
});

test("student login endpoints return a 2FA challenge instead of issuing a session", async () => {
  const loginStudent = {
    id: 42,
    student_no: student.studentNo,
    email: student.email,
    name: "Test Student",
    totp_enabled: true,
  };
  const createChallenge = async (account) => {
    assert.equal(account.id, 42);
    return "student-challenge-token";
  };
  const studentLogin = await loadRouteHandler("../src/app/api/auth/student/login/route.js", "POST", {
    NextResponse: nextResponse,
    authenticateStudent: async () => loginStudent,
    createStudent2FAChallenge: createChallenge,
    createStudentSession: async () => assert.fail("Must not issue a full session before 2FA"),
    setStudentSessionCookie: async () => assert.fail("Must not set session cookies before 2FA"),
    writeGlobalAuditLog: async () => {},
  });
  const dedicatedResponse = await studentLogin(postRequest("/api/auth/student/login", { studentNo: student.studentNo, password: "password" }));
  assert.equal(dedicatedResponse.status, 200);
  assert.deepEqual((await dedicatedResponse.json()).data, {
    totpRequired: true,
    tempToken: "student-challenge-token",
    username: student.email,
  });

  const mainLogin = await loadRouteHandler("../src/app/api/auth/login/route.js", "POST", {
    NextResponse: nextResponse,
    checkAuthLoginRateLimit: async () => ({ allowed: true }),
    LoginSchema: { safeParse: (data) => ({ success: true, data }) },
    getStaffByUsername: async () => null,
    authenticateStudent: async () => loginStudent,
    createStudent2FAChallenge: createChallenge,
    createStudentSession: async () => assert.fail("Must not issue a full session before 2FA"),
    setStudentSessionCookie: async () => assert.fail("Must not set session cookies before 2FA"),
    authDebug: () => {},
    audit: async () => {},
    process: { env: {} },
  });
  const mainResponse = await mainLogin(postRequest("/api/auth/login", { username: student.studentNo, password: "password" }));
  assert.equal(mainResponse.status, 200);
  assert.deepEqual((await mainResponse.json()).data, {
    totpRequired: true,
    tempToken: "student-challenge-token",
    username: student.email,
  });
});

test("student 2FA challenge accepts a backup code once and then issues a full student session", async () => {
  let challengeActive = true;
  let recoveryCodeAvailable = true;
  const calls = [];
  const verify = await loadRouteHandler("../src/app/api/auth/login/verify-2fa/route.js", "POST", {
    NextResponse: nextResponse,
    checkAuth2FARateLimit: async () => ({ allowed: true }),
    verifySessionToken: async () => ({
      sub: "42", account_id: 42, principal_type: "student", role: "Student", purpose: "2fa", jti: "student-challenge",
    }),
    isSessionActive: async () => challengeActive,
    getStudentAccountFor2FA: async (id) => {
      assert.equal(id, 42);
      return { id: 42, student_no: student.studentNo, name: "Test Student", totp_enabled: true, totp_secret: "encrypted" };
    },
    decryptSecret: () => "decoded-secret",
    verifyTOTP: () => false,
    verifyAccountRecoveryCode: async (type, id, code) => {
      calls.push(["recovery", type, id, code]);
      if (type !== "student" || String(id) !== "42" || code !== "A1B2C3D4" || !recoveryCodeAvailable) return false;
      recoveryCodeAvailable = false;
      return true;
    },
    verifyAccountSerialKey: async () => false,
    revokeSession: async (id, options) => { calls.push(["revoke", id, options.reason]); challengeActive = false; },
    createStudentSession: async (_account, options) => {
      calls.push(["session", options.authLevel]);
      return "full-student-session";
    },
    setStudentSessionCookie: async (response, token) => {
      calls.push(["cookie", token]);
      return response;
    },
    resetAuth2FARateLimit: async () => {},
    writeGlobalAuditLog: async () => {},
  });

  const firstResponse = await verify(postRequest("/api/auth/login/verify-2fa", { tempToken: "student-challenge-token", code: "A1B2C3D4" }));
  assert.equal(firstResponse.status, 200);
  assert.deepEqual((await firstResponse.json()).data, {
    role: "Student", id: student.studentNo, student_no: student.studentNo, name: "Test Student",
  });
  assert.ok(calls.some(([kind, type]) => kind === "recovery" && type === "student"));
  assert.ok(calls.some(([kind, authLevel]) => kind === "session" && authLevel === "2fa"));

  const replayResponse = await verify(postRequest("/api/auth/login/verify-2fa", { tempToken: "student-challenge-token", code: "A1B2C3D4" }));
  assert.equal(replayResponse.status, 401, "A completed challenge must not be reusable");
  assert.equal(recoveryCodeAvailable, false, "A recovery code must be consumed after successful use");
});

test("student 2FA challenge accepts an authenticator code", async () => {
  let issued = false;
  const verify = await loadRouteHandler("../src/app/api/auth/login/verify-2fa/route.js", "POST", {
    NextResponse: nextResponse,
    checkAuth2FARateLimit: async () => ({ allowed: true }),
    verifySessionToken: async () => ({ sub: "42", account_id: 42, principal_type: "student", role: "Student", purpose: "2fa", jti: "student-challenge" }),
    isSessionActive: async () => true,
    getStudentAccountFor2FA: async () => ({
      id: 42, student_no: student.studentNo, name: "Test Student", totp_enabled: true, totp_secret: "encrypted",
    }),
    decryptSecret: () => "decoded-secret",
    verifyTOTP: (code, secret) => code === "123456" && secret === "decoded-secret",
    verifyAccountRecoveryCode: async () => assert.fail("Authenticator code should not use a recovery code"),
    verifyAccountSerialKey: async () => false,
    revokeSession: async () => {},
    createStudentSession: async (_account, options) => { issued = options.authLevel === "2fa"; return "full-student-session"; },
    setStudentSessionCookie: async (response) => response,
    resetAuth2FARateLimit: async () => {},
    writeGlobalAuditLog: async () => {},
  });
  const response = await verify(postRequest("/api/auth/login/verify-2fa", {
    tempToken: "student-challenge-token", code: "123456",
  }));
  assert.equal(response.status, 200);
  assert.equal(issued, true);
});
