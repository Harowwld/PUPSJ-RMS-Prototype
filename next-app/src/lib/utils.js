import { clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge"

const customTwMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      rounded: [
        "rounded-brand",
        "rounded-t-brand",
        "rounded-b-brand",
        "rounded-l-brand",
        "rounded-r-brand",
        "rounded-tl-brand",
        "rounded-tr-brand",
        "rounded-bl-brand",
        "rounded-br-brand",
      ],
    },
  },
})

export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function cn(...inputs) {
  return customTwMerge(clsx(inputs));
}

