import type { WeatherHourPoint, WeatherNextHourPoint, WeatherRainNextHour, WeatherSourceData } from "@/lib/types"
import { owmCodeToIcon } from "../icons"

type OwmRecord = {
  dt: number
  temp: number
  feels_like?: number
  humidity?: number
  wind_speed?: number // m/s
  precipitation?: number // mm/h
  weather: { id: number; description?: string }[]
}

type OwmTimelineResponse = {
  data: OwmRecord[]
}

// OpenWeatherMap One Call API 4.0. Requires OPENWEATHER_API_KEY (subscribed
// to "One Call by Call"). Unlike 3.0, it's split into separate "timeline"
// endpoints rather than one combined response.
// https://openweathermap.org/api/one-call-4
export async function fetchOpenWeatherMap(lat: number, lon: number): Promise<WeatherSourceData> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not configured")
  }

  const base = "https://api.openweathermap.org/data/4.0/onecall"
  const commonParams = { lat: String(lat), lon: String(lon), units: "metric", lang: "fr", appid: apiKey }

  const buildUrl = (path: string) => {
    const url = new URL(`${base}${path}`)
    for (const [key, value] of Object.entries(commonParams)) url.searchParams.set(key, value)
    return url.toString()
  }

  const [currentRes, minutelyRes, hourlyRes] = await Promise.all([
    fetch(buildUrl("/current"), { cache: "no-store" }),
    fetch(buildUrl("/timeline/1min"), { cache: "no-store" }),
    fetch(buildUrl("/timeline/1h"), { cache: "no-store" }),
  ])

  if (!currentRes.ok) throw new Error(`OpenWeatherMap current error: ${currentRes.status}`)
  if (!hourlyRes.ok) throw new Error(`OpenWeatherMap hourly error: ${hourlyRes.status}`)

  const current = ((await currentRes.json()) as OwmTimelineResponse).data[0]
  const hourly = ((await hourlyRes.json()) as OwmTimelineResponse).data
  const minutely = minutelyRes.ok ? ((await minutelyRes.json()) as OwmTimelineResponse).data : []

  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const restOfDay: WeatherHourPoint[] = hourly
    .filter((point) => point.dt * 1000 <= endOfDay.getTime())
    .map((point) => ({
      time: new Date(point.dt * 1000).toISOString(),
      temperature: point.temp,
      precipitationProbability: point.precipitation !== undefined ? (point.precipitation > 0 ? 100 : 0) : null,
      icon: owmCodeToIcon(point.weather[0]?.id ?? 800),
    }))

  const nextHourTimeline = buildNextHourTimeline(minutely)

  return {
    source: "openweathermap",
    label: "OpenWeatherMap",
    current: {
      temperature: current.temp,
      feelsLike: current.feels_like ?? null,
      humidity: current.humidity ?? null,
      windSpeed: current.wind_speed !== undefined ? Math.round(current.wind_speed * 3.6) : null, // m/s -> km/h
      condition: current.weather[0]?.description ?? "Conditions variables",
      icon: owmCodeToIcon(current.weather[0]?.id ?? 800),
    },
    hourly: restOfDay,
    daily: [],
    rainNextHour: computeRainNextHour(nextHourTimeline, hourly),
    nextHourTimeline,
  }
}

function buildNextHourTimeline(minutely: OwmRecord[]): WeatherNextHourPoint[] {
  return [...minutely]
    .sort((a, b) => a.dt - b.dt)
    .slice(0, 60)
    .map((point) => ({
      time: new Date(point.dt * 1000).toISOString(),
      precipitation: point.precipitation ?? 0, // mm/h at 1-minute resolution
    }))
}

function computeRainNextHour(timeline: WeatherNextHourPoint[], hourly: OwmRecord[]): WeatherRainNextHour {
  if (timeline.length === 0) {
    const nextHourPrecip = hourly[0]?.precipitation ?? 0
    return {
      willRain: nextHourPrecip > 0,
      probability: null,
      startsInMinutes: nextHourPrecip > 0 ? 0 : null,
    }
  }

  const rainingIndex = timeline.findIndex((point) => point.precipitation > 0.1)

  if (rainingIndex === -1) {
    return { willRain: false, probability: null, startsInMinutes: null }
  }

  return {
    willRain: true,
    probability: null,
    startsInMinutes: rainingIndex,
  }
}
