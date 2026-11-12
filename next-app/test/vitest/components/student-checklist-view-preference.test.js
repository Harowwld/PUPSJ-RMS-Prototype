import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import StudentComplianceTab from "@/components/student/StudentComplianceTab";

vi.mock("@/components/shared/AuthGuard", () => ({ useAuthUser: () => null }));

it("shows the saved grid layout when Document Checklists is reopened", async () => {
  const authUser = { account_id: 42, role: "Student", client_type: "Student" };
  localStorage.clear();
  vi.stubGlobal("fetch", async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        requirements: [{
          id: 1,
          name: "Birth Certificate",
          docType: "Birth Certificate",
          category: "Personal Records",
        }],
      },
    }),
  }));
  const user = userEvent.setup();
  const first = render(<StudentComplianceTab authUser={authUser} />);

  expect(await screen.findByText("Birth Certificate")).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Birth Certificate" })).toBeNull();

  await user.click(screen.getByRole("tab", { name: "Grid View" }));
  expect(await screen.findByRole("heading", { name: "Birth Certificate" })).toBeVisible();

  first.unmount();
  render(<StudentComplianceTab authUser={authUser} />);
  expect(await screen.findByRole("heading", { name: "Birth Certificate" })).toBeVisible();
});

it("uses the page empty state in both views and resets an unmatched search", async () => {
  localStorage.clear();
  vi.stubGlobal("fetch", async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        requirements: [{ id: 1, name: "Birth Certificate", docType: "Birth Certificate", category: "Personal Records" }],
      },
    }),
  }));
  const user = userEvent.setup();
  render(<StudentComplianceTab />);
  expect(await screen.findByText("Birth Certificate")).toBeVisible();

  await user.type(screen.getByLabelText("Search requirements"), "transcript");
  expect(screen.getByRole("button", { name: 'Remove filter: Search "transcript"' })).toBeVisible();
  const empty = await screen.findByText("No Matches Found");
  expect(empty.closest('[data-slot="empty"]')).toHaveAttribute("data-variant", "page");

  await user.click(screen.getByRole("tab", { name: "Grid View" }));
  expect(screen.getByText("No Matches Found")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Reset Filters" }));
  expect(await screen.findByRole("heading", { name: "Birth Certificate" })).toBeVisible();
});

it("offers public checklist filters and keeps the same group header across list and grid", async () => {
  localStorage.clear();
  vi.stubGlobal("fetch", async () => ({
    ok: true,
    json: async () => ({
      ok: true,
      data: {
        requirements: [{ id: 1, name: "Birth Certificate", docType: "Birth Certificate", category: "Personal Records" }],
      },
    }),
  }));
  const user = userEvent.setup();
  render(<StudentComplianceTab authUser={{ account_id: 43, role: "Student", client_type: "Student" }} />);

  const group = await screen.findByRole("button", { name: "Personal Records, 1" });
  expect(screen.getByRole("button", { name: "Filter" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Sort: Requirement Name" })).toBeVisible();
  await user.click(group);
  await user.click(screen.getByRole("tab", { name: "Grid View" }));
  expect(screen.getByRole("button", { name: "Personal Records, 1" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByText("Birth Certificate")).toBeNull();

  await user.click(screen.getByRole("button", { name: "Group: Category" }));
  expect(screen.queryByRole("button", { name: "Status" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "No grouping" }));
  expect(await screen.findByRole("heading", { name: "Birth Certificate" })).toBeVisible();
});

it("shows a retry for a failed load and checklist guidance after an empty response", async () => {
  localStorage.clear();
  let ok = false;
  vi.stubGlobal("fetch", async () => ({
    ok,
    json: async () => ({ ok, data: { requirements: [] } }),
  }));
  const user = userEvent.setup();
  render(<StudentComplianceTab />);

  expect(await screen.findByText("Could Not Load Document Checklist")).toBeVisible();
  ok = true;
  await user.click(screen.getByRole("button", { name: "Try Again" }));
  expect(await screen.findByText("No Requirements Available")).toBeVisible();
  expect(screen.getByText("Registrar enrollment requirements will appear here when available.")).toBeVisible();
});
