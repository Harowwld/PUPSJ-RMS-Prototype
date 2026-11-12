import { expect, it } from "vitest";
import { isFutureManilaCalendarDate, isInManilaDateRange } from "@/lib/timeFormat";

it("includes the entire selected Manila day, even when it starts on the prior UTC date", () => {
  const day = "2026-11-12";
  expect(isInManilaDateRange("2026-11-11T19:38:00Z", day, day)).toBe(true);
  expect(isInManilaDateRange(day, day, day)).toBe(true);
  expect(isInManilaDateRange("2026-11-11 19:38:00", day, day)).toBe(true);
  expect(isInManilaDateRange("2026-11-11T16:00:00Z", day, day)).toBe(true);
  expect(isInManilaDateRange("2026-11-12T15:59:59.999Z", day, day)).toBe(true);
  expect(isInManilaDateRange("2026-11-11T15:59:59.999Z", day, day)).toBe(false);
  expect(isInManilaDateRange("2026-11-12T16:00:00Z", day, day)).toBe(false);
});

it("handles open-ended ranges and undated requests", () => {
  const day = "2026-11-12";
  expect(isInManilaDateRange("2026-11-13T00:00:00Z", day, "")).toBe(true);
  expect(isInManilaDateRange("2026-11-11T00:00:00Z", "", day)).toBe(true);
  expect(isInManilaDateRange(null, day, day)).toBe(false);
  expect(isInManilaDateRange(null, "", "")).toBe(true);
});

it("requires proposal dates to be strictly after today in Manila", () => {
  const now = new Date("2026-11-11T19:38:00Z");
  expect(isFutureManilaCalendarDate("2026-11-11", now)).toBe(false);
  expect(isFutureManilaCalendarDate("2026-11-12", now)).toBe(false);
  expect(isFutureManilaCalendarDate("2026-11-13", now)).toBe(true);
  expect(isFutureManilaCalendarDate("2026-11-31", now)).toBe(false);
  expect(isFutureManilaCalendarDate("", now)).toBe(false);
});
