import type { DisplayState } from "@/lib/types"

type Classes = { bgClass: string; textClass: string; dotClass: string }
type StateConfig = Classes & { label: string }

// Color classes only — no person names needed (used by DayCell)
export const DISPLAY_CLASSES: Record<DisplayState, Classes> = {
  damien_kids:       { bgClass: "bg-blue-100",   textClass: "text-blue-800",   dotClass: "bg-blue-500" },
  ma_kid:            { bgClass: "bg-pink-100",   textClass: "text-pink-800",   dotClass: "bg-pink-500" },
  both_kids:         { bgClass: "bg-cyan-100", textClass: "text-cyan-800", dotClass: "bg-cyan-500" },
  available:         { bgClass: "bg-green-100",  textClass: "text-green-800",  dotClass: "bg-green-500" },
  damien_unavailable:{ bgClass: "bg-gray-100",   textClass: "text-gray-700",   dotClass: "bg-gray-400" },
  ma_unavailable:    { bgClass: "bg-gray-100",   textClass: "text-gray-700",   dotClass: "bg-gray-400" },
  both_unavailable:  { bgClass: "bg-gray-100",   textClass: "text-gray-700",   dotClass: "bg-gray-400" },
  shared_event:      { bgClass: "bg-amber-100",  textClass: "text-amber-800",  dotClass: "bg-amber-500" },
  custody_change:    { bgClass: "bg-orange-100", textClass: "text-orange-800", dotClass: "bg-orange-500" },
}

// Full config with labels — pass person names from the DB (used by status badges)
export function getStateConfig(
  person1Name: string,
  person2Name: string
): Record<DisplayState, StateConfig> {
  return {
    damien_kids:        { ...DISPLAY_CLASSES.damien_kids,        label: `${person1Name} a ses enfants` },
    ma_kid:             { ...DISPLAY_CLASSES.ma_kid,             label: `${person2Name} a sa fille` },
    both_kids:          { ...DISPLAY_CLASSES.both_kids,          label: "Chacun a ses enfants" },
    available:          { ...DISPLAY_CLASSES.available,          label: "Disponible ensemble" },
    damien_unavailable: { ...DISPLAY_CLASSES.damien_unavailable, label: `${person1Name} indisponible` },
    ma_unavailable:     { ...DISPLAY_CLASSES.ma_unavailable,     label: `${person2Name} indisponible` },
    both_unavailable:   { ...DISPLAY_CLASSES.both_unavailable,   label: "Tous les deux indisponibles" },
    shared_event:       { ...DISPLAY_CLASSES.shared_event,       label: "Événement commun" },
    custody_change:     { ...DISPLAY_CLASSES.custody_change,     label: "Changement de garde" },
  }
}
