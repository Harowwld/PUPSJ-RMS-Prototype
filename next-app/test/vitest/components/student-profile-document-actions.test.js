import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import StudentProfileSheet from "@/components/staff/StudentProfileSheet";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";

afterEach(() => vi.unstubAllGlobals());

it("previews checklist files from the row and keeps re-scan in the actions menu", async () => {
  const user = userEvent.setup();
  const student = { studentNo: "2024-00123-SJ-0", name: "REYES, ANA", status: "Active" };
  const doc = {
    id: 42,
    student_no: student.studentNo,
    doc_type: "Report Card",
    original_filename: "report-card.pdf",
    approval_status: "Approved",
    mime_type: "application/pdf",
  };
  vi.stubGlobal("fetch", vi.fn(async (url) => ({
    json: async () => ({
      ok: true,
      data: url.startsWith("/api/doc-types") ? [{ id: 1, name: "Report Card" }, { id: 2, name: "Birth Certificate" }] : [],
    }),
  })));
  const onOpenChange = vi.fn();
  const onPreviewDocument = vi.fn();
  const onRescan = vi.fn();

  render(<StudentProfileSheet open student={student} allDocs={[doc]} onOpenChange={onOpenChange}
    onPreviewDocument={onPreviewDocument} onRescan={onRescan} onArchiveStudent={vi.fn()} />);

  expect(screen.getByRole("heading", { name: "Requirements Checklist" })).toBeVisible();
  expect(screen.queryByRole("tab")).toBeNull();
  expect(screen.getByRole("button", { name: "Preview Student Records Report" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Archive Student" })).toBeVisible();
  const checklist = screen.getByRole("dialog", { name: "Student Details" });
  expect(await within(checklist).findByText("Birth Certificate")).toBeVisible();
  expect(within(checklist).queryByRole("button", { name: "Preview Birth Certificate" })).toBeNull();
  const approvedBadge = within(checklist).getByText("Approved");
  expect(approvedBadge).toHaveAttribute("data-variant", "success");
  expect(approvedBadge).toHaveClass("h-5");
  const registryStatus = within(checklist).getByText("Registry Status").closest(".grid");
  expect(within(registryStatus).getByText("Active")).toHaveClass("h-5");

  await user.click(within(checklist).getByRole("button", { name: "Preview Report Card" }));
  expect(onPreviewDocument).toHaveBeenCalledWith(doc.doc_type, student.name, student.studentNo, doc.id);

  await user.click(within(checklist).getByRole("button", { name: "Actions for Report Card" }));
  expect(await screen.findByRole("menuitem", { name: PDF_ACTION_LABELS.preview })).toBeVisible();
  await user.click(screen.getByRole("menuitem", { name: "Re-scan Document" }));
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onRescan).toHaveBeenCalledWith(student.studentNo, doc.doc_type, doc.id, doc.original_filename, doc.mime_type);
});

it("copies the student number and Registrar ODRS email", async () => {
  const user = userEvent.setup();
  const student = {
    studentNo: "2024-00123-SJ-0",
    name: "REYES, ANA",
    odrsEmail: "ana@example.com",
  };
  vi.stubGlobal("fetch", vi.fn(async () => ({
    json: async () => ({ ok: true, data: [] }),
  })));

  render(<StudentProfileSheet open student={student} authUser={{ office_id: "registrar" }} onOpenChange={vi.fn()} />);

  const copyNumber = screen.getByRole("button", { name: "Copy Student Number" });
  expect(copyNumber).toHaveClass("size-7");
  expect(copyNumber.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  await user.click(copyNumber);
  expect(await navigator.clipboard.readText()).toBe(student.studentNo);

  await user.click(screen.getByRole("button", { name: "Copy ODRS Email" }));
  expect(await navigator.clipboard.readText()).toBe(student.odrsEmail);
});
