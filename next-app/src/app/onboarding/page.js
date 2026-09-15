"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { toast } from "sonner";
import ProfileSetup, { avatars } from "@/components/kokonutui/avatar-picker";
import { getDefaultDashboardPath } from "@/lib/roleUtils";

export default function OnboardingPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) {
          router.push("/");
          return;
        }
        setAuthUser(json.data);
      } catch {
        router.push("/");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleComplete = async (data) => {
    const { avatarId } = data;
    const avatarObj = avatars.find((a) => a.id === avatarId);
    if (!avatarObj) return;

    try {
      // 1. Upload Avatar
      const svgString = renderToStaticMarkup(avatarObj.svg);
      const file = new File([svgString], "avatar.svg", { type: "image/svg+xml" });
      
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Avatar upload failed");
      }

      toast.success("Welcome aboard!", {
        description: "Your profile is set up.",
      });

      // 2. Redirect to dashboard
      const dashboardPath = getDefaultDashboardPath(authUser?.role);
      router.push(dashboardPath);
    } catch (err) {
      toast.error("Setup Failed", {
        description: err.message || "Could not complete onboarding.",
      });
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <ProfileSetup mode="onboarding" onComplete={handleComplete} />
    </div>
  );
}
