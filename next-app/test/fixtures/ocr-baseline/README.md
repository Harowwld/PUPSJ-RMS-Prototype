# OCR baseline synthetic corpus

Run from `next-app/`:

```sh
node test/fixtures/ocr-baseline/generate.mjs
```

The generator uses a fixed seed (`20261108`) and `pdf-lib`, writes the 20 canonical cases in five paired variants, and replaces only this directory's generated `pdfs/` and `manifest.json`. Names and identifiers are fabricated and every page is visibly marked as synthetic. PSA birth certificate variants intentionally omit institutional student numbers; their `studentNo` ground truth is `null` and `printedStudentNo` is `false`. `rosterStudentNo` independently identifies the synthetic roster student for name-association evaluation.

Tier transformations are deterministic print proxies, not scans of real paper documents. Q1 is clean vector output; Q2 scales vector text down (it does not rasterize or JPEG-compress); Q3 rotates the page 90 degrees (it does not simulate feeder skew); Q4 overlays seeded speckles and streaks; Q5 lightens vector ink. The exact parameters and limitations are repeated per tier and case in `manifest.json` so measured results can be interpreted honestly.

The harness agent owns `observations.json`; this generator does not overwrite it.
