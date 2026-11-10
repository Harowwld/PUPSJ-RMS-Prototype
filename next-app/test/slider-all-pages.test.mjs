import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("../", import.meta.url));

test("1. AccountSettingsPanel integrates Slider for Volume while preserving standard Layout Zoom controls", () => {
  const panelSource = fs.readFileSync(
    path.join(appRoot, "src/components/shared/AccountSettingsPanel.js"),
    "utf8"
  );

  assert.ok(
    panelSource.includes('import { Slider } from "@/components/ui/slider";'),
    "AccountSettingsPanel must import Slider component"
  );

  // Volume Slider
  assert.ok(
    panelSource.includes('<Slider') && panelSource.includes('label="Volume"'),
    "AccountSettingsPanel must render Volume Slider"
  );

  // Interface Layout Zoom should NOT use Slider (uses standard radiogroup cards)
  assert.ok(
    !panelSource.includes('label="Zoom"'),
    "AccountSettingsPanel must not render Slider for layout zoom"
  );
  assert.ok(
    panelSource.includes('aria-label="Interface layout zoom"'),
    "Interface Layout Zoom must preserve standard radiogroup accessibility"
  );
});

test("2. BatchReviewTab integrates Slider for OCR Bounding Box Opacity with persistence and 100% default", () => {
  const batchSource = fs.readFileSync(
    path.join(appRoot, "src/components/staff/BatchReviewTab.js"),
    "utf8"
  );

  assert.ok(
    batchSource.includes('import { Slider } from "@/components/ui/slider";'),
    "BatchReviewTab must import Slider component"
  );
  assert.ok(
    batchSource.includes('label="Opacity"'),
    "BatchReviewTab must render Opacity Slider matching the reference image"
  );
  assert.ok(
    batchSource.includes("overlayOpacity / 100"),
    "BatchReviewTab must bind overlayOpacity state to OCR bounding box styles"
  );
  assert.ok(
    batchSource.includes("pup_ocr_overlay_opacity"),
    "BatchReviewTab must persist overlayOpacity via localStorage"
  );
});

test("3. StorageLayoutEditorTab integrates Slider for Blueprint Grid Opacity with persistence, clear label, and 100% default", () => {
  const layoutSource = fs.readFileSync(
    path.join(appRoot, "src/components/admin/StorageLayoutEditorTab.js"),
    "utf8"
  );
  const canvasSource = fs.readFileSync(
    path.join(appRoot, "src/components/admin/storage-layout/CabinetCanvas.js"),
    "utf8"
  );

  assert.ok(
    layoutSource.includes('import { Slider } from "@/components/ui/slider"'),
    "StorageLayoutEditorTab must import Slider component"
  );
  assert.ok(
    layoutSource.includes('label="Opacity"'),
    "StorageLayoutEditorTab must use clear 'Opacity' label instead of 'Grid'"
  );
  assert.ok(
    layoutSource.includes("pup_storage_grid_opacity"),
    "StorageLayoutEditorTab must persist gridOpacity via localStorage key pup_storage_grid_opacity"
  );
  assert.ok(
    layoutSource.includes("return 100"),
    "StorageLayoutEditorTab must default gridOpacity to 100%"
  );
  assert.ok(
    layoutSource.includes("gridOpacity={gridOpacity}"),
    "StorageLayoutEditorTab must pass gridOpacity to CabinetCanvas"
  );
  assert.ok(
    canvasSource.includes("gridOpacity = 100"),
    "CabinetCanvas must default gridOpacity prop to 100"
  );
});

test("4. PDFPreviewModal integrates Slider for Document Zoom with persistence", () => {
  const pdfModalSource = fs.readFileSync(
    path.join(appRoot, "src/components/shared/PDFPreviewModal.js"),
    "utf8"
  );

  assert.ok(
    pdfModalSource.includes('import { Slider } from "@/components/ui/slider"'),
    "PDFPreviewModal must import Slider component"
  );
  assert.ok(
    pdfModalSource.includes('label="Zoom"'),
    "PDFPreviewModal must render Zoom Slider"
  );
  assert.ok(
    pdfModalSource.includes("zoomLevel"),
    "PDFPreviewModal must manage zoomLevel state"
  );
  assert.ok(
    pdfModalSource.includes("pup_pdf_preview_zoom"),
    "PDFPreviewModal must persist zoomLevel via localStorage"
  );
});

test("5. SlaFilters keeps clean toolbar without slider", () => {
  const slaFiltersSource = fs.readFileSync(
    path.join(appRoot, "src/components/admin/analytics/SlaFilters.js"),
    "utf8"
  );
  const slaTabSource = fs.readFileSync(
    path.join(appRoot, "src/components/admin/SLAAnalyticsTab.js"),
    "utf8"
  );

  assert.ok(
    !slaFiltersSource.includes('import { Slider } from "@/components/ui/slider"'),
    "SlaFilters must not import Slider component"
  );
  assert.ok(
    !slaFiltersSource.includes('label="SLA Target"'),
    "SlaFilters must not render SLA Target Slider"
  );
  assert.ok(
    !slaTabSource.includes("targetSlaHours"),
    "SLAAnalyticsTab must not have targetSlaHours state"
  );
});
