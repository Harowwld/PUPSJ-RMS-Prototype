import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
vi.mock("@/lib/ocrClient", () => ({ scanFileForSuggestion: vi.fn() }))
import { scanFileForSuggestion } from "@/lib/ocrClient"
import { useHotFolderInbox } from "@/hooks/useHotFolderInbox"

const row = (id) => ({
  id,
  original_filename: `${id}.png`,
  mime_type: "image/png",
})
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({
        ok: true,
        blob: async () => new Blob(["synthetic"]),
      })
  )
})

describe("scanner OCR request ownership", () => {
  it("ignores an old scanner result after replacement clears the selection", async () => {
    const pending = deferred()
    scanFileForSuggestion.mockReturnValueOnce(pending.promise)
    const onOcrResult = vi.fn()
    const { result } = renderHook(() =>
      useHotFolderInbox({ enabled: false, onOcrResult, showToast: vi.fn() })
    )
    let scan
    await act(async () => {
      scan = result.current.openItem(row(1))
    })
    act(() => result.current.clearIngestSelection())
    await act(async () => {
      pending.resolve({ name: "OLD STUDENT" })
      await scan
    })
    expect(onOcrResult).not.toHaveBeenCalled()
    expect(result.current.ocrLoading).toBe(false)
  })

  it("keeps the latest scanner result when requests complete out of order", async () => {
    const old = deferred()
    const latest = deferred()
    scanFileForSuggestion
      .mockReturnValueOnce(old.promise)
      .mockReturnValueOnce(latest.promise)
    const onOcrResult = vi.fn()
    const { result } = renderHook(() =>
      useHotFolderInbox({ enabled: false, onOcrResult, showToast: vi.fn() })
    )
    let first, second
    await act(async () => {
      first = result.current.openItem(row(1))
    })
    await act(async () => {
      second = result.current.openItem(row(2))
    })
    await act(async () => {
      latest.resolve({ name: "CURRENT STUDENT" })
      await second
    })
    await act(async () => {
      old.resolve({ name: "OLD STUDENT" })
      await first
    })
    expect(onOcrResult).toHaveBeenCalledExactlyOnceWith({
      name: "CURRENT STUDENT",
    })
  })
})
