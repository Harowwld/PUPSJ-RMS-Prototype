import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import StudentPage from "@/app/student/page";

const { router, searchParams } = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: new URLSearchParams("view=odrs"),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
  usePathname: () => "/student",
}));
vi.mock("@/lib/clientAuth", () => ({
  getClientSession: async () => ({
    ok: true,
    data: {
      id: 1,
      role: "Student",
      client_type: searchParams.get("view") === "osas" ? "Student" : "Alumni",
      portal_setup_complete: true,
    },
  }),
  invalidateClientSession: vi.fn(),
}));
vi.mock("@/components/shared/Sidebar", () => ({ default: () => null }));
vi.mock("@/components/shared/DateRangePickerModal", () => ({
  DateRangeFilterButton: ({ startDate, endDate, onApply }) => (
    <button onClick={() => onApply({ startDate: "2026-11-13", endDate: "2026-11-13" })}>
      {startDate || endDate ? "Date filter applied" : "Apply date filter"}
    </button>
  ),
}));

beforeEach(() => {
  localStorage.clear();
  searchParams.set("view", "odrs");
});

function stubRequests(getResponse) {
  vi.stubGlobal("fetch", async (url) => {
    if (url === "/api/student/document-requests") {
      const data = getResponse();
      return { ok: data !== null, json: async () => ({ ok: data !== null, data }) };
    }
    return { ok: true, json: async () => ({ ok: true, data: [] }) };
  });
}

it("clears the date range when resetting a request filter with no matches", async () => {
  stubRequests(() => ({
    requests: [{ id: 42, doc_type: "Transcript of Records", created_at: "2026-11-11T19:38:00Z", status: "Pending" }],
  }));
  render(<StudentPage />);
  expect(await screen.findByText("Transcript of Records")).toBeVisible();

  const search = screen.getByLabelText("Search requests");
  fireEvent.change(search, { target: { value: "transcript" } });
  fireEvent.click(screen.getByRole("button", { name: 'Remove filter: Search "transcript"' }));
  expect(search).toHaveValue("");

  fireEvent.click(screen.getByRole("button", { name: "Apply date filter" }));
  expect(await screen.findByText("No Matches Found")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));

  expect(await screen.findByText("Transcript of Records")).toBeVisible();
  expect(screen.getByRole("button", { name: "Apply date filter" })).toBeVisible();
});

it("shows a retry when request history fails and shows the empty history after a successful retry", async () => {
  let data = null;
  stubRequests(() => data);
  render(<StudentPage />);

  const error = await screen.findByText("Could Not Load Document Requests");
  expect(screen.queryByText("No Document Requests Yet")).toBeNull();
  data = { requests: [] };
  fireEvent.click(within(error.closest('[data-slot="empty"]')).getByRole("button", { name: "Try Again" }));

  expect(await screen.findByText("No Document Requests Yet")).toBeVisible();
});

it("shows a student OSAS retry when proposals fail while document requests load successfully", async () => {
  searchParams.set("view", "osas");
  let attempts = 0;
  vi.stubGlobal("fetch", async (url) => {
    const ok = url !== "/api/student/event-proposals" || ++attempts > 1;
    const data = url === "/api/student/document-requests" ? { requests: [] } : [];
    return { ok, json: async () => ({ ok, data }) };
  });
  render(<StudentPage />);

  const error = await screen.findByText("Could Not Load Event Proposals");
  fireEvent.click(within(error.closest('[data-slot="empty"]')).getByRole("button", { name: "Try Again" }));
  expect(await screen.findByText("No Authorized Organization")).toBeVisible();
});
