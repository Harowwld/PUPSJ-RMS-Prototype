import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ResilientPDFViewer from "@/components/shared/ResilientPDFViewer";

const { getDocument } = vi.hoisted(() => ({ getDocument: vi.fn() }));

vi.mock("pdfjs-dist/build/pdf.mjs", () => ({
  getDocument,
  GlobalWorkerOptions: {},
}));

vi.mock("@/components/shared/PDFPreview", () => ({
  default: ({ src }) => <output aria-label="PDF frame source">{src}</output>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  getDocument.mockReset();
});

function servePdf() {
  const fetchPdf = vi.fn().mockResolvedValue(new Response(
    new Uint8Array([37, 80, 68, 70]),
    { headers: { "Content-Type": "application/pdf" } },
  ));
  vi.stubGlobal("fetch", fetchPdf);
  return fetchPdf;
}

it("shows the missing-file state before opening a viewer", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
    status: 404,
    headers: { "X-File-Missing": "true" },
  })));
  render(<ResilientPDFViewer src="/api/osas/event-proposals/1?file=1" />);
  expect(await screen.findByText("Digital File Missing")).toBeInTheDocument();
  expect(getDocument).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("PDF frame source")).not.toBeInTheDocument();
});

it.each([
  ["PasswordException", /this PDF is password-protected/i],
  ["InvalidPDFException", /this PDF could not be read/i],
])("shows a specific preview error for %s", async (name, message) => {
  servePdf();
  const onStatusChange = vi.fn();
  getDocument.mockImplementation(() => ({
    promise: Promise.reject(Object.assign(new Error(), { name })),
    destroy: vi.fn().mockResolvedValue(undefined),
  }));
  render(<ResilientPDFViewer src="/api/documents/1" onStatusChange={onStatusChange} />);
  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(onStatusChange).toHaveBeenLastCalledWith("unreadable");
  expect(screen.queryByLabelText("PDF frame source")).not.toBeInTheDocument();
});

it("opens the fetched PDF after parsing the first page and preserves its URL fragment", async () => {
  const fetchPdf = servePdf();
  const getPage = vi.fn().mockResolvedValue({});
  const destroy = vi.fn().mockResolvedValue(undefined);
  const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview");
  const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  getDocument.mockReturnValue({ promise: Promise.resolve({ getPage }), destroy });
  const { unmount } = render(<ResilientPDFViewer src="/api/documents/1#page=2" />);

  expect(await screen.findByLabelText("PDF frame source")).toHaveTextContent("blob:preview#page=2");
  expect(getPage).toHaveBeenCalledWith(1);
  expect(destroy).toHaveBeenCalledOnce();
  expect(fetchPdf).toHaveBeenCalledOnce();
  expect(createUrl).toHaveBeenCalledOnce();
  unmount();
  expect(revokeUrl).toHaveBeenCalledWith("blob:preview");
});
