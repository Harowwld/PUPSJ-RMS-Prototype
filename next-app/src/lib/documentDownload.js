export async function downloadDocument(url, filename = "document.pdf") {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" })
  if (!response.ok) throw new Error("Unable to download the document. Please try again.")
  const blobUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  }
}
