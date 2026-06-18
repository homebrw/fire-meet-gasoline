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

/**
 * Formate un instant en heure murale "HH:mm" dans le fuseau donné, sans
 * dépendre du fuseau horaire du runtime (important côté serveur, où le
 * fuseau système peut être UTC alors que l'app raisonne en heure de Paris).
 */
export function formatTimeInZone(date: Date, timeZone: string = APP_TIMEZONE): string {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return dtf.format(date)
}

/**
 * Calcule les bornes (début/fin) d'une journée calendaire dans le fuseau
 * donné, en instants UTC réels. Le jour calendaire est lu sur `date` via ses
 * accesseurs locaux (année/mois/jour) — `date` doit donc représenter ce
 * jour-là, peu importe l'heure exacte qu'elle porte.
 *
 * Sert à éviter que le découpage par jour (utilisé pour grouper périodes de
 * garde, transitions, événements et disponibilités) ne se fasse selon le
 * fuseau du runtime serveur (souvent UTC) au lieu du fuseau de l'app.
 */
export function zonedDayBounds(
  date: Date,
  timeZone: string = APP_TIMEZONE
): { start: Date; end: Date } {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const start = zonedTimeToUtc(year, month, day, 0, 0, timeZone)
  const end = new Date(zonedTimeToUtc(year, month, day, 23, 59, timeZone).getTime() + 59999)
  return { start, end }
}

/**
 * Renvoie un Date marqueur (heure locale système à minuit) représentant le
 * jour calendaire "aujourd'hui" dans le fuseau donné. Utilisé comme point de
 * départ des plages `from`/`to` pour que "aujourd'hui" corresponde au jour
 * vécu par les utilisateurs (Europe/Paris), pas au jour du runtime serveur.
 */
export function todayInZone(timeZone: string = APP_TIMEZONE): Date {
  const now = new Date()
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = dtf.formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return new Date(get("year"), get("month") - 1, get("day"))
}
