import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNewTab(text?: string) {
  if (!text) return ""
  return text.split('\\n').join('\n')
}
