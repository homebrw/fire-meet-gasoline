import type { WeatherHourPoint, WeatherRainNextHour, WeatherSourceData } from "@/lib/types"
import { owmCodeToIcon } from "../icons"

type OwmResponse = {
  current: {
    temp: number
    feels_like: number
    weather: { id: number; description: string }[]
  }
  minutely?: { dt: number; precipitation: number }[]
  hourly: {
    dt: number
    temp: number
    pop: number // probability of precipitation, 0-1
    weather: { id: number }[]
  }[]
}

// OpenWeatherMap One Call API 3.0. Requires OPENWEATHER_API_KEY (free tier).
// https://openweathermap.org/api/one-call-3
export async function fetchOpenWeatherMap(lat: number, lon: number): Promise<WeatherSourceData> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not configured")
  }

  const url = new URL("https://api.openweathermap.org/data/3.0/onecall")
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lon", String(lon))
  url.searchParams.set("appid", apiKey)
  url.searchParams.set("units", "metric")
  url.searchParams.set("lang", "fr")
  url.searchParams.set("exclude", "daily,alerts")

  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`OpenWeatherMap error: ${res.status}`)
  }
  const data = (await res.json()) as OwmResponse

  const now = Date.now()
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)

  const hourly: WeatherHourPoint[] = data.hourly
    .filter((point) => point.dt * 1000 >= now && point.dt * 1000 <= endOfDay.getTime())
    .map((point) => ({
      time: new Date(point.dt * 1000).toISOString(),
      temperature: point.temp,
      precipitationProbability: Math.round(point.pop * 100),
      icon: owmCodeToIcon(point.weather[0]?.id ?? 800),
    }))

  return {
    source: "openweathermap",
    label: "OpenWeatherMap",
    current: {
      temperature: data.current.temp,
      feelsLike: data.current.feels_like ?? null,
      condition: data.current.weather[0]?.description ?? "Conditions variables",
      icon: owmCodeToIcon(data.current.weather[0]?.id ?? 800),
    },
    hourly,
    rainNextHour: computeRainNextHour(data),
  }
}

function computeRainNextHour(data: OwmResponse): WeatherRainNextHour {
  if (!data.minutely || data.minutely.length === 0) {
    const nextHourPop = data.hourly[0]?.pop ?? 0
    return {
      willRain: nextHourPop >= 0.5,
      probability: Math.round(nextHourPop * 100),
      startsInMinutes: nextHourPop >= 0.5 ? 0 : null,
    }
  }

  const now = Date.now()
  const upcoming = data.minutely
    .filter((point) => point.dt * 1000 >= now)
    .slice(0, 60)

  const rainingIndex = upcoming.findIndex((point) => point.precipitation > 0.1)

  if (rainingIndex === -1) {
    return { willRain: false, probability: null, startsInMinutes: null }
  }

  return {
    willRain: true,
    probability: null,
    startsInMinutes: rainingIndex,
  }
}
