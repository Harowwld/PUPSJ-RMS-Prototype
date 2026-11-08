import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/hooks/useHotFolderInbox", () => ({
  useHotFolderInbox: () => ({
    clearInbox: vi.fn(),
    clearIngestSelection: vi.fn(),
    loading: false,
    ocrLoading: false,
    previewMime: "",
    previewUrl: "",
    refresh: vi.fn(),
    removeIngestItem: vi.fn(),
    rows: [],
    selected: null,
    selectedRow: null,
  }),
}));

vi.mock("@/components/staff/ContinuousScanningPanel", () => ({
  default: () => null,
}));

import ScanUploadTab from "@/components/staff/ScanUploadTab";

const selectedStudent = {
  studentNo: "2025-10001-SJ-0",
  name: "DELA CRUZ, JUAN",
  courseCode: "BSIT",
  yearLevel: 2025,
  section: "1A",
  room: 1,
  cabinet: "A",
  drawer: 1,
};

const differentStudent = {
  studentNo: "2025-10002-SJ-0",
  name: "SANTOS, MARIA",
  courseCode: "BSIT",
  yearLevel: 2025,
  section: "1A",
  room: 1,
  cabinet: "A",
  drawer: 1,
};

function scanUploadProps({ student = selectedStudent, suggestion, processSubmission = vi.fn(), ocrLoading = false } = {}) {
  return {
    authUser: { office_id: "registrar" },
    loading: false,
    uploadStudentIsExisting: true,
    setUploadStudentIsExisting: vi.fn(),
    dropActive: false,
    setDropActive: vi.fn(),
    uploadedFile: new File(["synthetic image"], "synthetic.png", { type: "image/png" }),
    uploadedFiles: [],
    selectedQueuedFileIndex: 0,
    setSelectedQueuedFileIndex: vi.fn(),
    onRemoveQueuedFile: vi.fn(),
    onReorderQueuedFiles: vi.fn(),
    fileInputRef: { current: null },
    onFileSelect: vi.fn(),
    onClearFile: vi.fn(),
    ocrLoading,
    storageLayout: { rooms: [{ id: 1, cabinets: [{ id: "A", drawerIds: [1, 2, 3, 4] }] }] },
    courses: ["BSIT"],
    docTypes: ["Transcript of Records"],
    processSubmission,
    newRec: {
      studentNo: student.studentNo,
      name: student.name,
      course: "BSIT",
      year: "2025",
      sectionPart: "1A",
      room: "1",
      cabinet: "A",
      drawer: "1",
      docType: "Transcript of Records",
    },
    setNewRec: vi.fn(),
    applyStudentNoMask: (value) => ({ value }),
    setNewRecStudentNoTouched: vi.fn(),
    sysSections: ["1A"],
    students: [selectedStudent, differentStudent],
    organizations: [],
    staffDocs: [],
    ocrSuggestion: suggestion,
  };
}

function renderScanUpload(options = {}) {
  return render(React.createElement(ScanUploadTab, scanUploadProps(options)));
}

describe("Scan & Upload OCR student mismatch warning", () => {
  beforeEach(() => vi.clearAllMocks());

  it("warns before filing when confident OCR candidates identify a different student", () => {
    renderScanUpload({
      suggestion: {
        name: differentStudent.name,
        studentMatches: [{ ...differentStudent, student_no: differentStudent.studentNo, mismatchPercent: 0 }],
      },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(/different student/i);
    expect(screen.getByText(/SANTOS, MARIA/i)).toBeVisible();
  });

  it("recalculates the mismatch warning when the selected student changes", () => {
    const props = {
      suggestion: {
        name: differentStudent.name,
        studentMatches: [{ ...differentStudent, student_no: differentStudent.studentNo, mismatchPercent: 0 }],
      },
    };
    const view = renderScanUpload(props);

    expect(screen.getByRole("alert")).toHaveTextContent(/different student/i);
    view.rerender(React.createElement(ScanUploadTab, scanUploadProps({
      student: differentStudent,
      suggestion: props.suggestion,
    })));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("uses the current student after selection changes while OCR is pending", () => {
    const suggestion = {
      name: differentStudent.name,
      studentMatches: [{ ...differentStudent, student_no: differentStudent.studentNo, mismatchPercent: 0 }],
    };
    const view = renderScanUpload({ student: selectedStudent, ocrLoading: true });

    expect(screen.getByRole("button", { name: "Upload Document" })).toBeDisabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    view.rerender(React.createElement(ScanUploadTab, scanUploadProps({
      student: differentStudent,
      ocrLoading: false,
      suggestion,
    })));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    view.rerender(React.createElement(ScanUploadTab, scanUploadProps({
      student: selectedStudent,
      ocrLoading: false,
      suggestion,
    })));
    expect(screen.getByRole("alert")).toHaveTextContent(/different student/i);
  });

  it("does not warn when OCR candidate matches the selected student", () => {
    renderScanUpload({
      suggestion: {
        name: selectedStudent.name,
        studentMatches: [{ ...selectedStudent, student_no: selectedStudent.studentNo, mismatchPercent: 0 }],
      },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("leaves multiple non-exact OCR candidates for staff review without choosing a student", () => {
    renderScanUpload({
      suggestion: {
        name: "SANTOS, MARIA",
        studentMatches: [
          { ...selectedStudent, student_no: selectedStudent.studentNo, mismatchPercent: 5 },
          { ...differentStudent, student_no: differentStudent.studentNo, mismatchPercent: 8 },
        ],
      },
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Student Number", { exact: true })).toBeVisible();
  });

  it("leaves unreadable OCR available for manual review without a false mismatch warning", () => {
    renderScanUpload({ suggestion: { name: "", studentMatches: [] } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Student Number", { exact: true })).toBeVisible();
  });

  it("requires explicit confirmation before the standard upload callback proceeds", async () => {
    const user = userEvent.setup();
    const processSubmission = vi.fn();
    renderScanUpload({
      processSubmission,
      suggestion: { name: differentStudent.name, studentMatches: [{ ...differentStudent, student_no: differentStudent.studentNo, mismatchPercent: 0 }] },
    });

    await user.click(screen.getByRole("button", { name: "Upload Document" }));
    expect(screen.getByRole("dialog", { name: "Student mismatch detected" })).toBeVisible();
    expect(processSubmission).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Upload to Selected Student" }));
    expect(processSubmission).toHaveBeenCalledOnce();
  });
});
