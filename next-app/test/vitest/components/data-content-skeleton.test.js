import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import DataContentSkeleton from "@/components/shared/DataContentSkeleton";
import StaffDirectorySkeleton from "@/components/admin/skeletons/StaffDirectorySkeleton";
import RecordsArchiveSkeleton from "@/components/staff/skeletons/RecordsArchiveSkeleton";

test("loading tables follow the supplied visible columns and expose one action column", () => {
  const { rerender } = render(<DataContentSkeleton columns={["text", "status", "actions"]} rowCount={2} />);
  expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  expect(screen.getAllByRole("row")).toHaveLength(3);
  expect(screen.getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
  rerender(<DataContentSkeleton columns={["text", "actions"]} rowCount={2} />);
  expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  expect(screen.getAllByRole("cell")).toHaveLength(4);
});

test.each(["list", "grid", "kanban"])("%s loading keeps the chosen presentation", (viewMode) => {
  render(<DataContentSkeleton viewMode={viewMode} />);
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Loading records")).toHaveAttribute("aria-busy", "true");
});

test("embedded directory and archive loading cannot duplicate page headings or toolbars", () => {
  const { container } = render(<><StaffDirectorySkeleton rowCount={2} /><RecordsArchiveSkeleton /></>);
  expect(screen.queryByText("Staff Directory")).not.toBeInTheDocument();
  expect(screen.queryByText("Archived")).not.toBeInTheDocument();
  expect(container.querySelector('[data-slot="data-view-toolbar"]')).toBeNull();
});
