"use client";

import { useEffect } from "react";
import * as lucide from "lucide";

export default function LucideIconTranslator() {
  useEffect(() => {
    // Mapping of Phosphor/Tabler name to Lucide name
    const iconMapping = {
      "magnifying-glass": "search",
      "warning-circle": "alert-circle",
      "warning": "alert-triangle",
      "device-mobile": "smartphone",
      "identification-card": "contact",
      "users-three": "users",
      "user-gear": "user-cog",
      "settings-cog": "cog",
      "settings": "cog",
      "building-warehouse": "warehouse",
      "hard-drives": "database",
      "funnel": "filter",
      "pencil-simple": "pencil",
      "sign-out": "log-out",
      "arrow-counter-clockwise": "rotate-ccw",
      "arrow-clockwise": "rotate-cw",
      "caret-down": "chevron-down",
      "caret-right": "chevron-right",
      "caret-left": "chevron-left",
      "caret-up": "chevron-up",
      "calendar-blank": "calendar",
      "mask-sad": "frown",
      "spinner": "loader-2",
      "eye-slash": "eye-off",
      "download-simple": "download",
      "cloud-arrow-up": "cloud-upload",
      "shield-slash": "shield-off",
      "shield-key": "shield-alert",
      "chart-bar": "bar-chart",
      "file-check": "file-check",
      "layout-sidebar": "columns",
      "check-circle": "check-circle",
      "x-circle": "x-circle",
      "arrow-left": "arrow-left",
      "arrow-right": "arrow-right",
      "file-text": "file-text",
      "file-pdf": "file-text",
      "check-square": "check-square",
      "square": "square",
      "bell": "bell",
      "archive": "archive",
      "scan": "scan",
      "users": "users",
      "user-plus": "user-plus",
      "arrow-up-right": "arrow-up-right",
      "shield-check": "shield-check",
      "plus": "plus",
      "trash": "trash-2",
      "eye": "eye",
      "camera": "camera",
      "key": "key",
      "clock": "clock",
      "copy": "copy",
      "link": "link",
      "heart": "heart",
      "gear": "cog",
      "paperclip": "paperclip",
      "file": "file",
    };

    function toCamelCase(str) {
      return str.replace(/-([a-z0-9])/g, (g) => g[1].toUpperCase());
    }

    function translateElement(el) {
      if (el.getAttribute("data-lucide-translated") === "true") return;

      const classes = Array.from(el.classList);
      let rawName = "";

      for (const c of classes) {
        if (c.startsWith("ph-") && c !== "ph-bold" && c !== "ph-fill" && c !== "ph-duotone" && c !== "ph-light" && c !== "ph-thin") {
          rawName = c.substring(3);
          break;
        }
        if (c.startsWith("ti-")) {
          rawName = c.substring(3);
          break;
        }
      }

      if (!rawName) return;

      const lucideName = iconMapping[rawName] || rawName;
      const camelName = toCamelCase(lucideName);
      const capitalized = camelName.charAt(0).toUpperCase() + camelName.slice(1);

      // Access from bundled lucide package
      const icon = lucide[capitalized] || (lucide.icons && lucide.icons[capitalized]);
      if (icon) {
        el.setAttribute("data-lucide-translated", "true");
        // Keep the original classes but hide typography text since we are rendering SVG inside
        el.style.fontFamily = "inherit";
        el.style.speak = "none";
        el.style.fontStyle = "normal";
        el.style.fontWeight = "normal";
        el.style.fontVariant = "normal";
        el.style.textTransform = "none";
        el.style.lineHeight = "1";
        
        let svgContent = "";
        if (typeof icon.toSVG === "function") {
          svgContent = icon.toSVG({
            "stroke-width": 2.25,
            width: "1.1em",
            height: "1.1em",
            class: "lucide-svg inline-block align-text-bottom leading-none select-none",
          });
        } else if (Array.isArray(icon)) {
          const childrenStr = icon.map(([tag, attrs]) => {
            const attrStr = Object.entries(attrs)
              .map(([k, v]) => `${k}="${v}"`)
              .join(" ");
            return `<${tag} ${attrStr}></${tag}>`;
          }).join("");
          
          svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" class="lucide-svg inline-block align-text-bottom leading-none select-none">${childrenStr}</svg>`;
        }
        
        if (svgContent) {
          el.innerHTML = svgContent;
        }
      }
    }

    function scanAndTranslate() {
      // Find all <i> tags containing ph- or ti- classes
      const iconsList = document.querySelectorAll('i[class*="ph-"], i[class*="ti-"]');
      iconsList.forEach(translateElement);
    }

    // Run on initial mount
    scanAndTranslate();

    // Set up MutationObserver to translate dynamically loaded icons
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          // If classes changed, it might need translation
          const target = mutation.target;
          if (target.tagName === "I" && (target.className.includes("ph-") || target.className.includes("ti-"))) {
            // Remove translation flag so it gets re-translated with new class
            target.removeAttribute("data-lucide-translated");
            translateElement(target);
          }
        }
      }

      if (shouldScan) {
        scanAndTranslate();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
