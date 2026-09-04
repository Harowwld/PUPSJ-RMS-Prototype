import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("--- Starting Student Avatar Test ---");

  // 1. Login as student
  const loginRes = await fetch(`${BASE_URL}/api/auth/student/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      studentNo: "student@pup.local",
      password: "student123",
    }),
  });

  const loginJson = await loginRes.json();
  console.log("Login status:", loginRes.status, loginJson);
  if (!loginJson.ok) {
    throw new Error("Student login failed: " + JSON.stringify(loginJson));
  }

  const setCookie = loginRes.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/pup_session=([^;]+)/);
  if (!cookieMatch) {
    throw new Error("No pup_session cookie returned in student login");
  }
  const sessionCookie = `pup_session=${cookieMatch[1]}`;
  console.log("Got session cookie successfully.");

  // 2. Check /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meJson = await meRes.json();
  console.log("Me status:", meRes.status, "role:", meJson.data?.role, "avatar_filename:", meJson.data?.avatar_filename);

  // 3. Upload a sample avatar (1x1 PNG)
  const png1x1Base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const pngBuffer = Buffer.from(png1x1Base64, "base64");
  const blob = new Blob([pngBuffer], { type: "image/png" });
  const formData = new FormData();
  formData.append("avatar", blob, "avatar.png");

  const uploadRes = await fetch(`${BASE_URL}/api/account/avatar`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });
  const uploadJson = await uploadRes.json();
  console.log("Avatar Upload response:", uploadRes.status, uploadJson);
  if (!uploadJson.ok) {
    throw new Error("Avatar upload failed: " + JSON.stringify(uploadJson));
  }

  // 4. Fetch the avatar
  const avatarRes = await fetch(`${BASE_URL}/api/account/avatar?id=${meJson.data.id}&t=${Date.now()}`, {
    headers: { Cookie: sessionCookie },
  });
  console.log("Avatar GET response status:", avatarRes.status, "content-type:", avatarRes.headers.get("content-type"));
  if (avatarRes.status !== 200) {
    throw new Error("Avatar fetch failed with status " + avatarRes.status);
  }

  // 5. Verify /api/auth/me reflects the new avatar
  const meAfterRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meAfterJson = await meAfterRes.json();
  console.log("Me avatar_filename after upload:", meAfterJson.data?.avatar_filename);
  if (meAfterJson.data?.avatar_filename !== uploadJson.avatar_filename) {
    throw new Error("Avatar filename mismatch in auth/me");
  }

  // 6. Delete avatar
  const deleteRes = await fetch(`${BASE_URL}/api/account/avatar`, {
    method: "DELETE",
    headers: { Cookie: sessionCookie },
  });
  const deleteJson = await deleteRes.json();
  console.log("Avatar Delete response:", deleteRes.status, deleteJson);
  if (!deleteJson.ok) {
    throw new Error("Avatar deletion failed: " + JSON.stringify(deleteJson));
  }

  // 7. Verify /api/auth/me reflects null avatar
  const meFinalRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meFinalJson = await meFinalRes.json();
  console.log("Me avatar_filename after deletion:", meFinalJson.data?.avatar_filename);
  if (meFinalJson.data?.avatar_filename !== null) {
    throw new Error("Avatar filename should be null after delete");
  }

  console.log("--- All Student Avatar Tests PASSED Successfully! ---");
}

main().catch((e) => {
  console.error("Test Error:", e);
  process.exit(1);
});
