import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import puppeteer from "puppeteer-core";
import { loadJsx } from "../test/helpers/load-jsx.mjs";

const require = createRequire(import.meta.url);
const tailwind = require("@tailwindcss/postcss");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const from = path.resolve("src/app/globals.css");
const { css } = await postcss([tailwind({ base: process.cwd() })]).process(await fs.readFile(from, "utf8"), { from });
const font = await fs.readFile("public/assets/fonts/jakarta/PlusJakartaSans-Variable.woff2");
const dialog = loadJsx("src/components/ui/dialog.jsx");
const sheet = loadJsx("src/components/ui/sheet.jsx");
const { Button } = loadJsx("src/components/ui/button.jsx");
const { Input } = loadJsx("src/components/ui/input.jsx");

function fixture(kind) {
  const isSheet = kind === "sheet";
  const padded = kind === "padded";
  const Root = isSheet ? sheet.Sheet : dialog.Dialog;
  const Header = isSheet ? sheet.SheetHeader : dialog.DialogHeader;
  const Title = isSheet ? sheet.SheetTitle : dialog.DialogTitle;
  const Description = isSheet ? sheet.SheetDescription : dialog.DialogDescription;
  const Footer = isSheet ? sheet.SheetFooter : dialog.DialogFooter;
  const title = kind === "form" ? "Edit Student Details" : isSheet ? "Document Request Details" : "Archive Student Record";
  return h(Root, { open: true }, h("article", {
    "data-fixture": kind,
    className: `flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-card ${padded ? "gap-4 p-6" : "p-0"}`,
  },
  h(Header, { className: padded ? "" : "p-6 pb-0" },
    h(Title, null, title),
    h(Description, null, "Review the record details before applying your changes.")),
  h("div", { className: padded ? "space-y-4" : "space-y-4 p-6" },
    h("label", { className: "block text-xs text-gray-700 dark:text-zinc-300", htmlFor: `name-${kind}` }, "Student Name"),
    h(Input, { id: `name-${kind}`, defaultValue: "", placeholder: "Student name" }),
    h("div", { "data-field-group": true, className: "rounded-xl border border-border p-3 text-xs text-gray-500 dark:text-zinc-400" },
      "This field-group border remains part of the form.")),
  h(Footer, { className: padded ? "" : "p-6 pt-0" },
    h(Button, { variant: "outline", className: "h-10 rounded-xl px-5" }, "Cancel"),
    h(Button, { className: "h-10 rounded-xl px-5" }, "Save Changes"))));
}

const markup = renderToStaticMarkup(h("main", { className: "flex flex-col items-center gap-6 p-4" },
  ...["form", "padded", "sheet"].map(fixture)));
const outputDir = path.resolve(".local/modal-layout-qa");
await fs.mkdir(outputDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || "/opt/brave-bin/brave",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  const results = [];
  for (const width of [1440, 320]) {
    await page.setViewport({ width, height: 1000 });
    for (const theme of ["light", "dark"]) {
      await page.setContent(`<!doctype html><html class="${theme}"><head><style>${css}</style><style>@font-face{font-family:ModalQA;src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2");font-weight:100 900}html{--font-jakarta:ModalQA}</style></head><body class="bg-gray-50 dark:bg-zinc-950">${markup}</body></html>`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => [...document.querySelectorAll("[data-fixture]")].map((frame) => {
        const header = frame.querySelector('[data-slot$="-header"]');
        const footer = frame.querySelector('[data-slot$="-footer"]');
        const title = frame.querySelector('[data-slot$="-title"]');
        const description = frame.querySelector('[data-slot$="-description"]');
        const hc = getComputedStyle(header), fc = getComputedStyle(footer);
        const bounds = frame.getBoundingClientRect();
        return {
          kind: frame.dataset.fixture,
          headerBorders: [hc.borderTopWidth, hc.borderBottomWidth],
          footerBorders: [fc.borderTopWidth, fc.borderBottomWidth],
          footerMargins: [fc.marginLeft, fc.marginRight, fc.marginBottom],
          headerBackground: hc.backgroundColor,
          footerBackground: fc.backgroundColor,
          titleSize: getComputedStyle(title).fontSize,
          descriptionSize: getComputedStyle(description).fontSize,
          contentBorder: getComputedStyle(frame.querySelector("[data-field-group]")).borderTopWidth,
          buttonsInside: [...footer.querySelectorAll("button")].every((button) => {
            const r = button.getBoundingClientRect();
            return r.left >= bounds.left && r.right <= bounds.right && r.bottom <= bounds.bottom;
          }),
          headerIcons: header.querySelectorAll("svg").length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      }));
      for (const m of metrics) {
        assert.deepEqual(m.headerBorders, ["0px", "0px"]);
        assert.deepEqual(m.footerBorders, ["0px", "0px"]);
        assert.ok(m.footerMargins.every((margin) => parseFloat(margin) >= 0));
        assert.equal(m.headerBackground, "rgba(0, 0, 0, 0)");
        assert.equal(m.footerBackground, "rgba(0, 0, 0, 0)");
        assert.equal(m.titleSize, m.kind === "sheet" ? "17px" : "16px");
        assert.equal(m.descriptionSize, "13px");
        assert.equal(m.contentBorder, "1px");
        assert.equal(m.buttonsInside, true);
        assert.equal(m.headerIcons, 0);
        assert.equal(m.overflow, false);
      }
      results.push({ width, theme, metrics });
      await page.screenshot({ path: path.join(outputDir, `${theme}-${width}.png`), fullPage: true });
      console.log(`PASS ${theme} ${width}px: divider-free headers/footers, neutral footer geometry, typography, and retained field borders.`);
    }
  }
  await fs.writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
