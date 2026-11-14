import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

const workspace = vi.hoisted(() => ({
  user: null,
  params: null,
  push: vi.fn(),
  archiveProps: null,
  sidebarProps: null,
  roster: [],
  organizations: [],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: workspace.push }),
  useSearchParams: () => workspace.params,
}));
vi.mock("@/components/shared/AuthGuard", () => ({
  StaffGuard: ({ children }) => React.cloneElement(children, { authUser: workspace.user }),
  useAuthUser: () => workspace.user,
}));
vi.mock("@/components/shared/Sidebar", () => ({
  default: (props) => {
    workspace.sidebarProps = props;
    return <nav aria-label="Current view">{props.activeKey}</nav>;
  },
}));
vi.mock("@/components/ui/motion", () => ({
  ContentSwap: ({ children }) => <div>{children}</div>,
}));
vi.mock("@/components/staff/DocumentRequestsTab", () => ({ default: () => <div>Request workspace</div> }));
vi.mock("@/components/staff/NotificationsTab", () => ({ default: () => <div>Notification workspace</div> }));
vi.mock("@/components/staff/ScanUploadTab", () => ({ default: () => <div>Upload workspace</div> }));
vi.mock("@/components/staff/RecordsArchiveTab", () => ({
  default: (props) => {
    workspace.archiveProps = props;
    return <output aria-label="Selected records">{[...props.selectedIds].join(",")}</output>;
  },
}));
vi.mock("@/components/staff/GlobalFailedBatchReviewModal", () => ({ default: () => null }));

import StaffPage from "@/app/staff/page";

beforeEach(() => {
  workspace.user = {
    id: "staff-state-test",
    role: "Staff",
    office_id: "registrar",
    enabled_modules: ["document_requests", "notifications", "scan_upload", "records_archive"],
    preferences: {},
  };
  workspace.params = new URLSearchParams("view=requests");
  workspace.roster = [];
  workspace.organizations = [];
  workspace.push.mockClear();
  workspace.archiveProps = null;
  workspace.sidebarProps = null;
  vi.stubGlobal("fetch", vi.fn(async (url) => {
    const path = String(url).split("?")[0];
    const data = path === "/api/students" ? workspace.roster
      : path === "/api/osas/organizations" ? workspace.organizations
      : path === "/api/storage-layout" ? { version: 2, rooms: [] }
      : path === "/api/notifications" ? { unreadCount: 0 }
      : [];
    return { ok: true, json: async () => ({ ok: true, data }) };
  }));
});

test("URL changes and browser back select the matching workspace", () => {
  const page = render(<StaffPage />);
  expect(screen.getByRole("navigation", { name: "Current view" })).toHaveTextContent("requests");
  workspace.params = new URLSearchParams("view=notifications");
  page.rerender(<StaffPage />);
  expect(screen.getByText("Notification workspace")).toBeInTheDocument();
  workspace.params = new URLSearchParams("view=requests");
  page.rerender(<StaffPage />);
  expect(screen.getByText("Request workspace")).toBeInTheDocument();
});

test("child navigation writes the URL used to select the next workspace", () => {
  workspace.params = new URLSearchParams("view=search");
  render(<StaffPage />);
  act(() => workspace.archiveProps.onSwitchView("upload"));
  expect(workspace.push).toHaveBeenCalledWith("/?view=upload", { scroll: false });
});

test("updated module permissions immediately fall back to an enabled workspace", () => {
  workspace.params = new URLSearchParams("view=upload");
  const page = render(<StaffPage />);
  expect(screen.getByText("Upload workspace")).toBeInTheDocument();
  workspace.user = { ...workspace.user, enabled_modules: ["notifications"] };
  page.rerender(<StaffPage />);
  expect(screen.getByText("Notification workspace")).toBeInTheDocument();
  expect(screen.queryByText("Upload workspace")).not.toBeInTheDocument();
});

test("local preference events persist until a fresh authenticated user arrives", () => {
  const page = render(<StaffPage />);
  act(() => window.dispatchEvent(new CustomEvent("user-preferences-changed", {
    detail: { preferences: { zoom_node: 4 } },
  })));
  expect(workspace.sidebarProps.authUser.preferences.zoom_node).toBe(4);
  workspace.user = { ...workspace.user, preferences: { zoom_node: 2 } };
  page.rerender(<StaffPage />);
  expect(workspace.sidebarProps.authUser.preferences.zoom_node).toBe(2);
});

test.each(["registrar", "osas"])("%s refresh retains active and archived selections and removes missing IDs", async (office) => {
  workspace.user = { ...workspace.user, office_id: office };
  workspace.params = new URLSearchParams("view=search");
  workspace.roster = [
    { student_no: "2025-00001", name: "ONE", status: "Active" },
    { student_no: "2025-00002", name: "TWO", status: "Archived" },
  ];
  workspace.organizations = [
    { id: 1, name: "ONE", status: "Active" },
    { id: 2, name: "TWO", status: "Archived" },
  ];
  const selectedIds = office === "osas" ? [1, 2] : ["2025-00001", "2025-00002"];
  render(<StaffPage />);
  await act(async () => workspace.archiveProps.onStudentUpdated());
  act(() => workspace.archiveProps.onSelectionChange(new Set([...selectedIds, "missing"])));
  await act(async () => workspace.archiveProps.onStudentUpdated());
  await waitFor(() => expect(screen.getByLabelText("Selected records")).toHaveTextContent(selectedIds.join(",")));
  workspace.roster = workspace.roster.slice(1);
  workspace.organizations = workspace.organizations.slice(1);
  await act(async () => workspace.archiveProps.onStudentUpdated());
  expect(screen.getByLabelText("Selected records").textContent).toBe(String(selectedIds[1]));
});
