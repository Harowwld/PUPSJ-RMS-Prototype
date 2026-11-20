"use client";

import { useEffect, useState } from "react";

export default function usePdfThumbnail({ file, url, isPdf }) {
  const pdfSourceKey = file instanceof Blob ? file : url;
  const [pdfThumbnail, setPdfThumbnail] = useState({ source: null, url: null });
  const pdfThumbnailUrl = pdfThumbnail.source === pdfSourceKey ? pdfThumbnail.url : null;
  useEffect(() => {
    if (!isPdf || !pdfSourceKey) return;

    let active = true;
    let loadingTask = null;
    const controller = new AbortController();

    async function renderPdfThumbnail() {
      try {
        let data;
        if (pdfSourceKey instanceof Blob) {
          data = await pdfSourceKey.arrayBuffer();
        } else {
          const response = await fetch(pdfSourceKey, {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Unable to load the PDF attachment.");
          data = await response.arrayBuffer();
        }
        if (!active) return;

        const pdfjs = await import("pdfjs-dist/build/pdf.mjs");
        if (!active) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        if (!active) return;

        const page = await pdf.getPage(1);
        if (!active) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, 320 / (baseViewport.width || 612));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) return;
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: context, viewport }).promise;
        if (active) setPdfThumbnail({ source: pdfSourceKey, url: canvas.toDataURL("image/jpeg", 0.88) });
      } catch {
        if (active) setPdfThumbnail({ source: pdfSourceKey, url: null });
      } finally {
        try {
          loadingTask?.destroy?.();
        } catch {}
      }
    }

    renderPdfThumbnail();
    return () => {
      active = false;
      controller.abort();
      try {
        loadingTask?.destroy?.();
      } catch {}
    };
  }, [isPdf, pdfSourceKey]);

  return pdfThumbnailUrl;
}
