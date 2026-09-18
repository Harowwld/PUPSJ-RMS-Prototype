import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const WARMUP_PATHS = [
  "/",
  "/login",
  "/systemadmin",
  "/api/auth/me",
  "/api/auth/login",
  "/api/account/avatar?id=warmup",
  "/api/landing/hero",
  "/api/landing/faq",
  "/api/landing/bento",
  "/api/landing/catalog",
  "/api/landing/workflow",
  "/api/landing/footer",
  "/api/modules",
  "/api/offices?stats=true",
];

export async function warmLocalRoutes(baseUrl = "http://127.0.0.1:3000") {
  const results = await Promise.all(WARMUP_PATHS.map(async (pathname) => {
    try {
      const response = await fetch(new URL(pathname, baseUrl), {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      return { pathname, ok: response.ok || response.status < 500, status: response.status };
    } catch (error) {
      return { pathname, ok: false, status: 0, error };
    }
  }));

  return {
    warmed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  const result = await warmLocalRoutes(process.env.LOCAL_DEV_URL || "http://127.0.0.1:3000");
  console.log(`[dev] Warmed ${result.warmed}/${WARMUP_PATHS.length} local route surfaces.`);
}
