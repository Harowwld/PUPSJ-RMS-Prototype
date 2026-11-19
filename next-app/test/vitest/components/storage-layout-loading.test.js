import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

test("Canvas route testing stays enabled when the admin selects another cabinet", async () => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  const room = {
    id: 1,
    name: "Archive",
    door: { x: 0.975, y: 0.4, w: 0.025, h: 0.2, rotation: 90 },
    cabinets: [
      { id: "A", rect: { x: 0.15, y: 0.15, w: 0.15, h: 0.2 }, drawerIds: [1] },
      { id: "B", rect: { x: 0.65, y: 0.65, w: 0.15, h: 0.2 }, drawerIds: [1] },
    ],
  };
  const fetchLayout = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => ({
    ok: true,
    json: async () => ({ ok: true, data: url === "/api/storage-layout" ? { rooms: [room] } : [] }),
  }));
  try {
    const { container } = render(<StorageLayoutEditorTab />);
    const cabinet = await screen.findByTitle("Cabinet A");
    const route = () => container.querySelector('[data-slot="storage-route"]');
    const selectCabinet = (element) => {
      fireEvent.pointerDown(element, { pointerId: 1, clientX: 20, clientY: 20 });
      fireEvent.pointerUp(element, { pointerId: 1 });
    };
    const testMode = screen.getByRole("switch", { name: "Test Cabinet Route" });
    fireEvent.click(testMode);
    expect(route()).toBeNull();

    selectCabinet(cabinet);
    expect(route().firstElementChild).toHaveStyle({ left: "97.5%", top: "50%" });
    const firstDestination = route().lastElementChild.style.cssText;

    selectCabinet(screen.getByTitle("Cabinet B"));
    expect(route().lastElementChild.style.cssText).not.toBe(firstDestination);
    expect(testMode).toBeChecked();

    fireEvent.click(testMode);
    expect(route()).toBeNull();
  } finally {
    if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", scrollDescriptor);
    else delete HTMLElement.prototype.scrollIntoView;
    fetchLayout.mockRestore();
    vi.unstubAllGlobals();
  }
});
