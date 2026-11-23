import { getSessionCookieName, verifySessionToken } from "@/lib/jwt";
import { queryOne } from "@/lib/postgres";
import { parseStaffPreferences } from "@/lib/staffRepo";
import { isStudentRole } from "@/lib/roleUtils";
import { DEFAULT_INITIAL_LOADER, normalizeInitialLoader } from "@/lib/initialLoaderPreference";

export async function readInitialLoaderPreference(cookieStore) {
  const token = cookieStore.get(getSessionCookieName())?.value;
  if (!token) return DEFAULT_INITIAL_LOADER;

  try {
    const session = await verifySessionToken(token);
    if (!session?.sub) return DEFAULT_INITIAL_LOADER;

    const account = isStudentRole(session.role)
      ? await queryOne("SELECT preferences FROM student_accounts WHERE id = $1", [session.account_id || session.sub])
      : await queryOne("SELECT preferences FROM staff WHERE id = $1", [session.sub]);

    return normalizeInitialLoader(parseStaffPreferences(account?.preferences).initial_loader);
  } catch {
    return DEFAULT_INITIAL_LOADER;
  }
}
