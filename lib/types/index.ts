// ─── Core Entities ────────────────────────────────────────────────────────────

export type Person = {
  id: string
  name: string
  color: string
  avatar_url: string | null
  auth_user_id: string | null
  date_of_birth: string | null // 'YYYY-MM-DD'
  parent_id: string | null
  is_child: boolean
  created_at: string
  updated_at: string
}

export type RecurrencePatternType = "weekly_alternating" | "custom_cycle" | "manual"

export type RecurrenceRule = {
  id: string
  person_id: string
  name: string
  pattern_type: RecurrencePatternType
  starts_at: string
  custody_start_time: string  // 'HH:MM'
  custody_end_time: string    // 'HH:MM'
  week_parity: "even" | "odd" | null
  handoff_day: number | null   // 0 = lundi … 6 = dimanche (weekly_alternating)
  cycle_length_days: number | null
  custody_days: number[] | null   // day indices within the cycle
  handoff_location: string | null
  ends_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RecurrenceExceptionType = "cancel" | "move" | "extend" | "shorten" | "add"

export type RecurrenceException = {
  id: string
  recurrence_rule_id: string
  person_id: string
  original_start_at: string | null
  original_end_at: string | null
  override_start_at: string | null
  override_end_at: string | null
  type: RecurrenceExceptionType
  reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ChildPresence = {
  id: string
  person_id: string
  start_at: string
  end_at: string
  recurrence_rule_id: string | null
  is_exception: boolean
  exception_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type CustodyTransitionDirection = "pickup" | "dropoff"

export type CustodyTransition = {
  id: string
  person_id: string
  transition_at: string
  direction: CustodyTransitionDirection
  location: string | null
  recurrence_rule_id: string | null
  is_exception: boolean
  exception_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type EventVisibility = "both" | "private"

export type CalendarEvent = {
  id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  location: string | null
  owner_person_id: string | null
  created_by: string
  is_blocking: boolean
  is_all_day: boolean
  visibility: EventVisibility
  allow_participants_to_see_attachments: boolean
  created_at: string
  updated_at: string
}

export type EventParticipant = {
  id: string
  event_id: string
  person_id: string
  status: "invited" | "accepted" | "declined"
  created_at: string
  updated_at: string
}

export type EventParticipantWithPerson = {
  person_id: string
  persons?: {
    name: string
    color: string
  } | null
}

export type EventAttachment = {
  id: string
  event_id: string
  file_name: string
  storage_path: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  created_at: string
}

// ─── Engine Types ─────────────────────────────────────────────────────────────

export type GeneratedPeriod = {
  person_id: string
  start_at: Date
  end_at: Date
  rule_id: string
  source: "rule" | "exception" | "manual"
  exception_id: string | null
}

export type DisplayState =
  | "damien_kids"
  | "ma_kid"
  | "both_kids"
  | "available"
  | "damien_unavailable"
  | "ma_unavailable"
  | "both_unavailable"
  | "shared_event"
  | "custody_change"

export type TimeWindow = {
  start: string               // 'HH:MM'
  end: string                 // 'HH:MM'
  startsAtDayBoundary: boolean // true if window begins exactly at 00:00
  endsAtDayBoundary: boolean   // true if window ends exactly at end of day
}

export type DayState = {
  date: string                          // 'YYYY-MM-DD'
  damienHasChildren: boolean
  maHasChild: boolean
  damienBlockingEvent: boolean
  maBlockingEvent: boolean
  damienIndividualBlockingEvent: boolean   // Only Damien's personal blocking event
  maIndividualBlockingEvent: boolean       // Only Ma's personal blocking event
  sharedBlockingEvent: boolean             // Both have blocking event (owner_person_id === null)
  damienPersonallyAvailable: boolean       // Damien free from personal events/custody
  maPersonallyAvailable: boolean           // Ma free from personal events/custody
  hasTransition: boolean
  sharedEvents: CalendarEvent[]
  custodyTransitions: CustodyTransition[]
  bothAvailable: boolean                // fully available for the entire day
  partiallyAvailable: boolean            // some, but not all, of the day is jointly free
  commonAvailableWindows: TimeWindow[]  // joint-free time windows for the day
  damienBusyWindows: TimeWindow[]       // merged busy intervals for person 1
  maBusyWindows: TimeWindow[]           // merged busy intervals for person 2
  displayState: DisplayState
}

// ─── Form Schemas (used in forms) ─────────────────────────────────────────────

export type RecurrenceRuleFormData = {
  person_id: string
  name: string
  pattern_type: RecurrencePatternType
  starts_at: string
  custody_start_time: string
  custody_end_time: string
  week_parity?: "even" | "odd"
  cycle_length_days?: number
  custody_days?: number[]
  handoff_location?: string
}

export type EventFormData = {
  title: string
  description?: string
  start_at: string
  end_at: string
  location?: string
  owner_person_id?: string
  is_blocking: boolean
  is_all_day: boolean
  visibility: EventVisibility
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export type WeatherIconKey =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunderstorm"

export type WeatherHourPoint = {
  time: string // ISO timestamp
  temperature: number
  precipitationProbability: number | null
  icon: WeatherIconKey
}

export type WeatherRainNextHour = {
  willRain: boolean
  probability: number | null // 0-100, when available
  startsInMinutes: number | null // null = no rain expected within the hour
}

// Fine-grained precipitation timeline covering the next hour, at the
// source's native resolution (15min for Open-Meteo, 1min for OpenWeatherMap).
export type WeatherNextHourPoint = {
  time: string // ISO timestamp
  precipitation: number // mm
}

export type WeatherSourceId = "open-meteo" | "openweathermap"

export type WeatherSourceData = {
  source: WeatherSourceId
  label: string
  current: {
    temperature: number
    feelsLike: number | null
    humidity: number | null // %
    windSpeed: number | null // km/h
    condition: string
    icon: WeatherIconKey
  }
  hourly: WeatherHourPoint[] // remaining hours of the current day
  rainNextHour: WeatherRainNextHour | null
  nextHourTimeline: WeatherNextHourPoint[]
}

export type WeatherSourceError = {
  source: WeatherSourceId
  message: string
}

export type WeatherData = {
  lat: number
  lon: number
  sources: WeatherSourceData[]
  errors: WeatherSourceError[]
}

export type ActivityFeedItem = {
  id: string
  type: "rule" | "event" | "exception" | "presence" | "transition"
  action: "created" | "updated"
  resourceName: string
  personName: string
  timestamp: string
}
