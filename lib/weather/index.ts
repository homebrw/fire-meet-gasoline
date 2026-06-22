import type { WeatherData } from "@/lib/types"
import { fetchOpenMeteo } from "./providers/open-meteo"
import { fetchOpenWeatherMap } from "./providers/openweathermap"

// Fetches weather from every configured source in parallel. A source that
// fails (e.g. missing API key, provider outage) is silently dropped so the
// UI can still render the others.
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const results = await Promise.allSettled([
    fetchOpenMeteo(lat, lon),
    fetchOpenWeatherMap(lat, lon),
  ])

  const sources = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => (result as PromiseFulfilledResult<WeatherData["sources"][number]>).value)

  return { lat, lon, sources }
}
