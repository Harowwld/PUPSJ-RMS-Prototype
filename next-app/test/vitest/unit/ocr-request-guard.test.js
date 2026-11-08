import { describe, expect, it } from "vitest";
import { createOcrRequestGuard } from "@/lib/ocrRequestGuard";

describe("OCR request guard", () => {
  it("accepts the active request for the same file and rejects a prior file request", () => {
    const guard = createOcrRequestGuard();
    const firstFile = { name: "first.pdf" };
    const secondFile = { name: "second.pdf" };

    const firstRequest = guard.begin(firstFile);
    expect(guard.isCurrent(firstRequest, firstFile)).toBe(true);

    const secondRequest = guard.begin(secondFile);
    expect(guard.isCurrent(firstRequest, firstFile)).toBe(false);
    expect(guard.isCurrent(secondRequest, secondFile)).toBe(true);
  });

  it("rejects an older retry even when the same file is selected again", () => {
    const guard = createOcrRequestGuard();
    const file = { name: "retry.pdf" };

    const firstAttempt = guard.begin(file);
    const retry = guard.begin(file);

    expect(guard.isCurrent(firstAttempt, file)).toBe(false);
    expect(guard.isCurrent(retry, file)).toBe(true);
  });

  it("invalidates a pending request when selection is cleared", () => {
    const guard = createOcrRequestGuard();
    const file = { name: "pending.pdf" };
    const request = guard.begin(file);

    guard.invalidate();

    expect(guard.isCurrent(request, file)).toBe(false);
  });
});
