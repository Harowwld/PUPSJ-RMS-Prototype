import { toast } from "sonner";

/**
 * Safely copy error diagnostic details to the user's clipboard.
 * @param {string | object} details 
 */
export async function copyErrorToClipboard(details) {
  try {
    const text = typeof details === "string" 
      ? details 
      : JSON.stringify(details, null, 2);

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to Clipboard", {
        description: "Error diagnostic details have been copied.",
      });
      return true;
    }
  } catch (err) {
    console.warn("Failed to copy error details to clipboard:", err);
  }
  return false;
}

/**
 * Normalize arbitrary errors (Errors, HTTP response objects, strings)
 * into a standardized { title, description, action } structure suitable for Sonner toasts.
 * 
 * @param {any} error - The caught error, message string, or API response.
 * @param {{ title?: string, description?: string, actionLabel?: string, onAction?: () => void }} [fallbackContext]
 * @returns {{ title: string, description: string, action?: { label: string, onClick: () => void } }}
 */
export function formatErrorMessage(error, fallbackContext = {}) {
  const ctx = typeof fallbackContext === "string" ? { title: fallbackContext } : (fallbackContext || {});
  const fallbackTitle = ctx.title || "Operation Failed";
  const fallbackDesc = ctx.description || "An unexpected error occurred. Please try again.";

  let rawMessage = "";
  let rawStack = "";
  let status = null;

  if (error instanceof Error) {
    rawMessage = error.message || "";
    rawStack = error.stack || "";
    status = error.status || null;
  } else if (typeof error === "string") {
    rawMessage = error;
  } else if (error && typeof error === "object") {
    rawMessage = error.error || error.message || error.statusText || "";
    status = error.status || null;
  }

  const lower = rawMessage.toLowerCase();

  // 1. Network / Connection drops
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("err_connection")
  ) {
    return {
      title: "Network Disconnected",
      description: "Unable to reach the server. Please verify your internet or local network connection and retry.",
    };
  }

  // 2. Session timeout / 401 Unauthorized
  if (
    status === 401 ||
    lower.includes("invalid session") ||
    lower.includes("authentication required") ||
    lower.includes("session expired") ||
    lower.includes("not authenticated") ||
    lower.includes("jwt expired")
  ) {
    return {
      title: "Session Expired",
      description: "Your session has timed out. Please refresh the page or sign in again to continue.",
      action: {
        label: "Sign In",
        onClick: () => {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        },
      },
    };
  }

  // 3. 403 Forbidden / Access Denied
  if (
    status === 403 ||
    lower.includes("forbidden") ||
    lower.includes("access denied") ||
    lower.includes("permission denied")
  ) {
    return {
      title: "Permission Denied",
      description: "You do not have the required permissions for this action. Please check with an administrator.",
    };
  }

  // 4. Rate Limiting / 429
  if (
    status === 429 ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  ) {
    return {
      title: "Too Many Requests",
      description: "You have made too many requests in a short time. Please wait a moment before trying again.",
    };
  }

  // 5. File limit / Payload too large / 413
  if (
    status === 413 ||
    lower.includes("too large") ||
    lower.includes("payload too large") ||
    lower.includes("exceeds the limit") ||
    lower.includes("maximum file size")
  ) {
    return {
      title: "File Limit Exceeded",
      description: rawMessage || "The uploaded document is larger than the permitted file size.",
    };
  }

  // 5b. Duplicate / Conflict / 409
  if (
    status === 409 ||
    lower.includes("already registered") ||
    lower.includes("digital twin")
  ) {
    return {
      title: ctx.title || "Document Already on File",
      description: rawMessage || "A document of this type already exists for this record.",
    };
  }

  // 6. JSON parsing or HTML error responses
  if (
    lower.includes("unexpected token") ||
    lower.includes("is not valid json") ||
    lower.includes("syntaxerror")
  ) {
    return {
      title: "Server Communication Error",
      description: "The server sent an invalid response. Please try again shortly.",
      action: {
        label: "Copy Details",
        onClick: () => {
          copyErrorToClipboard({
            error: rawMessage,
            context: fallbackTitle,
            timestamp: new Date().toISOString(),
          });
        },
      },
    };
  }

  // 7. Internal Server Error / 500
  if (
    status === 500 ||
    lower.includes("internal server error") ||
    lower.includes("database error") ||
    lower.includes("unhandled exception")
  ) {
    return {
      title: fallbackTitle,
      description: "The server encountered an error while processing your request. Please try again or report this issue.",
      action: {
        label: "Copy Details",
        onClick: () => {
          copyErrorToClipboard({
            error: rawMessage,
            stack: rawStack,
            context: fallbackTitle,
            timestamp: new Date().toISOString(),
          });
        },
      },
    };
  }

  // 8. Meaningful custom error message from backend
  if (rawMessage && rawMessage.length < 200) {
    return {
      title: fallbackTitle,
      description: rawMessage,
    };
  }

  // 9. Generic Fallback with Copy Details
  return {
    title: fallbackTitle,
    description: fallbackDesc,
    action: {
      label: "Copy Details",
      onClick: () => {
        copyErrorToClipboard({
          error: rawMessage || "Unknown Error",
          stack: rawStack,
          context: fallbackTitle,
          timestamp: new Date().toISOString(),
        });
      },
    },
  };
}
