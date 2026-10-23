"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

function parsePage(value, fallback = 1) {
  const parsed = Number.parseInt(value || "", 10)
  return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : fallback
}

export default function useUrlPage({ enabled = true, initialPage = 1 } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [page, setPageState] = useState(() =>
    enabled ? parsePage(searchParams?.get("page"), initialPage) : initialPage
  )
  const pageRef = useRef(page)
  const skipUrlUpdateRef = useRef(false)
  const queryRef = useRef(searchParams?.toString() || "")

  useEffect(() => {
    const query = searchParams?.toString() || ""
    queryRef.current = query
    if (!enabled) return

    const params = new URLSearchParams(query)
    const rawPage = params.get("page")
    const parsedPage = parsePage(rawPage, initialPage)
    if (parsedPage !== pageRef.current) {
      pageRef.current = parsedPage
      skipUrlUpdateRef.current = true
      setPageState(parsedPage)
    }

    if (rawPage !== null && (rawPage !== String(parsedPage) || parsedPage === 1)) {
      params.delete("page")
      queryRef.current = params.toString()
      const queryString = params.toString()
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
    }
  }, [enabled, initialPage, pathname, router, searchParams])

  useEffect(() => {
    if (!enabled) {
      pageRef.current = page
      return
    }
    if (skipUrlUpdateRef.current) {
      skipUrlUpdateRef.current = false
      return
    }
    if (page === pageRef.current || typeof window === "undefined") return

    pageRef.current = page
    const params = new URLSearchParams(queryRef.current)
    if (page > 1) {
      params.set("page", String(page))
    } else {
      params.delete("page")
    }

    const queryString = params.toString()
    queryRef.current = queryString
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname
    router[page === 1 ? "replace" : "push"](nextUrl, { scroll: false })
  }, [enabled, page, pathname, router])

  return [page, setPageState]
}
