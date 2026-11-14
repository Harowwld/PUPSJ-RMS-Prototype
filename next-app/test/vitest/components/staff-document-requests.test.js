import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import DocumentRequestsTab from "@/components/staff/DocumentRequestsTab";
import FileAttachmentDropzone from "@/components/shared/FileAttachmentDropzone";

vi.mock("next/navigation", () => ({
  usePathname: () => "/staff",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => null,
}));
vi.mock("@/components/shared/AuthGuard", () => ({
  useAuthUser: () => ({ id: "registrar-staff", role: "Staff", office_id: "registrar" }),
}));
vi.mock("@/components/shared/PDFPreviewModal", () => ({ default: () => null }));

it("groups the staff table and keeps Request ID fixed when editing columns", async () => {
  const rows = [
    { id: 1, student_name: "Alex Santos", doc_type: "Transcript", status: "Pending", client_type: "Student" },
    { id: 2, student_name: "Dana Reyes", doc_type: "Good Moral", status: "Ready", client_type: "Alumni" },
  ];
  const fetchMock = vi.fn(async (url) => ({
    ok: true,
    json: async () => url.startsWith("/api/document-requests?")
      ? { ok: true, data: rows, total: rows.length }
      : url.startsWith("/api/students?")
        ? { ok: true, data: [{ name: "Alex Santos", studentNo: "2026-12345-SJ-0" }] }
        : { ok: true, data: null },
  }));
  vi.stubGlobal("fetch", fetchMock);
  render(<DocumentRequestsTab docTypes={["Transcript", "Good Moral"]} />);
  expect(await screen.findByText("Pending Intake")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Group: Status" }));
  fireEvent.click(screen.getByRole("button", { name: "Client Type" }));
  expect(await within(await screen.findByRole("table")).findByText("Students")).toBeVisible();
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("groupBy=client_type"))).toBe(true));

  fireEvent.click(screen.getByRole("button", { name: "Columns" }));
  expect(screen.queryByRole("checkbox", { name: "Request ID" })).toBeNull();
  expect(within(screen.getByRole("table")).getByRole("columnheader", { name: "ID" })).toBeVisible();

  fireEvent.click(screen.getByRole("tab", { name: "Kanban" }));
  expect(screen.queryByRole("button", { name: /^Group:/ })).toBeNull();
  await waitFor(() => expect(fetchMock.mock.lastCall[0]).not.toContain("groupBy="));

  fireEvent.click(screen.getByRole("button", { name: "Create Request" }));
  const dialog = within(await screen.findByRole("dialog"));
  const documentType = dialog.getByRole("combobox", { name: "Document Type" });
  expect(documentType).toBeDisabled();
  expect(documentType).toHaveAccessibleDescription(/select a student from the search results/i);
  expect(dialog.queryByPlaceholderText("202X-XXXXX-SJ-0")).toBeNull();
  fireEvent.change(dialog.getByRole("textbox", { name: "Find a student" }), { target: { value: "2026-12345-SJ-0" } });
  expect(documentType).toBeDisabled();
  fireEvent.click(await dialog.findByRole("button", { name: /Alex Santos.*2026-12345-SJ-0/ }));
  expect(documentType).toBeEnabled();
  expect(documentType).not.toHaveAccessibleDescription();
  fireEvent.click(documentType);
  expect(await screen.findByRole("option", { name: "Transcript" })).toBeVisible();
  expect(screen.queryByRole("option", { name: "Select document type" })).toBeNull();
  expect(dialog.getByRole("textbox", { name: "Description / Purpose" }).tagName).toBe("TEXTAREA");
});

it("reports excess attachments as a validation error and keeps files within the limit", () => {
  const showToast = vi.fn();
  const onChange = vi.fn();
  const { container } = render(
    <FileAttachmentDropzone mode="multiple" maxFiles={1} showToast={showToast} onChange={onChange} simulateProgress={false} />,
  );
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [new File(["a"], "a.pdf"), new File(["b"], "b.pdf")] },
  });

  expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Attachment Limit Exceeded" }), true);
  expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ file: expect.objectContaining({ name: "a.pdf" }) })]);
});
