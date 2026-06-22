import { getValidGoogleAccessToken } from "@/lib/calendar-sync/connection"
import { queryFreeBusy, type BusyPeriod } from "@/lib/google-calendar"

export async function getGoogleBusyPeriods(
  personId: string,
  from: Date,
  to: Date
): Promise<BusyPeriod[]> {
  const connection = await getValidGoogleAccessToken(personId)
  if (!connection) return []
  return queryFreeBusy(connection.access_token, connection.calendar_id, from.toISOString(), to.toISOString())
}
