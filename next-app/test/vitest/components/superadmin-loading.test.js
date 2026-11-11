import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import CampusOperationsTab from "@/components/systemadmin/CampusOperationsTab";
import GlobalAuditLogsTab from "@/components/systemadmin/GlobalAuditLogsTab";
import GlobalStaffTab from "@/components/systemadmin/GlobalStaffTab";
import InstitutionalBrandingTab from "@/components/systemadmin/InstitutionalBrandingTab";
import LandingPageCmsTab from "@/components/systemadmin/LandingPageCmsTab";
import ModuleConfigTab from "@/components/systemadmin/ModuleConfigTab";
import OfficeManagementTab from "@/components/systemadmin/OfficeManagementTab";
import SecurityQuestionsTab from "@/components/systemadmin/SecurityQuestionsTab";
import SystemBackupsTab from "@/components/systemadmin/SystemBackupsTab";

vi.mock("next/navigation", () => {
  const router = { push() {}, replace() {} };
  const searchParams = new URLSearchParams();
  return {
    usePathname: () => "/systemadmin",
    useRouter: () => router,
    useSearchParams: () => searchParams,
  };
});

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
});

afterEach(() => vi.unstubAllGlobals());

test.each([
  [CampusOperationsTab, "Campus Services & Operations Monitor", "Search campus operations"],
  [GlobalAuditLogsTab, "Platform Activity History", "Search platform activity history"],
  [GlobalStaffTab, "Global Personnel Directory", "Search personnel"],
  [InstitutionalBrandingTab, "Institutional Identity"],
  [LandingPageCmsTab, "Landing Page CMS"],
  [ModuleConfigTab, "Department Features & Permissions", "Search features"],
  [OfficeManagementTab, "Departments & Stations", "Search departments"],
  [SecurityQuestionsTab, "Security Questions", "Search security questions"],
  [SystemBackupsTab, "Platform Backups", "Search archive filename"],
])("%s keeps its real page header visible before data arrives", (Page, title, searchLabel) => {
  const { container } = render(<Page />);
  expect(screen.getByText(title, { exact: true })).toBeVisible();
  expect(container.querySelector('[aria-busy="true"], [data-slot="skeleton"]')).toBeInTheDocument();
  if (searchLabel) {
    expect(screen.getByRole("searchbox", { name: searchLabel })).toBeVisible();
  }
});

test.each(["workflow", "catalog", "faq", "footer"])("Landing Page CMS keeps the %s section header visible while loading", (section) => {
  const { container } = render(<LandingPageCmsTab initialSection={section} />);
  expect(screen.getByText("Landing Page CMS", { exact: true })).toBeVisible();
  expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
});

test("Campus Operations keeps its loaded record and search visible during refresh", async () => {
  const pendingRefresh = new Promise(() => {});
  globalThis.fetch.mockImplementation((url) => {
    if (url === "/api/system/health?force=true") return pendingRefresh;
    return Promise.resolve({
      ok: true,
      json: async () => ({
        ok: true,
        data: url === "/api/system/health"
          ? { transactions: [{ id: "op-1", officeId: "registrar", status: "Pending", title: "Test transcript request" }] }
          : {},
      }),
    });
  });
  render(<CampusOperationsTab />);
  expect(await screen.findByText("Test transcript request")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Refresh Campus Operations" }));
  expect(globalThis.fetch).toHaveBeenCalledWith("/api/system/health?force=true", { cache: "no-store" });
  expect(screen.getByText("Test transcript request")).toBeVisible();
  expect(screen.getByRole("searchbox", { name: "Search campus operations" })).toBeVisible();
});
