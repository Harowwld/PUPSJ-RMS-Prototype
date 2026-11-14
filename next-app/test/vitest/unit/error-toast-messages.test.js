import { expect, it } from "vitest";
import { formatErrorMessage } from "@/lib/errorUtils";

it("keeps a specific next step when the server denies an action", () => {
  expect(formatErrorMessage({
    status: 403,
    error: "Complete account setup before submitting a request.",
  }).description).toBe("Complete account setup before submitting a request.");
});

it("does not describe unrelated record conflicts as duplicate documents", () => {
  expect(formatErrorMessage({ status: 409 }, { title: "Couldn’t Save Changes" })).toEqual({
    title: "Couldn’t Save Changes",
    description: "Refresh the record to see the latest changes, then try again.",
  });
});
