"use client";

import { useEffect, useState } from "react";
import { Cancel01Icon, Download01Icon, File02Icon, Image01Icon, ViewIcon } from "hugeicons-react";
import usePdfThumbnail from "@/hooks/usePdfThumbnail";
import { useAttachmentLayout } from "@/hooks/useAttachmentLayout";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadDocument } from "@/lib/documentDownload";
import { PDF_ACTION_LABELS } from "@/lib/pdfPreview";
import { cn } from "@/lib/utils";

export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb % 1 === 0 ? 0 : 1)} MB`;
}

function AttachmentAction({ icon: Icon, label, onClick }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} onClick={onClick} className="table-action-button shrink-0 [@media(pointer:coarse)]:size-11">
          <Icon size={16} aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default function SheetAttachmentRow({
  filename,
  size,
  mimeType,
  file,
  fileUrl,
  fixedCompact = false,
  description,
  status,
  onPreview,
  previewLabel = `Preview ${filename}`,
  downloadUrl,
  onRemove,
  actions,
  children,
}) {
  const isImage = mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(filename);
  const isPdf = mimeType === "application/pdf" || /\.pdf$/i.test(filename);
  const sourceUrl = fileUrl || downloadUrl;
  const layout = useAttachmentLayout();
  const isCard = !fixedCompact && Boolean(sourceUrl || file) && layout === "cards";
  const imageSource = isImage ? sourceUrl : null;
  const pdfThumbnail = usePdfThumbnail({ file, url: sourceUrl, isPdf });
  const [localThumbnail, setLocalThumbnail] = useState(null);
  const [failedThumbnail, setFailedThumbnail] = useState(null);

  useEffect(() => {
    if (!isImage || imageSource || !(file instanceof Blob)) return;
    let active = true;
    const url = URL.createObjectURL(file);
    queueMicrotask(() => {
      if (active) setLocalThumbnail({ file, url });
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file, isImage, imageSource]);

  const src = imageSource || pdfThumbnail || (localThumbnail && localThumbnail.file === file ? localThumbnail.url : null);
  const Main = onPreview ? "button" : "div";
  const FileIcon = isImage ? Image01Icon : File02Icon;

  return (
    <div className="min-w-0 rounded-2xl bg-muted/70 p-1">
      <div className="flex min-w-0 items-center gap-1">
        <Main
          {...(onPreview ? { type: "button", onClick: onPreview, "aria-label": previewLabel } : {})}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-background/75 px-2 py-1 text-left",
            isCard && "grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-y-2 p-2",
            onPreview && "cursor-pointer transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
          )}
        >
          <span className={cn(
            "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground",
            isCard && "col-span-full h-24 w-full",
          )}>
            {src && src !== failedThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" loading="lazy" className={cn("size-full", isPdf ? "object-contain bg-white" : "object-cover")} onError={() => setFailedThumbnail(src)} />
            ) : (
              <FileIcon size={18} aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold" title={filename}>{filename}</span>
            {description && <span className="block truncate text-[11px] text-muted-foreground" title={description}>{description}</span>}
          </span>
          {Number(size) > 0 && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{formatFileSize(size)}</span>}
          {status}
          {onPreview && <ViewIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
        </Main>
        {downloadUrl && (
          <AttachmentAction
            icon={Download01Icon}
            label={isPdf ? PDF_ACTION_LABELS.download : PDF_ACTION_LABELS.original}
            onClick={async () => {
              try {
                await downloadDocument(downloadUrl, filename);
              } catch (error) {
                toast.error("Could not download file", { description: error.message });
              }
            }}
          />
        )}
        {actions}
        {onRemove && <AttachmentAction icon={Cancel01Icon} label={`Remove ${filename}`} onClick={onRemove} />}
      </div>
      {children && <div className="px-2 py-1.5">{children}</div>}
    </div>
  );
}
