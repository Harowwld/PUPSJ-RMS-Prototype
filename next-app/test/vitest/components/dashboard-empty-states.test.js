import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import DigitalRecordsReviewTab from "@/components/admin/DigitalRecordsReviewTab";
import DocumentRequestsTab from "@/components/staff/DocumentRequestsTab";
import OsasMonitoringTab from "@/components/staff/OsasMonitoringTab";
import StudentOrganizationsTab from "@/components/staff/StudentOrganizationsTab";
import CampusOperationsTab from "@/components/systemadmin/CampusOperationsTab";
import OfficeManagementTab from "@/components/systemadmin/OfficeManagementTab";
import OdrsPortalAccountsTab from "@/components/systemadmin/OdrsPortalAccountsTab";

const { router, searchParams } = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
  usePathname: () => "/",
}));
vi.mock("@/components/shared/AuthGuard", () => ({ useAuthUser: () => null }));
vi.mock("@/components/shared/DateRangePickerModal", () => ({
  DateRangeFilterButton: ({ onApply }) => (
    <button onClick={() => onApply({ startDate: "2026-11-12", endDate: "2026-11-12" })}>
      Apply date filter
    </button>
  ),
}));

const showToast = vi.fn();

function response(data, ok = true) {
  return { ok, json: async () => ({ ok, data, total: data.length }) };
}

async function retryFrom(title) {
  const message = await screen.findByText(title);
  fireEvent.click(within(message.closest('[data-slot="empty"]')).getByRole("button", { name: "Try Again" }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("fetch", async () => response([]));
});

it("recovers from a Superadmin department load failure", async () => {
  let attempts = 0;
  vi.stubGlobal("fetch", async (url) => {
    return response([], !String(url).startsWith("/api/offices?stats=true") || ++attempts > 1);
  });
  render(<OfficeManagementTab showToast={showToast} />);
  await retryFrom("Could Not Load Departments");
  expect(await screen.findByText("No Departments Found")).toBeVisible();
});

it("resets an unmatched search in Superadmin ODRS Portal Accounts", async () => {
  vi.stubGlobal("fetch", async () => response([
    { id: 1, name: "Portal Student", email: "portal@example.com", affiliation: "Student", createdAt: "2026-11-12" },
  ]));
  render(<OdrsPortalAccountsTab />);
  expect(await screen.findByText("Portal Student")).toBeVisible();

  fireEvent.change(screen.getByLabelText("Search portal accounts"), { target: { value: "unmatched" } });
  expect(await screen.findByText("No Matching Portal Accounts")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
  expect(await screen.findByText("Portal Student")).toBeVisible();
});

it.each(["registrar", "osas"])("shows a retry in %s admin records review after an empty response is followed by an error", async (officeId) => {
  const onRefresh = vi.fn();
  const props = { officeId, records: [], statusFilter: "All", isLoading: false, onRefresh };
  const { rerender } = render(<DigitalRecordsReviewTab {...props} />);
  expect(await screen.findByText("No Records Yet")).toBeVisible();

  rerender(<DigitalRecordsReviewTab {...props} error="Request failed" />);
  await retryFrom("Could Not Load Digital Records");
  expect(onRefresh).toHaveBeenCalledOnce();
});

it("recovers from a Registrar staff request load failure", async () => {
  let attempts = 0;
  vi.stubGlobal("fetch", async (url) => {
    return response([], !String(url).startsWith("/api/document-requests?") || ++attempts > 1);
  });
  render(<DocumentRequestsTab showToast={showToast} />);
  await retryFrom("Could Not Load Requests");
  expect(await screen.findByText("No Document Requests Found")).toBeVisible();
});

it("applies a Manila date filter across pages in OSAS monitoring", async () => {
  const load = vi.fn(async (url) => {
    if (!String(url).startsWith("/api/osas/event-proposals?")) return response([]);
    const limit = new URL(url, "http://localhost").searchParams.get("limit");
    if (limit !== "100") return response([]);
    return response([{ id: 8, title: "Campus Activity", created_at: "2026-11-11T19:38:00Z", status: "Submitted" }]);
  });
  vi.stubGlobal("fetch", load);
  render(<OsasMonitoringTab showToast={showToast} />);
  expect(await screen.findByText("No Event Proposals Found")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Apply date filter" }));
  expect(await screen.findByText("Campus Activity")).toBeVisible();
  expect(load.mock.calls.some(([url]) => String(url).startsWith("/api/osas/event-proposals?limit=100"))).toBe(true);
});

it("recovers from a Campus Operations load failure", async () => {
  let attempts = 0;
  vi.stubGlobal("fetch", async (url) => {
    if (!String(url).startsWith("/api/system/health")) return response([]);
    const ok = ++attempts > 1;
    return { ok, json: async () => ({ ok, data: { transactions: [] } }) };
  });
  render(<CampusOperationsTab showToast={showToast} />);
  await retryFrom("Could Not Load Campus Operations");
  expect(await screen.findByText("No Records Found")).toBeVisible();
});

it("recovers from an OSAS organization directory load failure", async () => {
  let attempts = 0;
  vi.stubGlobal("fetch", async (url) => {
    return response([], !String(url).startsWith("/api/osas/organizations?") || ++attempts > 1);
  });
  render(<StudentOrganizationsTab showToast={showToast} />);
  await retryFrom("Could Not Load Student Organizations");
  expect(await screen.findByText("No Student Organizations Found")).toBeVisible();
});

it("recovers from an OSAS proposal load failure", async () => {
  let attempts = 0;
  vi.stubGlobal("fetch", async (url) => {
    return response([], !String(url).startsWith("/api/osas/event-proposals?") || ++attempts > 1);
  });
  render(<OsasMonitoringTab showToast={showToast} />);
  await retryFrom("Could Not Load Event Proposals");
  expect(await screen.findByText("No Event Proposals Found")).toBeVisible();
});
