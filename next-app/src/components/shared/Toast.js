"use client"

import { useEffect } from "react"

export default function Toast({ open, msg, isError, onClose }) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [open, onClose])

  return (
    <div
      className={`fixed top-5 left-1/2 z-[100] flex -translate-x-1/2 transform items-center gap-3 rounded-brand px-4 py-3 shadow-lg transition-all duration-300 ${ open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-20 opacity-0" } ${isError "bg-red-800" "bg-gray-800"} text-white`}
    >
      <i
        className={`ph-fill ${ isError ? "ph-warning-circle" : "ph-check-circle" } ${isError "text-red-200" "text-green-400"} text-xl`}
      ></i>
      <span className="text-sm font-medium">{msg}</span>
    </div>
  )
}

