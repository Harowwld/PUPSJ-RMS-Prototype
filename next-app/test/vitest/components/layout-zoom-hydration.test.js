import React from "react";
import { renderToString } from "react-dom/server";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { useLayoutZoom } from "@/hooks/useLayoutZoom";

function ZoomProbe({ user = null }) {
  const { zoomNode, zoomStyle } = useLayoutZoom(user);
  return <div data-testid="zoom" data-node={zoomNode} style={zoomStyle} />;
}

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

test("stored zoom does not change the first browser render before hydration", async () => {
  localStorage.setItem("pup_zoom_node", "6");

  vi.stubGlobal("window", undefined);
  const serverHtml = renderToString(<ZoomProbe />);
  vi.unstubAllGlobals();

  const firstBrowserHtml = renderToString(<ZoomProbe />);
  expect(firstBrowserHtml).toBe(serverHtml);

  render(<ZoomProbe />);
  await waitFor(() => expect(screen.getByTestId("zoom")).toHaveAttribute("data-node", "6"));
});

test("account zoom takes precedence over saved browser zoom after hydration", async () => {
  localStorage.setItem("pup_zoom_node", "6");
  localStorage.setItem("pup_zoom_node_staff-1", "5");
  const user = { id: "staff-1", preferences: { zoom_node: 2 } };

  render(<ZoomProbe user={user} />);
  await waitFor(() => expect(screen.getByTestId("zoom")).toHaveAttribute("data-node", "2"));
  expect(localStorage.getItem("pup_zoom_node_staff-1")).toBe("2");
});
