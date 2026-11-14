import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import PDFPreviewModal from "@/components/shared/PDFPreviewModal";

vi.mock("@/components/shared/ResilientPDFViewer", () => ({
  default: ({ src, preparedPdf }) => (
    <output aria-label="Preview source" data-prepared={preparedPdf}>{src}</output>
  ),
}));

it("passes a prepared Campus Operations report to the viewer through preview.url", () => {
  const url = "blob:http://localhost/campus-operations-report";
  render(<PDFPreviewModal open preparedPdf preview={{ url, title: "Campus Operations Report" }} />);

  const source = screen.getByLabelText("Preview source");
  expect(source).toHaveTextContent(url);
  expect(source).toHaveAttribute("data-prepared", "true");
});
