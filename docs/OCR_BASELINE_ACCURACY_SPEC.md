# OCR Baseline Accuracy Testing Specification & Implementation Plan
## PUPSJ Records Keeping System (PUPSJ-RKS) — Scan & Upload Pipeline

> **Document Type:** Testing & Quality Assurance Technical Specification  
> **Target Subsystem:** `scan_upload` / Local Native OCR & Student Mismatch Detection  
> **Status:** Active QA Specification  
> **Date:** November 2026  

---

## 1. Executive Summary & Testing Objectives

### 1.1 Objective
Establish a rigorous, quantitative accuracy baseline for the offline OCR engine and heuristic extraction pipeline utilized in [`ScanUploadTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/ScanUploadTab.js). 

This testing measures the reliability of the system in extracting critical institutional text tokens—specifically **Student Numbers** and **Student Names**—across diverse document quality tiers, ensuring that the **Student Mismatch Detection Feature** (`mismatchPercent`, $\le 10\%$ difference threshold) functions deterministically and predictably before filing documents into the digital archive.

### 1.2 Core Verification Goals
1. **Token Extraction Reliability:** Measure the exact match rate for Student Numbers (`YYYY-XXXXX-SJ-0`) and Character/Word Error Rates (CER/WER) for Student Names.
2. **Quality Resilience:** Evaluate performance degradation across 5 distinct document quality tiers (Pristine, Low-Resolution/DPI, Skewed/Rotated, Noisy/Artifacts, Low Contrast/Photocopy).
3. **Mismatch Detection Calibration:** Validate sensitivity and specificity of the bounded Levenshtein matcher (`MAX_MISMATCH_RATIO = 0.10`), verifying behavior at boundary thresholds (0%, 5%, 8%, 10%, and >10%).
4. **Latency Budget (SLA):** Measure execution durations across OCR execution (`ocrMs`), coordinate template extraction (`templateMs`), and student roster matching (`matchingMs`).

---

## 2. Architectural Analysis: Current OCR & Mismatch Pipeline

### 2.1 File Dependency & Touchpoint Inventory

| File Path | Role in Pipeline | Key Functions / Responsibilities |
| :--- | :--- | :--- |
| [`next-app/src/components/staff/ScanUploadTab.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/components/staff/ScanUploadTab.js) | UI Layer | Renders upload dropzone, progress skeleton, OCR candidate selection buttons (`{candidate.mismatchPercent}% difference`), and manual assignment controls. |
| [`next-app/src/app/staff/page.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/staff/page.js) | Container / Controller | Invokes `scanFileForSuggestion()`, manages `ocrLoading`, `ocrSuggestion`, and coordinates `onSelectExistingStudent()`. |
| [`next-app/src/lib/ocrClient.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/ocrClient.js) | Client Pipeline Engine | Orchestrates extraction: `detectDocType()`, `extractNameFromCoordinates()`, `detectName()`, `formatToLNFnMi()`, and triggers roster candidate lookup. |
| [`next-app/src/app/api/ingest/ocr/route.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/ingest/ocr/route.js) | Ingestion Route | Secure server-side OCR endpoint. Persists buffer to `.local/temp_ocr/`, invokes native OCR binary, deletes temp file, logs audit entry. |
| [`next-app/src/lib/appleVisionOcr.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/appleVisionOcr.js) | Platform Dispatcher | Routes OCR request to native binary based on operating system (`appleVisionWorkerClient.js` on macOS/Windows, `tesseractOcr.js` on Linux). |
| [`next-app/src/lib/tesseractOcr.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/tesseractOcr.js) | Linux OCR Backend | Converts PDF pages via `pdftoppm` and calls `tesseract stdout tsv` to extract bounding-box observations and lines. |
| [`next-app/src/lib/studentNameMatcher.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/studentNameMatcher.js) | Mismatch Engine | Normalized Levenshtein distance: `matchStudentsByConfiguredOcrName()`, `matchStudentsByOcrText()`, `mergeStudentMatchCandidates()`. |
| [`next-app/src/app/api/recognition/student-match/route.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/app/api/recognition/student-match/route.js) | Matching API | Resolves student candidates against active office roster; returns candidates with `mismatchPercent`. |
| [`next-app/src/lib/ocrStudentRoster.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/ocrStudentRoster.js) | Roster Cache | In-memory 30s TTL cache for active student names and decrypted profile rows from PostgreSQL. |
| [`next-app/src/lib/pdfDocumentGenerators.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/pdfDocumentGenerators.js) | Synthetic Fixtures | Pre-existing institutional PDF generation engine for Form 137, Certificate of Registration, Student ID, and Clearances. |

---

### 2.2 End-to-End Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. User Uploads Scanned File in ScanUploadTab                               │
│    • Client initiates scanFileForSuggestion({ file, docTypes, rotation })   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 2. POST /api/ingest/ocr (Server-Side Native OCR)                            │
│    • Resolves platform engine (Apple Vision / Windows Media / Tesseract)    │
│    • Outputs rawText + pages[].observations[{ text, x, y, width, height }]  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 3. Metadata & Token Extraction (ocrClient.js)                               │
│    • Document Type: detectDocType() scores text against keyword clusters    │
│    • Coordinate PSA: extractNameFromCoordinates() (if PSA template exists)  │
│    • Heuristic Fallback: detectName() multi-strategy scoring                │
│    • Name Normalization: formatToLNFnMi() -> "LASTNAME, FIRSTNAME MI"       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 4. Student Roster Mismatch Comparison (/api/recognition/student-match)      │
│    • Fetches active office students from ocrStudentRoster.js                │
│    • Computes bounded Levenshtein edit distance:                            │
│        cutoff = floor(0.10 * max(ocrLen, studentLen))                       │
│        mismatchPercent = round((distance / maxLen) * 100)                   │
│    • Strict Rule: If distance > cutoff (diff > 10%), candidate is rejected  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│ 5. Staff Assignment UI in ScanUploadTab                                     │
│    • Renders candidate list: "DELA CRUZ, JUAN (2024-00123-SJ-0) • 8% diff"  │
│    • Staff clicks candidate to confirm assignment before filing document    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.3 Critical System Findings & Architectural Insights

1. **Student Number Extraction is Currently Indirect:**
   * `ocrClient.js` currently extracts `docType` and `name`. It does **not** possess an independent `detectStudentNo(rawText)` token extractor.
   * `studentNo` is currently populated in `ScanUploadTab` only after the staff clicks a fuzzy name match returned from the database roster.
   * **Baseline Requirement:** The testing suite must test both:
     * **Direct Student Number OCR Transcribability:** How reliably the OCR engine transcribes the text pattern `YYYY-XXXXX-SJ-0` directly from the raw document stream.
     * **Fuzzy Roster Association:** How reliably the name mismatch engine links to the correct student number in the database.

2. **The 8-Character Name Threshold Cutoff:**
   * In [`studentNameMatcher.js`](file:///home/cendrink/Programming/PUPSJ-RMS-Prototype/next-app/src/lib/studentNameMatcher.js#L67):
     ```javascript
     if (normalizedOcrName.length < 8 || !Array.isArray(students)) return [];
     ```
   * Any student whose normalized letters total fewer than 8 characters (e.g. `PO, ANA` = 5 letters, `SY, BO` = 4 letters) is **categorically rejected** by the candidate matcher, returning zero suggestions regardless of OCR quality. This edge case must be measured in the baseline.

3. **Strict 10% Cutoff Ceiling:**
   * `MAX_MISMATCH_RATIO = 0.10`:
     * 10-letter name: allows at most $\lfloor 0.10 \times 10 \rfloor = 1$ character substitution/deletion/insertion.
     * 20-letter name: allows at most $\lfloor 0.10 \times 20 \rfloor = 2$ character edits.
   * OCR errors under heavy scan degradation (e.g. `O` $\rightarrow$ `0`, `I` $\rightarrow$ `1`, `E` $\rightarrow$ `F`) that cause 3+ character errors immediately cause the candidate to disappear from staff view.

---

## 3. Quantitative Baseline Testing Methodology

### 3.1 Quality Degradation Tiers (Q1 – Q5)

The evaluation suite tests identical ground-truth student records across five standardized document quality tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Quality Tiers                                  │
├─────────┬────────────────────────────┬──────────────────────────────────────┤
│ Tier Q1 │ Pristine Digital           │ 300 DPI, lossless PDF, 0° rotation   │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Tier Q2 │ Compressed / Low Resolution│ 72–150 DPI, JPEG 60% compression     │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Tier Q3 │ Skewed / Rotated           │ ±5°, ±10° feeder skew; 90°/180° rot  │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Tier Q4 │ Noisy / Scan Artifacts     │ Salt & pepper noise, line streaks    │
├─────────┼────────────────────────────┼──────────────────────────────────────┤
│ Tier Q5 │ Low Contrast / Photocopy   │ 40% contrast reduction, faded ink    │
└─────────┴────────────────────────────┴──────────────────────────────────────┘
```

---

### 3.2 Evaluation Metrics & Mathematical Formulations

#### 1. Character Error Rate (CER) — Name Accuracy
$$\text{CER} = \frac{S + D + I}{N}$$
* Where:
  * $S$ = Character substitutions (e.g., `O` recognized as `0`)
  * $D$ = Deletions (missing characters)
  * $I$ = Insertions (spurious characters)
  * $N$ = Total characters in ground truth name

#### 2. Word Error Rate (WER) — Name Token Accuracy
$$\text{WER} = \frac{S_w + D_w + I_w}{N_w}$$
Evaluates whether First Name, Middle Initial, and Surname tokens are recognized as cohesive words.

#### 3. Student Number Exact Match (EM) Rate
$$\text{EM}_{\text{studentNo}} = \frac{\sum_{i=1}^M \mathbb{I}(\text{ExtractedNo}_i = \text{GroundTruthNo}_i)}{M} \times 100\%$$
Measures the percentage of test documents where the full institutional student number (`YYYY-XXXXX-SJ-0` or `YYYY-XXXXX`) is transcribed without a single digit or punctuation corruption.

#### 4. Student Mismatch Detection Reliability
* **True Positive Rate (TPR / Sensitivity):** Correct student candidate is presented in `studentMatches` within the $\le 10\%$ mismatch window.
* **False Positive Rate (FPR):** Unrelated roster students falsely suggested under noise.
* **Threshold Accuracy:** Verification that when synthetic noise introduces an 8% difference, it appears as candidate; when synthetic noise introduces a 12% difference, it is cleanly excluded.

#### 5. Latency Profile (SLA Benchmarks)
* Target: Total processing time $T_{\text{total}} \le 3,000 \text{ ms}$ `[TARGET]`.
* Breakdown: $T_{\text{ocr}} + T_{\text{template}} + T_{\text{nlp}} + T_{\text{matching}}$.

---

## 4. Implementation Plan

### Step 1: Benchmark Dataset & Fixtures Generation
* **Path:** `next-app/test/fixtures/ocr-baseline/`
* Use `pdfDocumentGenerators.js` to generate 20 canonical institutional PDF documents covering:
  * Transcript of Records (TOR)
  * Certificate of Registration (COR) / Enrollment
  * DepEd Form 137 / SF10
  * Student Identification Cards
  * PSA Certificate of Live Birth
* Manifest file (`manifest.json`): Ground-truth pairs recording:
  * `studentNo` (e.g., `2024-00123-SJ-0`)
  * `name` (e.g., `DELA CRUZ, JUAN A.`)
  * `firstName`, `middleName`, `lastName`
  * `docType` (e.g., `Certificate of Registration`)
  * `tier` (Q1 through Q5)

### Step 2: Automated Testing Harness
* **Path:** `next-app/test/ocr-baseline-accuracy.test.mjs`
* Provides a two-tier test runner:
  1. **Headless Fixture Mode:** Evaluates extraction heuristics and mismatch math using pre-recorded OCR observation fixtures (`ocrContext`), executing deterministically in any Linux/CI environment without external binary dependencies.
  2. **Live Native OCR Mode:** Executes against live `/api/ingest/ocr` endpoint when native Apple Vision, Windows Media, or Tesseract runtimes are available.

### Step 3: Baseline Report Generator
* **Path:** `next-app/scripts/run-ocr-baseline.mjs`
* Runs the test matrix across all 5 tiers and compiles a quantitative Markdown report:
  * Breakdown table by Document Type and Quality Tier
  * Mean CER, WER, and Student Number Match %
  * Mismatch Detection Precision / Recall curves
  * Identified Failure Modes and Confusion Matrix (e.g., `0` vs `O`, `1` vs `I`, `8` vs `B`)

### Step 4: (Optional Non-Breaking Feature Enhancement) Direct Student Number Extraction
* Introduce `detectStudentNo(rawText)` in `ocrClient.js` leveraging `PUP_STUDENT_NO_REGEX`.
* Benchmark whether adding direct regex extraction improves Student Number auto-population compared to name-only roster matching.

---

## 5. Potential to Break & Technical Risk Analysis

| Risk Area | Root Cause | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Linux Environment OCR Binary** | Native OCR uses platform binaries. On Linux hosts without `/usr/bin/tesseract`, live OCR throws `ENOENT`. | CI/local tests crash if attempting live OCR on Linux without containerization. | Provide dual-mode testing: Headless observation replay for CI verification + optional live flag (`--live-ocr`) for container/macOS/Windows environments. |
| **Short Student Name Rejection** | Hard-coded cutoff in `studentNameMatcher.js` line 67 (`normalizedOcrName.length < 8`). | 100% false-negative rate on 4–7 letter Filipino student names. | Benchmark documents the 8-char limitation as a measured baseline metric; test boundary edge cases (7 vs 8 letters). |
| **Memory / CPU Overhead** | Generating and transforming multiple 300 DPI multi-page PDF documents in Node.js. | Potential heap exhaustion (`ERR_STRING_TOO_LONG`) or event loop freezing during test execution. | Stream PDF generation in batches of 5 documents; enforce garbage collection / buffer cleanup between quality tiers. |
| **Database Roster Coupling** | `/api/recognition/student-match` queries the PostgreSQL `students` table. | If database is unseeded, roster matches return empty arrays regardless of OCR accuracy. | Decouple evaluation harness using an in-memory test roster containing known target students and controlled distractors. |

---

## 6. Deliverable Checklist

- [x] Technical Architecture Analysis & Call-Flow Mapping
- [x] Document Quality Degradation Tier Definitions (Q1–Q5)
- [x] Mathematical Formulation of Baseline Metrics (CER, WER, EM, TPR/FPR)
- [x] Benchmark Dataset Specification (`manifest.json`)
- [x] Dual-Mode Automated Testing Harness Specification
- [x] Risk & Failure Mode Mitigation Matrix
