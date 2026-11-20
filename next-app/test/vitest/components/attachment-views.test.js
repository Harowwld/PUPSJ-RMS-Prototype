import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AttachmentViews } from "@/components/shared/FileAttachmentDropzone";
import { setAttachmentLayout } from "@/hooks/useAttachmentLayout";
import SheetAttachmentRow from "@/components/shared/SheetAttachmentRow";

vi.mock("@/hooks/usePdfThumbnail", () => ({
  default: ({ isPdf, url }) => isPdf && url ? "data:image/jpeg;base64,cGRm" : null,
}));

it("switches attachment layouts together, showing the image and keeping preview and remove available", async () => {
  const item = { original_filename: "receipt.png", url: "/receipt.png", size_bytes: 2048 };
  const onPreview = vi.fn();
  const onRemove = vi.fn();
  const { container } = render(
    <>
      <AttachmentViews>
        {(Attachment) => <Attachment item={item} onPreview={onPreview} onRemove={onRemove} animateLayout={false} />}
      </AttachmentViews>
      <SheetAttachmentRow filename="report.pdf" fileUrl="/report.pdf" />
    </>,
  );

  expect(screen.queryByRole("group", { name: "Attachment view" })).toBeNull();
  expect(screen.getByRole("button", { name: "Preview receipt.png" })).toBeInTheDocument();

  act(() => setAttachmentLayout("cards"));
  expect(JSON.parse(localStorage.getItem("pup_attachment_view"))).toBe("cards");
  expect(container.querySelector('img[src^="data:image/jpeg"]').parentElement).toHaveClass("h-24");

  act(() => setAttachmentLayout("rows"));
  expect(JSON.parse(localStorage.getItem("pup_attachment_view"))).toBe("rows");
  expect(container.querySelector('img[src^="data:image/jpeg"]').parentElement).toHaveClass("size-9");
  await waitFor(() => expect(container.querySelector('img[src="/receipt.png"]')).toBeInTheDocument());
  expect(container.querySelector('img[src^="data:image/jpeg"]')).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Preview receipt.png" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove receipt.png" }));
  expect(onPreview).toHaveBeenCalledWith(item);
  expect(onRemove).toHaveBeenCalledWith(item);

});
