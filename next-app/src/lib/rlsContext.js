import { verifySessionToken, getSessionCookieName } from "./jwt.js";
import { cache } from "react";

export const getRlsContext = cache(async () => {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      return {
        userId: payload.sub,
        role: payload.role,
        officeId: payload.office_id || payload.officeId
      };
    }
  } catch (e) {
    // Fails silently if outside a request context or not in Next.js
  }
  return null;
});
