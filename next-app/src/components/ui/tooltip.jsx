"use client"

import * as React from "react"
import { createPortal } from "react-dom"

const TooltipContext = React.createContext({
  content: "",
  setContent: () => {},
})

function TooltipPortal({ tooltip }) {
  const { text, rect, placement } = tooltip
  const [coords, setCoords] = React.useState({ top: 0, left: 0 })
  const [mounted, setMounted] = React.useState(false)
  const tooltipRef = React.useRef(null)

  React.useLayoutEffect(() => {
    if (!tooltipRef.current) return
    const el = tooltipRef.current
    const tooltipRect = el.getBoundingClientRect()
    
    let top = 0
    let left = 0
    const offset = 8 // Distance from target element

    // Calculate initial position based on placement
    if (placement === "top") {
      top = rect.top - tooltipRect.height - offset
      left = rect.left + rect.width / 2 - tooltipRect.width / 2
    } else if (placement === "bottom") {
      top = rect.bottom + offset
      left = rect.left + rect.width / 2 - tooltipRect.width / 2
    } else if (placement === "left") {
      top = rect.top + rect.height / 2 - tooltipRect.height / 2
      left = rect.left - tooltipRect.width - offset
    } else if (placement === "right") {
      top = rect.top + rect.height / 2 - tooltipRect.height / 2
      left = rect.right + offset
    }

    // Keep within viewport bounds
    const padding = 8
    if (left < padding) left = padding
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding
    }
    if (top < padding) top = padding
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding
    }

    setCoords({ top: top + window.scrollY, left: left + window.scrollX })
    
    // Smooth entry micro-animation
    const animId = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(animId)
  }, [rect, placement])

  return (
    <div
      ref={tooltipRef}
      style={{
        position: "absolute",
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        pointerEvents: "none",
        zIndex: 99999,
        transition: "opacity 140ms cubic-bezier(0.25, 1, 0.5, 1), transform 140ms cubic-bezier(0.25, 1, 0.5, 1)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "scale(1) translateY(0)" : "scale(0.95) translateY(2px)",
      }}
      className="px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium tracking-tight text-white dark:text-zinc-100 bg-black/80 dark:bg-zinc-950/80 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-white/10 dark:border-white/5 select-none text-center max-w-[240px] whitespace-pre-line"
    >
      {text}
    </div>
  )
}

function TooltipProvider({ children }) {
  const [globalTooltip, setGlobalTooltip] = React.useState(null)
  const hoverTimeoutRef = React.useRef(null)
  const showTimeoutRef = React.useRef(null)

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const handleMouseOver = (e) => {
      // Find the closest element with a title or data-tooltip attribute
      const target = e.target.closest("[title], [data-tooltip]")
      if (!target) return

      // If it has title, move it to data-tooltip permanently to prevent native browser tooltip
      let text = target.getAttribute("data-tooltip")
      if (target.hasAttribute("title")) {
        const titleVal = target.getAttribute("title")
        if (titleVal) {
          target.setAttribute("data-tooltip", titleVal)
          if (!target.hasAttribute("aria-label")) {
            target.setAttribute("aria-label", titleVal)
          }
          target.removeAttribute("title")
          text = titleVal
        }
      }

      if (!text) return

      // Clear any pending hide timeouts
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }

      // Clear any existing show delay and start a new 0.5-second delay
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
      }

      showTimeoutRef.current = setTimeout(() => {
        const rect = target.getBoundingClientRect()
        const placement = target.getAttribute("data-tooltip-placement") || "top"

        setGlobalTooltip({
          text,
          rect,
          placement,
          target,
        })
      }, 500)
    }

    const handleMouseOut = (e) => {
      const target = e.target.closest("[data-tooltip]")
      if (!target) return

      // Check if mouse is still inside the target container (e.g. moving to/from child elements)
      const related = e.relatedTarget
      if (related && target.contains(related)) {
        return
      }

      // Clear the show delay if user moves away before 0.5 seconds
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
        showTimeoutRef.current = null
      }

      // Small delay so fast transitions between items don't feel glitchy
      hoverTimeoutRef.current = setTimeout(() => {
        setGlobalTooltip(null)
      }, 50)
    }

    const handleScrollOrClick = () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current)
        showTimeoutRef.current = null
      }
      setGlobalTooltip(null)
    }

    document.addEventListener("mouseover", handleMouseOver)
    document.addEventListener("mouseout", handleMouseOut)
    document.addEventListener("click", handleScrollOrClick)
    window.addEventListener("scroll", handleScrollOrClick, true)

    return () => {
      document.removeEventListener("mouseover", handleMouseOver)
      document.removeEventListener("mouseout", handleMouseOut)
      document.removeEventListener("click", handleScrollOrClick)
      window.removeEventListener("scroll", handleScrollOrClick, true)
    }
  }, [])

  return (
    <TooltipContext.Provider value={{ content: "", setContent: () => {} }}>
      {children}
      {globalTooltip && typeof document !== "undefined" && createPortal(
        <TooltipPortal tooltip={globalTooltip} />,
        document.body
      )}
    </TooltipContext.Provider>
  )
}

function Tooltip({ children }) {
  const [content, setContent] = React.useState("")
  return (
    <TooltipContext.Provider value={{ content, setContent }}>
      {children}
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({ asChild, children, ...props }) {
  const { content } = React.useContext(TooltipContext)

  if (asChild && React.isValidElement(children)) {
    const existingTitle = children.props.title || "";
    const title = existingTitle || content || "";
    return React.cloneElement(children, {
      ...props,
      title,
    })
  }

  return (
    <span {...props} title={content || props.title}>
      {children}
    </span>
  )
}

function TooltipContent({ children }) {
  const { setContent } = React.useContext(TooltipContext)

  React.useEffect(() => {
    let text = ""
    if (typeof children === "string") {
      text = children
    } else if (children) {
      const extractText = (node) => {
        if (!node) return ""
        if (typeof node === "string" || typeof node === "number") return String(node)
        if (Array.isArray(node)) return node.map(extractText).filter(Boolean).join("\n")
        if (node.props && node.props.children) return extractText(node.props.children)
        return ""
      }
      text = extractText(children)
    }
    setContent(text.trim())
  }, [children, setContent])

  return null
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
