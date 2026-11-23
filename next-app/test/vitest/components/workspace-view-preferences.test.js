import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import useWorkspaceViewPreference from "@/hooks/useWorkspaceViewPreference";
import useOsasViewPreference from "@/hooks/useOsasViewPreference";
import { workspaceViewPreferenceKey } from "@/lib/viewPreferences";

const { session } = vi.hoisted(() => ({ session: { user: null } }));
vi.mock("@/components/shared/AuthGuard", () => ({ useAuthUser: () => session.user }));

const admin = { id: "registrar-admin", office_id: "registrar", role: "Admin" };
const staff = { id: "registrar-staff", office_id: "registrar", role: "Staff" };
const student = { id: "2026-00001", account_id: 1, role: "Student" };
const columns = ["id", "name", "status"];

beforeEach(() => {
  session.user = null;
  localStorage.clear();
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
});

it("restores Admin columns on remount and keeps them separate by account", () => {
  session.user = admin;
  const useColumns = () => useWorkspaceViewPreference("staff_directory", "visibleColumns", columns);
  const first = renderHook(useColumns);
  act(() => first.result.current[1](["name", "status"]));
  first.unmount();

  const restored = renderHook(useColumns);
  expect(restored.result.current[0]).toEqual(["name", "status"]);
  act(() => restored.result.current[1](["name"]));
  expect(restored.result.current[0]).toEqual(columns);

  act(() => restored.result.current[1](["id", "status"]));
  session.user = { ...admin, id: "another-admin" };
  restored.rerender();
  expect(restored.result.current[0]).toEqual(columns);
});

it("restores Registrar Staff sorting and grouping through the existing Staff hook", () => {
  session.user = staff;
  const useControls = () => ({
    sort: useOsasViewPreference("document_requests", "sortOrder", "DESC"),
    group: useOsasViewPreference("document_requests", "groupBy", "status"),
  });
  const first = renderHook(useControls);
  act(() => {
    first.result.current.sort[1]("ASC");
    first.result.current.group[1]("none");
  });
  first.unmount();

  const restored = renderHook(useControls);
  expect(restored.result.current.sort[0]).toBe("ASC");
  expect(restored.result.current.group[0]).toBe("none");
});

it("restores Student preferences after sign-in and keeps dashboard views independent", () => {
  const useGroup = ({ user, page }) => useWorkspaceViewPreference(page, "groupBy", "none", { user });
  const page = "student_requests";
  const first = renderHook(useGroup, { initialProps: { user: student, page } });
  act(() => first.result.current[1]("status"));
  first.unmount();

  const restored = renderHook(useGroup, { initialProps: { user: null, page } });
  expect(restored.result.current[0]).toBe("none");
  restored.rerender({ user: student, page });
  expect(restored.result.current[0]).toBe("status");
  restored.rerender({ user: student, page: "student_proposals" });
  expect(restored.result.current[0]).toBe("none");

  const key = workspaceViewPreferenceKey(student, page, "groupBy");
  restored.rerender({ user: student, page });
  act(() => {
    localStorage.setItem(key, JSON.stringify("none"));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  });
  expect(restored.result.current[0]).toBe("none");
});

it("restores the Document Checklists grid for the same student account", () => {
  const useChecklistLayout = ({ user }) =>
    useWorkspaceViewPreference("student_compliance", "viewMode", "list", { user });
  const first = renderHook(useChecklistLayout, { initialProps: { user: student } });
  expect(first.result.current[0]).toBe("list");
  act(() => first.result.current[1]("grid"));
  first.unmount();

  const restored = renderHook(useChecklistLayout, { initialProps: { user: null } });
  restored.rerender({ user: { ...student, id: "corrected-student-number" } });
  expect(restored.result.current[0]).toBe("grid");
  restored.rerender({ user: { ...student, account_id: 2 } });
  expect(restored.result.current[0]).toBe("list");
});

it("migrates the old Registrar request layout and preserves the saved OSAS layout", () => {
  const osasStaff = { id: "osas-staff", office_id: "osas", role: "Staff" };
  const keyFor = (user) =>
    workspaceViewPreferenceKey(user, "document_requests", "viewMode", { preserveOsasKey: true });
  const useRequestsLayout = () =>
    useOsasViewPreference("document_requests", "viewMode", "table", {
      legacyKey: "pup_doc_requests_view_mode",
    });

  localStorage.setItem("pup_doc_requests_view_mode", "kanban");
  session.user = staff;
  const first = renderHook(useRequestsLayout);
  expect(first.result.current[0]).toBe("kanban");
  expect(JSON.parse(localStorage.getItem(keyFor(staff)))).toBe("kanban");
  act(() => first.result.current[1]("table"));
  first.unmount();

  const restored = renderHook(useRequestsLayout);
  expect(restored.result.current[0]).toBe("table");
  localStorage.setItem(keyFor(osasStaff), JSON.stringify("list"));
  session.user = osasStaff;
  restored.rerender();
  expect(restored.result.current[0]).toBe("list");
});
