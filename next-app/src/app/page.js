import LandingPage from "@/components/landing/LandingPage";
import { getLandingVersionSettings, getPublicLandingVersion, DEFAULT_LANDING_VERSION_SETTINGS } from "@/lib/landingVersionSettings";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getLandingVersionSettings().catch((error) => {
    console.error("[LandingPage] Could not load version settings:", error);
    return DEFAULT_LANDING_VERSION_SETTINGS;
  });
  const { version, notice } = getPublicLandingVersion(settings);
  return <LandingPage enhanced={version === "enhanced"} notice={notice} />;
}
