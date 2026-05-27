"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={className} disabled>
        <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
      </Button>
    )
  }

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <i className={`ph-bold ${isDark ? "ph-sun" : "ph-moon"} text-xl`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

