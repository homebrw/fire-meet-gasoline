import type { DisplayState } from "@/lib/types"

type Classes = { bgClass: string; textClass: string; dotClass: string }
type StateConfig = Classes & { label: string }

// Color classes only — no person names needed (used by DayCell)
export const DISPLAY_CLASSES: Record<DisplayState, Classes> = {
  damien_kids:        { bgClass: "bg-[var(--color-damien-badge-bg)]",      textClass: "text-[var(--color-damien-badge-text)]",      dotClass: "bg-[var(--color-damien)]" },
  ma_kid:              { bgClass: "bg-[var(--color-ma-badge-bg)]",          textClass: "text-[var(--color-ma-badge-text)]",          dotClass: "bg-[var(--color-ma)]" },
  both_kids:           { bgClass: "bg-[var(--color-both-kids-badge-bg)]",   textClass: "text-[var(--color-both-kids-badge-text)]",   dotClass: "bg-[var(--color-both-kids)]" },
  available:           { bgClass: "bg-[var(--color-available-badge-bg)]",  textClass: "text-[var(--color-available-badge-text)]",  dotClass: "bg-[var(--color-available)]" },
  damien_unavailable:  { bgClass: "bg-[var(--color-unavailable-badge-bg)]", textClass: "text-[var(--color-unavailable-badge-text)]", dotClass: "bg-[var(--color-unavailable)]" },
  ma_unavailable:      { bgClass: "bg-[var(--color-unavailable-badge-bg)]", textClass: "text-[var(--color-unavailable-badge-text)]", dotClass: "bg-[var(--color-unavailable)]" },
  both_unavailable:    { bgClass: "bg-[var(--color-unavailable-badge-bg)]", textClass: "text-[var(--color-unavailable-badge-text)]", dotClass: "bg-[var(--color-unavailable)]" },
  shared_event:        { bgClass: "bg-[var(--color-event-badge-bg)]",       textClass: "text-[var(--color-event-badge-text)]",       dotClass: "bg-[var(--color-event)]" },
  custody_change:      { bgClass: "bg-[var(--color-transition-badge-bg)]",  textClass: "text-[var(--color-transition-badge-text)]",  dotClass: "bg-[var(--color-transition)]" },
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
