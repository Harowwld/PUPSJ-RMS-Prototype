"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const LIGHT_ICON = "/assets/branding/black-icon.png";
const DARK_ICON = "/assets/branding/white-icon.png";

/**
 * Ensures the browser tab icon automatically displays:
 * - The white branding icon when device or browser theme is dark
 * - The black branding icon when device or browser theme is light
 */
export default function DynamicFavicon() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateFavicon = () => {
      const isDark = resolvedTheme === "dark" || (!resolvedTheme && mediaQuery.matches) || (resolvedTheme === "system" && mediaQuery.matches);
      const targetIcon = isDark ? DARK_ICON : LIGHT_ICON;

      let iconLinks = document.querySelectorAll("link[rel*='icon']");
      if (!iconLinks || iconLinks.length === 0) {
        const link = document.createElement("link");
        link.type = "image/png";
        link.rel = "shortcut icon";
        link.href = targetIcon;
        document.head.appendChild(link);
      } else {
        iconLinks.forEach((link) => {
          link.type = "image/png";
          link.href = targetIcon;
        });
      }
    };

    updateFavicon();

    const handleMediaChange = () => {
      updateFavicon();
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [resolvedTheme]);

  return null;
}
