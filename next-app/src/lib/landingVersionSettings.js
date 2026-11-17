import { systemConfigRepo } from "./systemConfigRepo.js";

export const LANDING_VERSION_SETTING_KEY = "landing_page_version";
export const DEFAULT_LANDING_VERSION_SETTINGS = { version: "classic", noticeTitle: "", noticeDescription: "", noticeEnd: "" };

export async function getLandingVersionSettings() {
  const raw = await systemConfigRepo.getSetting(LANDING_VERSION_SETTING_KEY);
  if (!raw) return DEFAULT_LANDING_VERSION_SETTINGS;

  const { version, notice, noticeTitle, noticeDescription, noticeEnd } = JSON.parse(raw);
  return {
    version: version ?? DEFAULT_LANDING_VERSION_SETTINGS.version,
    noticeTitle: noticeTitle ?? (notice ? "Registrar notice" : ""),
    noticeDescription: noticeDescription ?? notice ?? "",
    noticeEnd: noticeEnd ?? "",
  };
}

export function getPublicLandingVersion({ version, noticeTitle, noticeDescription, noticeEnd }) {
  const activeNotice = noticeTitle && noticeDescription &&
    Date.parse(`${noticeEnd}T23:59:59.999+08:00`) >= Date.now();
  return { version, notice: activeNotice ? { title: noticeTitle, description: noticeDescription } : null };
}
