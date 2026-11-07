export function createPdfPreviewSession() {
  let version = 0
  let url = null
  const release = () => {
    if (url) URL.revokeObjectURL(url)
    url = null
  }
  return {
    begin: () => ++version,
    isCurrent: (request) => request === version,
    createUrl(blob, request) {
      if (request !== version) return null
      release()
      url = URL.createObjectURL(blob)
      return url
    },
    cancel() {
      version += 1
      release()
    },
  }
}
