import { readFile } from "node:fs/promises"

const nativeFetch = globalThis.fetch

export function installReportAssets(context) {
  context.mock.method(globalThis, "fetch", async (path, options) => {
    if (!/^\/assets\/fonts\/reports\/[A-Za-z]+-(Regular|Bold)\.ttf$/.test(path)) return nativeFetch(path, options)
    return new Response(await readFile(new URL(`../../public${path}`, import.meta.url)))
  })
}
