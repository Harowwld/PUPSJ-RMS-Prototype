import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import SheetPagination from "@/components/shared/SheetPagination";

it("shows compact record navigation when callers provide totalPages only", () => {
  const onNext = vi.fn();
  const { rerender } = render(
    <SheetPagination compact page={1} totalPages={2} onNext={onNext} nextLabel="Next Student" />,
  );

  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Next Student" }));
  expect(onNext).toHaveBeenCalledOnce();

  rerender(<SheetPagination compact page={2} totalPages={2} nextLabel="Next Student" />);
  expect(screen.getByRole("button", { name: "Next Student" })).toBeDisabled();
});

it("keeps full pagination hidden for an empty collection", () => {
  render(<SheetPagination totalPages={1} totalCount={0} />);
  expect(screen.queryByRole("navigation")).toBeNull();
});
