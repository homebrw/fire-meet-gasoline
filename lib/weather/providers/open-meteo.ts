import type { WeatherHourPoint, WeatherRainNextHour, WeatherSourceData } from "@/lib/types"
import { wmoCodeToIcon } from "../icons"
import { wmoCodeToLabel } from "../conditions"

type OpenMeteoResponse = {
  current: {
    temperature_2m: number
    apparent_temperature: number
    weather_code: number
  }
  hourly: {
    time: string[]
    temperature_2m: number[]
    precipitation_probability: number[]
    weather_code: number[]
  }
  minutely_15: {
    time: string[]
    precipitation: number[]
  }
}

// Open-Meteo: free, no API key required. https://open-meteo.com/en/docs
export async function fetchOpenMeteo(lat: number, lon: number): Promise<WeatherSourceData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast")
  url.searchParams.set("latitude", String(lat))
  url.searchParams.set("longitude", String(lon))
  url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code")
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,weather_code")
  url.searchParams.set("minutely_15", "precipitation")
  url.searchParams.set("forecast_days", "1")
  url.searchParams.set("timezone", "auto")

  const res = await fetch(url.toString(), { cache: "no-store" })
  if (!res.ok) {
    throw new Error(`Open-Meteo error: ${res.status}`)
  }
  const data = (await res.json()) as OpenMeteoResponse

  const now = new Date()
  const hourly: WeatherHourPoint[] = data.hourly.time
    .map((time, i) => ({
      time,
      temperature: data.hourly.temperature_2m[i],
      precipitationProbability: data.hourly.precipitation_probability[i] ?? null,
      icon: wmoCodeToIcon(data.hourly.weather_code[i]),
    }))
    .filter((point) => new Date(point.time) >= now)

  const rainNextHour = computeRainNextHour(data.minutely_15, now)

  return {
    source: "open-meteo",
    label: "Open-Meteo",
    current: {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature ?? null,
      condition: wmoCodeToLabel(data.current.weather_code),
      icon: wmoCodeToIcon(data.current.weather_code),
    },
    hourly,
    rainNextHour,
  }
}

function computeRainNextHour(
  minutely: OpenMeteoResponse["minutely_15"],
  now: Date
): WeatherRainNextHour {
  const upcoming = minutely.time
    .map((time, i) => ({ time, precipitation: minutely.precipitation[i] }))
    .filter((point) => new Date(point.time) >= now)
    .slice(0, 4) // next 4 x 15min = next hour

  const rainingIndex = upcoming.findIndex((point) => point.precipitation > 0.1)

  if (rainingIndex === -1) {
    return { willRain: false, probability: null, startsInMinutes: null }
  }

  return {
    willRain: true,
    probability: null,
    startsInMinutes: rainingIndex * 15,
  }
}
