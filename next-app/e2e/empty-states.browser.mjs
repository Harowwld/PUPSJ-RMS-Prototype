import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AlertCircleIcon, Search01Icon } from "hugeicons-react";
import puppeteer from "puppeteer-core";
import { loadJsx } from "../test/helpers/load-jsx.mjs";

const origin = process.env.TEST_ORIGIN || "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
const { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyState } = loadJsx("src/components/ui/empty.jsx");
const { Button } = loadJsx("src/components/ui/button.jsx");
const buttonClass = "h-10 rounded-xl px-5 text-xs font-semibold";
const fixture = renderToStaticMarkup(h("main", { className: "p-6 space-y-6" },
  h(EmptyState, { icon: Search01Icon, title: "No Matches Found", description: "Adjust your search or reset your filters." },
    h(Button, { variant: "outline", className: buttonClass }, "Reset Filters")),
  h(EmptyState, { variant: "compact", icon: Search01Icon, title: "No Records Yet", description: "Registered records will appear here." },
    h(Button, { className: buttonClass }, "Register Student")),
  h(Empty, { variant: "compact" }, h(EmptyHeader, null,
    h(EmptyMedia, { className: "text-red-600 dark:text-red-400" }, h(AlertCircleIcon, { size: "1em" })),
    h(EmptyTitle, null, "Could Not Load Requests"),
    h(EmptyDescription, null, "Try loading the request list again."))),
  h(EmptyState, { variant: "compact", title: "No Matches Found", description: "Unbroken search: " + "x".repeat(240) },
    h(Button, { variant: "outline", className: buttonClass }, "Locate Archive Drawer in Storage Map")),
  h("div", { "data-radius-reference": true, className: "rounded-xl" }),
));

const outputDir = path.resolve(".local/empty-state-qa");
await fs.mkdir(outputDir, { recursive: true });
const font = await fs.readFile("public/assets/fonts/jakarta/PlusJakartaSans-Variable.woff2");
const fontMarkup = `<style>@font-face{font-family:EmptyStateQA;src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2");font-weight:100 900}html{--font-jakarta:EmptyStateQA}</style>`;
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || "/opt/brave-bin/brave",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  let stylesheetMarkup;
  if (process.env.TEST_CSS_FILE) {
    stylesheetMarkup = `<style>${await fs.readFile(process.env.TEST_CSS_FILE, "utf8")}</style>`;
  } else {
    await page.goto(`${origin}/login`, { waitUntil: "networkidle2" });
    const styles = await page.$$eval('link[rel="stylesheet"]', (links) => links.map((link) => link.href));
    assert.ok(styles.length, "The running app must provide its real compiled stylesheets.");
    stylesheetMarkup = styles.map((url) => `<link rel="stylesheet" href="${url}">`).join("");
  }
  const results = [];
  for (const width of [1440, 320]) {
    await page.setViewport({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.setContent(`<!doctype html><html class="${theme}"><head>${stylesheetMarkup}${fontMarkup}</head><body class="bg-white dark:bg-card">${fixture}</body></html>`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => {
        const states = [...document.querySelectorAll('[data-slot="empty"]')];
        const measure = (element) => {
          const css = getComputedStyle(element);
          return { width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height,
            fontSize: css.fontSize, color: css.color, radius: css.borderRadius, border: css.borderTopWidth,
            background: css.backgroundColor, fontWeight: css.fontWeight, shadow: css.boxShadow };
        };
        return {
          radiusToken: getComputedStyle(document.querySelector("[data-radius-reference]")).borderRadius,
          pageIcon: measure(states[0].querySelector("svg")),
          compactIcon: measure(states[1].querySelector("svg")),
          pageTile: measure(states[0].querySelector('[data-slot="empty-icon"]')),
          compactTile: measure(states[1].querySelector('[data-slot="empty-icon"]')),
          warningIcon: measure(states[2].querySelector("svg")),
          title: measure(states[0].querySelector('[data-slot="empty-title"]')),
          compactTitle: measure(states[1].querySelector('[data-slot="empty-title"]')),
          description: measure(states[0].querySelector('[data-slot="empty-description"]')),
          compactDescription: measure(states[1].querySelector('[data-slot="empty-description"]')),
          outline: measure(states[0].querySelector("button")),
          primary: measure(states[1].querySelector("button")),
          overflow: document.documentElement.scrollWidth > innerWidth,
          decorativeMediaHidden: states.slice(0, 3).every((state) => state.querySelector('[data-slot="empty-icon"]').getAttribute("aria-hidden") === "true"),
          animationCount: document.getAnimations().length,
        };
      });
      assert.equal(metrics.pageIcon.width, 48);
      assert.equal(metrics.compactIcon.width, 28);
      assert.equal(metrics.pageTile.width, 48);
      assert.equal(metrics.compactTile.width, 28);
      for (const media of [metrics.pageTile, metrics.compactTile]) {
        assert.equal(media.border, "0px");
        assert.equal(media.background, "rgba(0, 0, 0, 0)");
        assert.equal(media.shadow, "none");
      }
      assert.equal(metrics.title.fontSize, "20px");
      assert.equal(metrics.compactTitle.fontSize, "14px");
      assert.equal(metrics.description.fontSize, "14px");
      assert.equal(metrics.compactDescription.fontSize, "12px");
      assert.equal(metrics.description.fontWeight, "400");
      assert.equal(metrics.outline.height, 40);
      assert.equal(metrics.outline.radius, metrics.radiusToken);
      assert.equal(metrics.outline.border, "1px");
      assert.equal(metrics.primary.height, 40);
      assert.notEqual(metrics.primary.background, "rgba(0, 0, 0, 0)");
      assert.notEqual(metrics.warningIcon.color, metrics.pageIcon.color);
      assert.equal(metrics.overflow, false);
      assert.equal(metrics.decorativeMediaHidden, true);
      assert.equal(metrics.animationCount, 0);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.textContent), "Reset Filters");
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.textContent), "Register Student");
      await page.screenshot({ path: path.join(outputDir, `${theme}-${width}.png`), fullPage: true });
      results.push({ width, theme, metrics });
      console.log(`PASS ${theme} ${width}px: icon sizes, typography, button variants, keyboard order, no overflow or idle animation.`);
    }
  }
  assert.notEqual(results[0].metrics.description.color, results[1].metrics.description.color);
  await fs.writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
