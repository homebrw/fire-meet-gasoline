import type { WeatherIconKey } from "@/lib/types"

// WMO weather codes used by Open-Meteo: https://open-meteo.com/en/docs
export function wmoCodeToIcon(code: number): WeatherIconKey {
  if (code === 0) return "clear"
  if (code === 1 || code === 2) return "partly-cloudy"
  if (code === 3) return "cloudy"
  if (code === 45 || code === 48) return "fog"
  if (code >= 51 && code <= 57) return "drizzle"
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow"
  if (code >= 95 && code <= 99) return "thunderstorm"
  return "cloudy"
}

// OpenWeatherMap condition IDs: https://openweathermap.org/weather-conditions
export function owmCodeToIcon(code: number): WeatherIconKey {
  if (code >= 200 && code < 300) return "thunderstorm"
  if (code >= 300 && code < 400) return "drizzle"
  if (code >= 500 && code < 600) return "rain"
  if (code >= 600 && code < 700) return "snow"
  if (code >= 700 && code < 800) return "fog"
  if (code === 800) return "clear"
  if (code === 801 || code === 802) return "partly-cloudy"
  if (code === 803 || code === 804) return "cloudy"
  return "cloudy"
}
