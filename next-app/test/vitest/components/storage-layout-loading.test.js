import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import StorageLayoutEditorTab from "@/components/admin/StorageLayoutEditorTab";

test("storage layout shows disabled room controls and a skeleton before the layout arrives", () => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  const fetchLayout = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
  try {
    const { unmount } = render(<StorageLayoutEditorTab />);
    try {
      expect(screen.getByText("Storage Layout Editor")).toBeVisible();
      expect(screen.getByRole("button", { name: "Delete Room" })).toBeDisabled();
      expect(screen.getByLabelText("Loading storage layout")).toBeVisible();
    } finally {
      unmount();
    }
  } finally {
    fetchLayout.mockRestore();
    vi.unstubAllGlobals();
  }
});
