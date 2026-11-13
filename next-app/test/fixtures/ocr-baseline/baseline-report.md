# OCR accuracy baseline

## Acronym legend

| Acronym | Meaning |
|---|---|
| OCR | Optical Character Recognition; software that converts text in images or scanned documents into machine-readable text. |
| CER | Character Error Rate; character-level edit errors divided by the number of characters in the reference text. |
| WER | Word Error Rate; word-level edit errors divided by the number of words in the reference text. |
| TP | True Positive; the correct student appears among the suggested roster candidates. |
| FN | False Negative; the correct student is missing from the suggested roster candidates. |
| FP | False Positive; an unrelated student appears among the suggested roster candidates. |
| TN | True Negative; an unrelated roster student is correctly not suggested. |
| FPR | False Positive Rate; unrelated students suggested divided by all unrelated-student opportunities. |
| DPI | Dots Per Inch; a measure of image or print resolution. |
| PDF | Portable Document Format; the file format used for the benchmark documents. |
| PSA | Philippine Statistics Authority. |
| SF10 | School Form 10; the learner's permanent academic record (formerly Form 137). |
| N/A | Not Available or Not Applicable; no value is reported for that measure. |

Quality tiers: **Q1** = pristine digital, **Q2** = reduced text-size proxy, **Q3** = 90° page rotation, **Q4** = synthetic speckle/streak artifacts, and **Q5** = faded-ink proxy. These are synthetic document-quality proxies, not physical scans.

Generated Nov 8, 2026, 6:48:59 AM GMT+8 (Asia/Manila). Fixture schema 1, seed 20261108. Replay observations are constructed deterministically from synthetic fixture labels, not captured engine output.

## Metric definitions

Names are normalized with Unicode NFD, combining marks removed, uppercase, punctuation converted to spaces, and whitespace collapsed. CER removes spaces and divides character Levenshtein edits by reference letters; WER divides token Levenshtein edits by reference words. Empty extracted names count as full deletion. Macro CER/WER are means of per-document normalized rates; micro values are total edits divided by total reference letters/words.

Direct student-number exact match uses a raw-text regex and exact equality. Only the 80 printed-number documents enter the denominator; the 20 PSA documents without printed numbers are excluded. Roster returns never count as OCR transcription. Association is eligible for a synthetic target whose ground-truth normalized name has at least eight letters. TP/FN indicate target candidate found/missed. FP/TN indicate unrelated candidates returned/not returned over roster-length-minus-one distractors per eligible document; FPR denominator is those distractor opportunities.

Tier caveats: Q2 reduces vector text size, not JPEG/raster compression; Q3 rotates the page 90°, not ±5°/±10° feeder skew; Q4 adds synthetic speckle/streak artifacts; Q5 fades vector ink, not a physical photocopy.


## Verified metric aggregation and native detail

CER/WER aggregate values are macro means of per-document rates; micro rates sum edit counts over total reference characters/words. Direct-number denominators count only documents with a printed number. Native OCR failures are retained in attempted sample counts and the case table; accuracy metrics use successful samples only.

### Replay aggregate

| Measure | Result |
|---|---:|
| CER macro / micro | 0.233 / 0.232 |
| WER macro / micro | 0.390 / 0.387 |
| Direct student number exact | 80/80 (100.0%) |
| Association TP / FN | 61 / 39 of 100 |
| Candidate FP / TN | 0 / 1900 of 1900 distractor opportunities |
| Precision / recall / FPR | 100.0% / 61.0% / 0.0% |

| Document type | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Certificate of Registration | 20 | 20/20 | 0.157 | 0.367 | 20/20 | 13/7 | 0/380 | 0.0% (0/380) |
| Form 137 / SF10 | 20 | 20/20 | 0.358 | 0.467 | 20/20 | 10/10 | 0/380 | 0.0% (0/380) |
| PSA Certificate of Live Birth | 20 | 20/20 | 0.277 | 0.417 | 0/0 | 12/8 | 0/380 | 0.0% (0/380) |
| Student ID | 20 | 20/20 | 0.245 | 0.383 | 20/20 | 10/10 | 0/380 | 0.0% (0/380) |
| Transcript of Records | 20 | 20/20 | 0.131 | 0.317 | 20/20 | 16/4 | 0/380 | 0.0% (0/380) |

| Quality tier | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Q1 | 20 | 20/20 | 0.000 | 0.000 | 16/16 | 20/0 | 0/380 | 0.0% (0/380) |
| Q2 | 20 | 20/20 | 0.225 | 0.396 | 16/16 | 16/4 | 0/380 | 0.0% (0/380) |
| Q3 | 20 | 20/20 | 0.225 | 0.396 | 16/16 | 16/4 | 0/380 | 0.0% (0/380) |
| Q4 | 20 | 20/20 | 0.332 | 0.579 | 16/16 | 4/16 | 0/380 | 0.0% (0/380) |
| Q5 | 20 | 20/20 | 0.384 | 0.579 | 16/16 | 5/15 | 0/380 | 0.0% (0/380) |

### Native execution

Platform: darwin; engine: apple-vision; attempted 100, successful 100, failed 0. Name CER/WER use the actual OCR text through production detectName/formatToLNFnMi before roster substitution. Synthetic-roster matching runs the production matcher against fixture ground truth. The OCR route does not return coordinate templates, so native template extraction timing is unavailable. End-to-end includes the authenticated OCR request, name extraction, and matcher. Target is 3,000 ms.

| Measure | Result |
|---|---:|
| CER macro / micro | 0.160 / 0.161 |
| WER macro / micro | 0.160 / 0.161 |
| Direct number exact | 80/80 (100.0%) |
| Association TP / FN | 84 / 16 |
| Candidate FP / TN | 0 / 1900 of 1900 distractor opportunities |
| Precision / recall / FPR | 100.0% / 84.0% / 0.0% |
| OCR / template / name processing / matching mean | 124.6 / N/A / 0.163 / 0.240 ms |
| End-to-end mean | 158.6 ms; meets 3,000 ms target |

| Document type | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Certificate of Registration | 20 | 20/20 | 0.200 | 0.200 | 20/20 | 16/4 | 0/380 | 0.0% (0/380) |
| Form 137 / SF10 | 20 | 20/20 | 0.200 | 0.200 | 20/20 | 16/4 | 0/380 | 0.0% (0/380) |
| PSA Certificate of Live Birth | 20 | 20/20 | 0.000 | 0.000 | 0/0 | 20/0 | 0/380 | 0.0% (0/380) |
| Student ID | 20 | 20/20 | 0.200 | 0.200 | 20/20 | 16/4 | 0/380 | 0.0% (0/380) |
| Transcript of Records | 20 | 20/20 | 0.200 | 0.200 | 20/20 | 16/4 | 0/380 | 0.0% (0/380) |

| Quality tier | n | successful/n | CER macro | WER macro | number exact/n | TP/FN | FP/TN | FPR (FP/opportunities) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Q1 | 20 | 20/20 | 0.000 | 0.000 | 16/16 | 20/0 | 0/380 | 0.0% (0/380) |
| Q2 | 20 | 20/20 | 0.000 | 0.000 | 16/16 | 20/0 | 0/380 | 0.0% (0/380) |
| Q3 | 20 | 20/20 | 0.800 | 0.800 | 16/16 | 4/16 | 0/380 | 0.0% (0/380) |
| Q4 | 20 | 20/20 | 0.000 | 0.000 | 16/16 | 20/0 | 0/380 | 0.0% (0/380) |
| Q5 | 20 | 20/20 | 0.000 | 0.000 | 16/16 | 20/0 | 0/380 | 0.0% (0/380) |

| Case | Type | Tier | Status | CER | WER | Number transcription | Roster candidate |
|---|---|---|---|---:|---:|---|---|
| canonical-01-Q1 | Transcript of Records | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-01-Q2 | Transcript of Records | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-01-Q3 | Transcript of Records | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-01-Q4 | Transcript of Records | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-01-Q5 | Transcript of Records | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-02-Q1 | Transcript of Records | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-02-Q2 | Transcript of Records | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-02-Q3 | Transcript of Records | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-02-Q4 | Transcript of Records | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-02-Q5 | Transcript of Records | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-03-Q1 | Transcript of Records | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-03-Q2 | Transcript of Records | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-03-Q3 | Transcript of Records | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-03-Q4 | Transcript of Records | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-03-Q5 | Transcript of Records | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-04-Q1 | Transcript of Records | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-04-Q2 | Transcript of Records | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-04-Q3 | Transcript of Records | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-04-Q4 | Transcript of Records | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-04-Q5 | Transcript of Records | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-05-Q1 | Certificate of Registration | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-05-Q2 | Certificate of Registration | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-05-Q3 | Certificate of Registration | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-05-Q4 | Certificate of Registration | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-05-Q5 | Certificate of Registration | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-06-Q1 | Certificate of Registration | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-06-Q2 | Certificate of Registration | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-06-Q3 | Certificate of Registration | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-06-Q4 | Certificate of Registration | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-06-Q5 | Certificate of Registration | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-07-Q1 | Certificate of Registration | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-07-Q2 | Certificate of Registration | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-07-Q3 | Certificate of Registration | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-07-Q4 | Certificate of Registration | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-07-Q5 | Certificate of Registration | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-08-Q1 | Certificate of Registration | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-08-Q2 | Certificate of Registration | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-08-Q3 | Certificate of Registration | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-08-Q4 | Certificate of Registration | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-08-Q5 | Certificate of Registration | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-09-Q1 | Form 137 / SF10 | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-09-Q2 | Form 137 / SF10 | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-09-Q3 | Form 137 / SF10 | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-09-Q4 | Form 137 / SF10 | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-09-Q5 | Form 137 / SF10 | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-10-Q1 | Form 137 / SF10 | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-10-Q2 | Form 137 / SF10 | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-10-Q3 | Form 137 / SF10 | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-10-Q4 | Form 137 / SF10 | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-10-Q5 | Form 137 / SF10 | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-11-Q1 | Form 137 / SF10 | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-11-Q2 | Form 137 / SF10 | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-11-Q3 | Form 137 / SF10 | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-11-Q4 | Form 137 / SF10 | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-11-Q5 | Form 137 / SF10 | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-12-Q1 | Form 137 / SF10 | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-12-Q2 | Form 137 / SF10 | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-12-Q3 | Form 137 / SF10 | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-12-Q4 | Form 137 / SF10 | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-12-Q5 | Form 137 / SF10 | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-13-Q1 | Student ID | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-13-Q2 | Student ID | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-13-Q3 | Student ID | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-13-Q4 | Student ID | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-13-Q5 | Student ID | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-14-Q1 | Student ID | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-14-Q2 | Student ID | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-14-Q3 | Student ID | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-14-Q4 | Student ID | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-14-Q5 | Student ID | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-15-Q1 | Student ID | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-15-Q2 | Student ID | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-15-Q3 | Student ID | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-15-Q4 | Student ID | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-15-Q5 | Student ID | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-16-Q1 | Student ID | Q1 | ok | 0.000 | 0.000 | exact | TP |
| canonical-16-Q2 | Student ID | Q2 | ok | 0.000 | 0.000 | exact | TP |
| canonical-16-Q3 | Student ID | Q3 | ok | 1.000 | 1.000 | exact | FN |
| canonical-16-Q4 | Student ID | Q4 | ok | 0.000 | 0.000 | exact | TP |
| canonical-16-Q5 | Student ID | Q5 | ok | 0.000 | 0.000 | exact | TP |
| canonical-17-Q1 | PSA Certificate of Live Birth | Q1 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-17-Q2 | PSA Certificate of Live Birth | Q2 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-17-Q3 | PSA Certificate of Live Birth | Q3 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-17-Q4 | PSA Certificate of Live Birth | Q4 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-17-Q5 | PSA Certificate of Live Birth | Q5 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-18-Q1 | PSA Certificate of Live Birth | Q1 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-18-Q2 | PSA Certificate of Live Birth | Q2 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-18-Q3 | PSA Certificate of Live Birth | Q3 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-18-Q4 | PSA Certificate of Live Birth | Q4 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-18-Q5 | PSA Certificate of Live Birth | Q5 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-19-Q1 | PSA Certificate of Live Birth | Q1 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-19-Q2 | PSA Certificate of Live Birth | Q2 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-19-Q3 | PSA Certificate of Live Birth | Q3 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-19-Q4 | PSA Certificate of Live Birth | Q4 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-19-Q5 | PSA Certificate of Live Birth | Q5 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-20-Q1 | PSA Certificate of Live Birth | Q1 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-20-Q2 | PSA Certificate of Live Birth | Q2 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-20-Q3 | PSA Certificate of Live Birth | Q3 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-20-Q4 | PSA Certificate of Live Birth | Q4 | ok | 0.000 | 0.000 | not printed | TP |
| canonical-20-Q5 | PSA Certificate of Live Birth | Q5 | ok | 0.000 | 0.000 | not printed | TP |

| Failed sample | Type | Tier | Error |
|---|---|---|---|
| None | — | — | — |

Native measurements apply only to darwin. Windows Media and Linux/Tesseract are untested.
## Substitutions and failure modes

Replay substitutions are constructed fixture observations; native substitutions are counted from native OCR output before roster substitution.

| Replay truth → OCR | Count |
|---|---:|
| R→Z | 16 |
| U→Z | 12 |
| L→Z | 11 |
| N→Z | 9 |
| E→F | 9 |
| V→Z | 8 |
| O→E | 6 |
| T→Z | 5 |

| Native truth → OCR | Count |
|---|---:|
| None observed | 0 |

- Replay rows with name error, number mismatch, or missed target: 80/100; sample identities and measurements are retained in baseline-results.json.
- Native request failures: 0/100; failed cases remain in the native case table and JSON.
- On this constructed Q3 tier, whole-page 90° rotation caused 16 name/roster misses among 16 numbered documents, while printed-number transcription remained 16/16. This is specific to the fixture transformation, not ordinary feeder skew.
