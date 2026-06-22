// Raw-fetch client for Google OAuth + Calendar API v3.
// No `googleapis` dependency — keeps this in line with the rest of the
// codebase, which talks to Supabase directly rather than via heavy SDKs.

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ")

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CALENDAR_CLIENT_ID/GOOGLE_CALENDAR_CLIENT_SECRET")
  }
  return { clientId, clientSecret }
}

function getRedirectUri() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  if (!baseUrl) throw new Error("Missing NEXT_PUBLIC_SITE_URL")
  return `${baseUrl}/api/calendar/google/callback`
}

export function getGoogleAuthUrl(state: string): string {
  const { clientId } = getClientCredentials()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`
}

export type GoogleTokens = {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getClientCredentials()
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`)
  return res.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = getClientCredentials()
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`)
  return res.json()
}

export async function getGoogleAccountEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch Google account email: ${await res.text()}`)
  const data = await res.json()
  return data.email
}

export type GoogleCalendarEventInput = {
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
}

export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEventInput
): Promise<{ id: string }> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  )
  if (!res.ok) throw new Error(`Failed to create Google event: ${await res.text()}`)
  return res.json()
}

export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  event: GoogleCalendarEventInput
): Promise<{ id: string }> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  )
  if (!res.ok) throw new Error(`Failed to update Google event: ${await res.text()}`)
  return res.json()
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  // 404/410: event already gone on Google's side — treat as success.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Failed to delete Google event: ${await res.text()}`)
  }
}

export type GoogleCalendarListEvent = {
  id: string
  summary?: string
  description?: string
  location?: string
  status?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
}

export async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<GoogleCalendarListEvent[]> {
  const events: GoogleCalendarListEvent[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    })
    const res = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!res.ok) throw new Error(`Failed to list Google events: ${await res.text()}`)
    const data = await res.json()
    events.push(...(data.items ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return events.filter((e) => e.status !== "cancelled")
}

export type BusyPeriod = { start: string; end: string }

export async function queryFreeBusy(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<BusyPeriod[]> {
  const res = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    }),
  })
  if (!res.ok) throw new Error(`Failed to query Google freebusy: ${await res.text()}`)
  const data = await res.json()
  return data.calendars?.[calendarId]?.busy ?? []
}
