import type { WeatherData, WeatherSourceId } from "@/lib/types"
import { fetchOpenMeteo } from "./providers/open-meteo"
import { fetchOpenWeatherMap } from "./providers/openweathermap"

const PROVIDERS: { source: WeatherSourceId; fetch: typeof fetchOpenMeteo }[] = [
  { source: "open-meteo", fetch: fetchOpenMeteo },
  { source: "openweathermap", fetch: fetchOpenWeatherMap },
]

// Fetches weather from every configured source in parallel. A source that
// fails (e.g. missing API key, provider outage) is dropped from `sources`
// so the UI can still render the others, but the failure reason is kept in
// `errors` so it can be surfaced for debugging instead of failing silently.
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const results = await Promise.allSettled(PROVIDERS.map((provider) => provider.fetch(lat, lon)))

  const sources: WeatherData["sources"] = []
  const errors: WeatherData["errors"] = []

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sources.push(result.value)
    } else {
      errors.push({
        source: PROVIDERS[i].source,
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }
  })

  return { lat, lon, sources, errors }
}
