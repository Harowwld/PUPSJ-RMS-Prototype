"use client"

import * as React from "react"

// Create a context to share the tooltip content text with the trigger
const TooltipContext = React.createContext({
  content: "",
  setContent: () => {},
})

function TooltipProvider({ children }) {
  return <>{children}</>;
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
        if (Array.isArray(node)) return node.map(extractText).join("")
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
