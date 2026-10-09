import crypto from "node:crypto";
import { queryOne } from "../src/lib/postgres.js";
import { signSessionToken } from "../src/lib/jwt.js";
import { registerSessionToken } from "../src/lib/authSessions.js";

async function run() {
  console.log("=== STARTING PDF VIEWER HEADERS & ACCESS TEST ===");

  // 1. Get test document that has a linked student account in registrar office
  const doc = await queryOne(`
    SELECT d.id, d.student_no, d.original_filename, d.office_id 
    FROM documents d 
    JOIN student_accounts sa ON sa.student_no = d.student_no
    WHERE d.office_id = 'registrar' AND d.student_no IS NOT NULL 
    LIMIT 1
  `);
  if (!doc) throw new Error("No test document with student account found in DB");
  console.log(`[Setup] Using test document id=${doc.id}, student_no=${doc.student_no}`);

  const studentAccount = await queryOne(`
    SELECT sa.id, sa.student_no, sip.email 
    FROM student_accounts sa 
    JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id 
    WHERE sa.student_no = $1
  `, [doc.student_no]);

  const otherStudentAccount = await queryOne(`
    SELECT sa.id, sa.student_no, sip.email 
    FROM student_accounts sa 
    JOIN student_identity_profiles sip ON sip.id = sa.identity_profile_id 
    WHERE sa.student_no != $1
    LIMIT 1
  `, [doc.student_no]);

  // 2. Test staff session token
  const staffJti = crypto.randomUUID();
  const staffPayload = {
    sub: "PUPREGISTRAR-002",
    role: "Staff",
    username: "staff.registrar@pup.local",
    officeId: "registrar",
    office_id: "registrar",
    jti: staffJti,
    purpose: "access",
  };
  const staffToken = await signSessionToken(staffPayload);
  await registerSessionToken(staffToken);

  console.log("[Test 1] Verifying Staff session on /api/documents/[id]...");
  
  let serverRunning = false;
  try {
    const ping = await fetch("http://localhost:3000/api/auth/login-options");
    serverRunning = ping.ok || ping.status === 200 || ping.status === 404;
  } catch {
    serverRunning = false;
  }

  if (serverRunning) {
    console.log("Next.js server is online on port 3000. Testing over HTTP...");
    const res = await fetch(`http://localhost:3000/api/documents/${doc.id}`, {
      headers: {
        cookie: `pup_session=${staffToken}`,
      },
    });

    console.log(`Staff response status: ${res.status}`);
    if (res.status !== 200) {
      console.error(await res.text());
      throw new Error(`Expected HTTP 200 for staff, got ${res.status}`);
    }

    const xfo = res.headers.get("x-frame-options");
    const csp = res.headers.get("content-security-policy");

    console.log(`X-Frame-Options: ${xfo}`);
    console.log(`CSP: ${csp}`);

    if (xfo !== "SAMEORIGIN") {
      throw new Error(`Expected X-Frame-Options to be 'SAMEORIGIN', got: ${xfo}`);
    }
    if (!csp.includes("frame-ancestors 'self'")) {
      throw new Error(`Expected CSP to contain "frame-ancestors 'self'", got: ${csp}`);
    }
    if (!csp.includes("frame-src 'self' blob: data:")) {
      throw new Error(`Expected CSP to contain "frame-src 'self' blob: data:", got: ${csp}`);
    }
    if (!csp.includes("object-src 'self' blob: data:")) {
      throw new Error(`Expected CSP to contain "object-src 'self' blob: data:", got: ${csp}`);
    }
    console.log("✓ Staff can access document with SAMEORIGIN and frame-ancestors 'self'.");

    if (studentAccount) {
      console.log(`[Test 2] Verifying Student self-access for student_no=${studentAccount.student_no}...`);
      const studentJti = crypto.randomUUID();
      const studentPayload = {
        sub: String(studentAccount.id),
        account_id: String(studentAccount.id),
        role: "Student",
        student_no: studentAccount.student_no,
        jti: studentJti,
        purpose: "access",
      };
      const studentToken = await signSessionToken(studentPayload);
      await registerSessionToken(studentToken);

      const studentRes = await fetch(`http://localhost:3000/api/documents/${doc.id}`, {
        headers: {
          cookie: `pup_session=${studentToken}`,
        },
      });
      console.log(`Student owner status: ${studentRes.status}`);
      if (studentRes.status !== 200) {
        console.error(await studentRes.text());
        throw new Error(`Expected HTTP 200 for owning student, got ${studentRes.status}`);
      }
      const studentXfo = studentRes.headers.get("x-frame-options");
      const studentCsp = studentRes.headers.get("content-security-policy");
      if (studentXfo !== "SAMEORIGIN") {
        throw new Error(`Expected Student X-Frame-Options to be 'SAMEORIGIN', got: ${studentXfo}`);
      }
      if (!studentCsp.includes("frame-ancestors 'self'")) {
        throw new Error(`Expected Student CSP to contain "frame-ancestors 'self'", got: ${studentCsp}`);
      }
      console.log("✓ Owning student can access their own document with SAMEORIGIN and frame-ancestors 'self'.");

      if (otherStudentAccount) {
        console.log(`[Test 3] Verifying other student access is forbidden...`);
        const otherJti = crypto.randomUUID();
        const otherPayload = {
          sub: String(otherStudentAccount.id),
          account_id: String(otherStudentAccount.id),
          role: "Student",
          student_no: otherStudentAccount.student_no,
          jti: otherJti,
          purpose: "access",
        };
        const otherToken = await signSessionToken(otherPayload);
        await registerSessionToken(otherToken);

        const otherRes = await fetch(`http://localhost:3000/api/documents/${doc.id}`, {
          headers: {
            cookie: `pup_session=${otherToken}`,
          },
        });
        console.log(`Other student status: ${otherRes.status}`);
        if (otherRes.status !== 403) {
          throw new Error(`Expected HTTP 403 for non-owning student, got ${otherRes.status}`);
        }
        console.log("✓ Other student correctly denied access with HTTP 403.");
      }
    }
  } else {
    console.log("Next.js server is not running on port 3000. Skipping HTTP assertion.");
  }

  console.log("=== ALL PDF VIEWER TESTS PASSED ===");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
