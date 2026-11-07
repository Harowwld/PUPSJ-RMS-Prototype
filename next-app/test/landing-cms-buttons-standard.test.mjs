import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const CMS_COMPONENTS_DIR = path.resolve(process.cwd(), "src/components/systemadmin");

test("Landing Page CMS: Button Labels follow Verb + Specific Noun standard", async (t) => {
  const landingFiles = [
    "LandingPageCmsTab.js",
    "LandingBentoCmsView.js",
    "LandingCatalogCmsView.js",
    "LandingWorkflowCmsView.js",
    "LandingFaqCmsView.js",
    "LandingFooterCmsView.js",
  ];

  await t.test("No Landing CMS component contains naked action-only buttons", () => {
    const forbiddenNakedWords = [
      "Add",
      "Reset",
      "Preview",
      "Test",
      "Save",
      "Delete",
      "Edit",
      "Update",
      "Upload",
      "Remove",
    ];

    for (const filename of landingFiles) {
      const filePath = path.join(CMS_COMPONENTS_DIR, filename);
      assert.ok(fs.existsSync(filePath), `File exists: ${filename}`);

      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        for (const word of forbiddenNakedWords) {
          assert.notEqual(
            trimmed,
            word,
            `Violation in ${filename}:${idx + 1}: naked action word "${word}" found. Must use "Verb + Specific Noun".`
          );
        }
      });
    }
  });

  await t.test("LandingFooterCmsView uses specific nouns for window, channel, and preview link buttons", () => {
    const footerContent = fs.readFileSync(path.join(CMS_COMPONENTS_DIR, "LandingFooterCmsView.js"), "utf8");
    assert.match(footerContent, /Add Window/, "Must contain 'Add Window' for schedule");
    assert.match(footerContent, /Add Channel/, "Must contain 'Add Channel' for contacts");
    assert.match(footerContent, /Test Link/, "Must contain 'Test Link' for live anchor preview");
  });

  await t.test("LandingWorkflowCmsView uses 'Add Tag' in tag input instead of naked 'Add'", () => {
    const workflowContent = fs.readFileSync(path.join(CMS_COMPONENTS_DIR, "LandingWorkflowCmsView.js"), "utf8");
    assert.match(workflowContent, /Add Tag/, "Inline tag editor button must say 'Add Tag'");
    assert.doesNotMatch(workflowContent, /<button[^>]*>\s*Add\s*<\/button>/, "Must not contain naked '<button>Add</button>'");
  });

  await t.test("LandingBentoCmsView header toolbar aligns with standard ('Preview Portal' and 'Restore Defaults')", () => {
    const bentoContent = fs.readFileSync(path.join(CMS_COMPONENTS_DIR, "LandingBentoCmsView.js"), "utf8");
    assert.match(bentoContent, /Preview Portal/, "Header action must say 'Preview Portal'");
    assert.match(bentoContent, /Restore Defaults/, "Secondary action must say 'Restore Defaults'");
    assert.doesNotMatch(bentoContent, />\s*Preview\s*</, "Must not have naked 'Preview'");
    assert.doesNotMatch(bentoContent, />\s*Reset\s*</, "Must not have naked 'Reset'");
  });
});
