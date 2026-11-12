import { renderHook, act, render, fireEvent, screen } from "@testing-library/react";
import React from "react";
import { expect, test, vi } from "vitest";
import useTableScroll from "@/hooks/useTableScroll";
import TableScrollControls from "@/components/shared/TableScrollControls";
import { TooltipProvider } from "@/components/ui/tooltip";

test("useTableScroll exports scrollTable and handles scroll actions safely", () => {
  const { result } = renderHook(() => useTableScroll([]));

  expect(typeof result.current.scrollTable).toBe("function");
  expect(typeof result.current.scrollLeft).toBe("function");
  expect(typeof result.current.scrollRight).toBe("function");
  expect(typeof result.current.resetScroll).toBe("function");

  const mockContainer = {
    scrollLeft: 100,
    scrollWidth: 1000,
    clientWidth: 500,
    scrollBy: vi.fn(),
    scrollTo: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    querySelector: vi.fn().mockReturnValue(null),
  };
  result.current.tableContainerRef.current = mockContainer;

  act(() => {
    result.current.scrollTable("left");
  });
  expect(mockContainer.scrollBy).toHaveBeenCalledWith(
    expect.objectContaining({ left: -400 })
  );

  act(() => {
    result.current.scrollTable("right");
  });
  expect(mockContainer.scrollBy).toHaveBeenCalledWith(
    expect.objectContaining({ left: 400 })
  );

  act(() => {
    result.current.scrollTable(250);
  });
  expect(mockContainer.scrollBy).toHaveBeenCalledWith(
    expect.objectContaining({ left: 250 })
  );

  act(() => {
    result.current.resetScroll();
  });
  expect(mockContainer.scrollTo).toHaveBeenCalledWith(
    expect.objectContaining({ left: 0 })
  );
});

test("TableScrollControls triggers scrollTable callback on left and right clicks", () => {
  const onScrollLeft = vi.fn();
  const onScrollRight = vi.fn();
  const onResetScroll = vi.fn();

  render(
    <TooltipProvider>
      <TableScrollControls
        canScrollLeft={true}
        canScrollRight={true}
        isScrolledX={true}
        onResetScroll={onResetScroll}
        onScrollLeft={onScrollLeft}
        onScrollRight={onScrollRight}
      />
    </TooltipProvider>
  );

  fireEvent.click(screen.getByRole("button", { name: /scroll table left/i }));
  expect(onScrollLeft).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: /scroll table right/i }));
  expect(onScrollRight).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: /reset scroll/i }));
  expect(onResetScroll).toHaveBeenCalled();
});
