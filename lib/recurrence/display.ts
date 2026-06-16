import type { DisplayState } from "@/lib/types"

export const STATE_CONFIG: Record<
  DisplayState,
  { label: string; bgClass: string; textClass: string; dotClass: string }
> = {
  damien_kids: {
    label: "Damien a ses enfants",
    bgClass: "bg-blue-100",
    textClass: "text-blue-800",
    dotClass: "bg-blue-500",
  },
  ma_kid: {
    label: "MA a sa fille",
    bgClass: "bg-pink-100",
    textClass: "text-pink-800",
    dotClass: "bg-pink-500",
  },
  both_kids: {
    label: "Chacun a ses enfants",
    bgClass: "bg-violet-100",
    textClass: "text-violet-800",
    dotClass: "bg-violet-500",
  },
  available: {
    label: "Disponible ensemble",
    bgClass: "bg-green-100",
    textClass: "text-green-800",
    dotClass: "bg-green-500",
  },
  damien_unavailable: {
    label: "Damien indisponible",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    dotClass: "bg-gray-400",
  },
  ma_unavailable: {
    label: "MA indisponible",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    dotClass: "bg-gray-400",
  },
  both_unavailable: {
    label: "Tous les deux indisponibles",
    bgClass: "bg-gray-100",
    textClass: "text-gray-700",
    dotClass: "bg-gray-400",
  },
  shared_event: {
    label: "Événement commun",
    bgClass: "bg-amber-100",
    textClass: "text-amber-800",
    dotClass: "bg-amber-500",
  },
  custody_change: {
    label: "Changement de garde",
    bgClass: "bg-orange-100",
    textClass: "text-orange-800",
    dotClass: "bg-orange-500",
  },
}
