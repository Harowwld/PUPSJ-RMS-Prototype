import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");

test("Card primitive conforms to Apple Inset Grouped Settings Card standards", () => {
  const cardPath = path.join(ROOT_DIR, "src/components/ui/card.jsx");
  assert.ok(fs.existsSync(cardPath), "card.jsx must exist");

  const code = fs.readFileSync(cardPath, "utf8");

  // 1. Export check
  assert.ok(code.includes("Card,"), "Must export Card");
  assert.ok(code.includes("CardHeader,"), "Must export CardHeader");
  assert.ok(code.includes("CardTitle,"), "Must export CardTitle");
  assert.ok(code.includes("CardDescription,"), "Must export CardDescription");
  assert.ok(code.includes("CardContent,"), "Must export CardContent");
  assert.ok(code.includes("CardFooter,"), "Must export CardFooter");
  assert.ok(code.includes("CardSectionHeader,"), "Must export CardSectionHeader");
  assert.ok(code.includes("CardGroup,"), "Must export CardGroup");
  assert.ok(code.includes("CardRow,"), "Must export CardRow");
  assert.ok(code.includes("CardSeparator,"), "Must export CardSeparator");

  // 2. Apple Material & Hairline Border Tokens
  assert.ok(
    code.includes("border-black/[0.08]") && code.includes("dark:border-white/10"),
    "Default Card must define hairline border border-black/[0.08] dark:border-white/10"
  );
  assert.ok(
    code.includes("shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.02)]"),
    "Default Card must define Apple layered micro-depth shadow"
  );
  assert.ok(
    code.includes("rounded-2xl"),
    "Card must feature rounded-2xl Apple squircle curvature"
  );

  // 3. Inset Grouped & Glass Variants
  assert.ok(code.includes('"inset-grouped"'), "Must support inset-grouped variant");
  assert.ok(code.includes('"glass"'), "Must support frosted acrylic glass variant");

  // 4. Apple Typography & Optical Hierarchy
  assert.ok(
    code.includes("text-[15px] font-semibold tracking-[-0.012em]"),
    "CardTitle must use 15px font-semibold with tight letter tracking"
  );
  assert.ok(
    code.includes("text-[12.5px] font-normal leading-relaxed text-gray-500"),
    "CardDescription must use 12.5px font-normal with relaxed leading"
  );
  assert.ok(
    code.includes("text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"),
    "CardSectionHeader must use tracked uppercase header typography"
  );

  // 5. Inset Row Groups & Separators
  assert.ok(
    code.includes('data-slot="card-group"'),
    "CardGroup must be defined with data-slot"
  );
  assert.ok(
    code.includes('data-slot="card-row"'),
    "CardRow must be defined with data-slot"
  );
  assert.ok(
    code.includes('data-slot="card-separator"'),
    "CardSeparator must be defined with data-slot"
  );
});

test("System settings views adopt Apple Inset Grouped card styling", () => {
  // ServiceStandardsTab
  const serviceStandardsPath = path.join(
    ROOT_DIR,
    "src/components/systemadmin/ServiceStandardsTab.js"
  );
  assert.ok(fs.existsSync(serviceStandardsPath));
  const serviceCode = fs.readFileSync(serviceStandardsPath, "utf8");
  assert.ok(
    serviceCode.includes("border-black/[0.08] dark:border-white/10"),
    "ServiceStandardsTab must use Apple hairline border for working days and tier steppers"
  );

  // InstitutionalBrandingTab
  const brandingPath = path.join(
    ROOT_DIR,
    "src/components/systemadmin/InstitutionalBrandingTab.js"
  );
  assert.ok(fs.existsSync(brandingPath));
  const brandingCode = fs.readFileSync(brandingPath, "utf8");
  assert.ok(
    brandingCode.includes("border-black/[0.08] dark:border-white/10"),
    "InstitutionalBrandingTab settings cards must use Apple hairline border"
  );
  assert.ok(
    brandingCode.includes("border-black/[0.06] dark:border-white/[0.08]"),
    "InstitutionalBrandingTab inner seal boxes must use concentric hairline border"
  );

  // ModuleConfigTab
  const moduleConfigPath = path.join(
    ROOT_DIR,
    "src/components/systemadmin/ModuleConfigTab.js"
  );
  assert.ok(fs.existsSync(moduleConfigPath));
  const moduleCode = fs.readFileSync(moduleConfigPath, "utf8");
  assert.ok(
    moduleCode.includes("border-black/[0.08] dark:border-white/10"),
    "ModuleConfigTab ModuleCard must use Apple hairline border"
  );
});
