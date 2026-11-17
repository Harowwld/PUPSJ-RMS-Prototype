"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import FileAttachmentDropzone from "@/components/shared/FileAttachmentDropzone";
import SheetSectionHeading from "@/components/shared/SheetSectionHeading";
import { correctionRequirements } from "@/lib/requestCorrections";

function CorrectionItem({ item, accepting, busy, onSubmit, onPreview }) {
  const [selection, setSelection] = useState(null);
  const name = correctionRequirements[item.type];
  return (
    <div className="space-y-2 rounded-xl bg-muted/60 p-3">
      <div className="flex items-start justify-between gap-2 text-xs">
        <p className="font-semibold">{name}</p>
        {item.attachmentId && <span className="font-semibold text-emerald-700 dark:text-emerald-400">Submitted</span>}
      </div>
      {item.note && <p className="whitespace-pre-wrap text-xs text-muted-foreground">{item.note}</p>}
      {accepting && !item.attachmentId && (
        <>
          <FileAttachmentDropzone
            mode="single"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            title="Drop the correction file here, or browse"
            subtitle="PDF, PNG, JPG, or WEBP up to 10 MB"
            value={selection}
            onChange={setSelection}
            onPreview={(attachment) => onPreview(attachment, name)}
          />
          {selection?.file && (
            <div className="flex justify-end">
              <Button type="button" size="sm" disabled={busy} onClick={() => onSubmit(item.id, selection.file)}>
                Submit Correction
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RequestCorrectionsSection({ request, busy, onSubmit, onPreview }) {
  const items = request?.correction_items || [];
  if (!items.length) return null;
  const accepting = request.status === "Deficient";
  const remaining = items.filter((item) => !item.attachmentId).length;
  return (
    <section className="space-y-2.5">
      <SheetSectionHeading icon="Attachment01Icon" title="Requested Corrections" />
      {accepting && (
        <p className="text-xs text-muted-foreground">
          {remaining} of {items.length} {items.length === 1 ? "item needs" : "items need"} a file. Your request returns to the Registrar after every file is submitted.
        </p>
      )}
      {items.map((item) => (
        <CorrectionItem key={item.id} item={item} accepting={accepting} busy={busy} onSubmit={onSubmit} onPreview={onPreview} />
      ))}
    </section>
  );
}
