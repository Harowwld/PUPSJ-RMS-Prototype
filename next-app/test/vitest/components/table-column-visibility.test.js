import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { Table } from "@/components/ui/table";

function Records({ controlsOnly = false } = {}) {
  const [showTitle, setShowTitle] = useState(true);
  const columns = [
    ...(showTitle ? [{ kind: "text", minWidth: 320, maxWidth: 420 }] : []),
    ...(controlsOnly ? [] : [{ kind: "text", minWidth: 190, maxWidth: 340 }]),
    ...(controlsOnly ? ["selection"] : [{ kind: "status", width: 120 }]),
    "actions",
  ];
  return (
    <>
      <label><input type="checkbox" checked={showTitle} onChange={(event) => setShowTitle(event.target.checked)} />Proposal Name</label>
      <div style={{ overflowX: "auto" }}>
        <Table columns={columns}>
          <thead><tr>{showTitle && <th>Proposal</th>}{controlsOnly ? <th /> : <><th>Organization</th><th>Status</th></>}<th>Actions</th></tr></thead>
          <tbody>
            <tr><td colSpan={columns.length}>Submitted Records</td></tr>
            <tr>{showTitle && <td>Campus outreach proposal</td>}{controlsOnly ? <td /> : <><td>Student Volunteer Association</td><td>Approved</td></>}<td /></tr>
          </tbody>
        </Table>
      </div>
    </>
  );
}

test("hiding and restoring a proposal column keeps sizing and semantics on the visible cells", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(450);
  render(<Records />);
  const table = screen.getByRole("table");
  const widths = () => Array.from(table.querySelectorAll("col"), (col) => col.style.width);
  expect(widths()).toEqual(["320px", "242px", "120px", "48px"]);
  expect(table.style.width).toBe("730px");

  fireEvent.click(screen.getByRole("checkbox", { name: "Proposal Name" }));
  expect(widths()).toEqual(["282px", "120px", "48px"]);
  expect(table.style.width).toBe("450px");
  expect(within(table).queryByRole("columnheader", { name: "Proposal" })).toBeNull();
  expect(within(table).getByRole("cell", { name: "Approved" })).toHaveAttribute("data-kind", "status");
  expect(within(table).getByRole("cell", { name: "Submitted Records" })).toHaveAttribute("colspan", "3");

  fireEvent.click(screen.getByRole("checkbox", { name: "Proposal Name" }));
  expect(widths()).toEqual(["320px", "242px", "120px", "48px"]);
  expect(within(table).getByRole("cell", { name: "Submitted Records" })).toHaveAttribute("colspan", "4");
});

test("the table fills a wide viewport after remaining text reaches its preferred width", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  render(<Records />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Proposal Name" }));
  const table = screen.getByRole("table");
  expect(table.style.width).toBe("1200px");
  expect(Array.from(table.querySelectorAll("col"), (col) => col.style.width)).toEqual(["1032px", "120px", "48px"]);
});

test("the table still fills the viewport when only selection and actions remain", () => {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(1200);
  render(<Records controlsOnly />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Proposal Name" }));
  const table = screen.getByRole("table");
  expect(table.style.width).toBe("100%");
  expect(Array.from(table.querySelectorAll("col"), (col) => col.style.width)).toEqual(["48px", "", "48px"]);
  expect(within(table).getByRole("cell", { name: "Submitted Records" })).toHaveAttribute("colspan", "3");
});
