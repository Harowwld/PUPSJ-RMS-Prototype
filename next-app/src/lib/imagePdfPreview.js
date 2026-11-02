export async function createImagePdfPreview(blob) {
  const { jsPDF } = await import("jspdf")
  const image = await createImageBitmap(blob)
  try {
    const scale = Math.min(1, 3000 / Math.max(image.width, image.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height)
    const doc = new jsPDF({ orientation: image.width > image.height ? "landscape" : "portrait", unit: "pt", format: "a4", putOnlyUsedFonts: true })
    const width = doc.internal.pageSize.getWidth()
    const height = doc.internal.pageSize.getHeight()
    const fit = Math.min((width - 48) / canvas.width, (height - 48) / canvas.height)
    const imageWidth = canvas.width * fit
    const imageHeight = canvas.height * fit
    doc.addImage(canvas, "PNG", (width - imageWidth) / 2, (height - imageHeight) / 2, imageWidth, imageHeight)
    return doc.output("blob")
  } finally {
    image.close()
  }
}
