import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function benchmark() {
  console.log("=== Benchmarking SuperAdmin API Endpoints (Authenticated) ===");
  
  // 1. Login
  const loginStart = Date.now();
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "superadmin@pup.local", password: "pupstaff" })
  });
  const loginData = await loginRes.json();
  const loginDuration = Date.now() - loginStart;
  console.log(`Login: ${loginDuration}ms (Status: ${loginRes.status}, OK: ${loginData?.ok})`);
  
  const rawCookie = loginRes.headers.get("set-cookie") || "";
  // Extract pup_session cookie
  const match = rawCookie.match(/pup_session=([^;]+)/);
  const sessionToken = match ? match[1] : "";
  console.log("Extracted session token?", Boolean(sessionToken));

  const headers = {
    Cookie: `pup_session=${sessionToken}`
  };

  const endpoints = [
    { name: "Auth /me", url: "http://localhost:3000/api/auth/me" },
    { name: "Offices with Stats (/api/offices?stats=true)", url: "http://localhost:3000/api/offices?stats=true" },
    { name: "Modules (/api/modules)", url: "http://localhost:3000/api/modules" },
    { name: "Module Matrix (/api/modules/matrix)", url: "http://localhost:3000/api/modules/matrix" },
    { name: "Global Staff (/api/staff?limit=500)", url: "http://localhost:3000/api/staff?limit=500" },
    { name: "Global Audit Log Stats (/api/audit-logs/global/stats)", url: "http://localhost:3000/api/audit-logs/global/stats" },
    { name: "Global Audit Logs (/api/audit-logs/global?page=1&limit=50)", url: "http://localhost:3000/api/audit-logs/global?page=1&limit=50" },
    { name: "System Health (/api/system/health)", url: "http://localhost:3000/api/system/health" },
    { name: "System Backups (/api/system/backup?scope=system)", url: "http://localhost:3000/api/system/backup?scope=system" },
  ];

  for (const ep of endpoints) {
    const start = Date.now();
    try {
      const res = await fetch(ep.url, { headers });
      const data = await res.json().catch(() => null);
      const duration = Date.now() - start;
      console.log(`[${duration}ms] ${ep.name} -> Status: ${res.status}, OK: ${data?.ok}`);
    } catch (err) {
      console.log(`[FAILED ${Date.now() - start}ms] ${ep.name} -> Error: ${err.message}`);
    }
  }
}

benchmark().catch(console.error);
