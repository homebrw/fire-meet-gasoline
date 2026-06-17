import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function lightenColor(hex: string, percent: number = 30): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const r = Math.min(255, Math.round((num >> 16) + (255 - (num >> 16)) * (percent / 100)))
  const g = Math.min(255, Math.round(((num >> 8) & 255) + (255 - ((num >> 8) & 255)) * (percent / 100)))
  const b = Math.min(255, Math.round((num & 255) + (255 - (num & 255)) * (percent / 100)))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`
}
