import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNewTab(text?: string) {
  if (!text) return ""
  return text.split('\\n').join('\n')
}

// Order of languages as they are stored in the joined text (one line per imported file):
// index 0 = first file (Uzbek), 1 = second file (Russian), 2 = third file (English).
const LANG_ORDER = ['uz', 'ru', 'en']

/**
 * Picks the single line matching the selected language from a multi-language field
 * (question title / option text / description) stored as `uz\nru[\nen]`.
 * Falls back to the first available line when the selected language is missing
 * (e.g. existing 2-language exams when the student selects English). Never throws.
 */
export function pickLangLine(text: string | undefined, lang?: string): string {
  if (!text) return ""
  const normalized = text.split('\\n').join('\n') // handle both escaped and real newlines
  const lines = normalized.split('\n')
  if (lines.length <= 1) return normalized // single-language / manually added content untouched
  const idx = LANG_ORDER.indexOf((lang || 'uz').slice(0, 2))
  return lines[idx >= 0 ? idx : 0] ?? lines[0]
}
