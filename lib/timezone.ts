// Fuseau horaire de référence de l'app (foyers en France)
export const APP_TIMEZONE = "Europe/Paris"

/**
 * Convertit une heure murale (year/month/day/hours/minutes) dans le fuseau
 * donné en instant UTC, en gérant correctement les transitions heure d'été/hiver.
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string = APP_TIMEZONE
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0))

  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  const parts = dtf.formatToParts(utcGuess)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") === 24 ? 0 : get("hour"),
    get("minute"),
    get("second")
  )

  const diff = utcGuess.getTime() - asUTC
  return new Date(utcGuess.getTime() + diff)
}
