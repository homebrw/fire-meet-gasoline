"use client"

import { useEffect, useState } from "react"
import type { WeatherData, WeatherIconKey } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO, isTomorrow } from "date-fns"
import { fr } from "date-fns/locale"
import {
  CloudSun,
  Sun,
  Cloud,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  MapPin,
  AlertCircle,
  Droplets,
  Wind,
  Sunset,
} from "lucide-react"

function uvLabel(uv: number): string {
  if (uv < 3) return "Faible"
  if (uv < 6) return "Modéré"
  if (uv < 8) return "Élevé"
  if (uv < 11) return "Très élevé"
  return "Extrême"
}

const ICONS: Record<WeatherIconKey, typeof Sun> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunderstorm: CloudLightning,
}

function WeatherIcon({ icon, className }: { icon: WeatherIconKey; className?: string }) {
  const Icon = ICONS[icon] ?? Cloudy
  return <Icon className={className} />
}

export function WeatherCard() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Géolocalisation non disponible sur cet appareil")
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`)
          if (!res.ok) throw new Error("Échec de récupération de la météo")
          const data: WeatherData = await res.json()
          setWeather(data)
        } catch {
          setError("Impossible de récupérer la météo")
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError("Position non autorisée — active la géolocalisation pour voir la météo")
        setLoading(false)
      }
    )
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">Localisation en cours…</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !weather || weather.sources.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CloudSun className="h-4 w-4 text-[var(--color-muted-foreground)]" />
            Météo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)] flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error ?? "Météo indisponible"}
          </p>
        </CardContent>
      </Card>
    )
  }

  const primary = weather.sources[0]
  const restOfDay = primary.hourly.slice(0, 6)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          Météo
          <span className="ml-auto text-xs font-normal text-[var(--color-muted-foreground)] flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {weather.placeName ?? "Position actuelle"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <WeatherIcon icon={primary.current.icon} className="h-10 w-10 text-[var(--color-foreground)]" />
          <div>
            <p className="text-2xl font-semibold">{Math.round(primary.current.temperature)}°C</p>
            <p className="text-sm text-[var(--color-muted-foreground)] capitalize">
              {primary.current.condition}
              {primary.current.feelsLike !== null &&
                ` · ressenti ${Math.round(primary.current.feelsLike)}°C`}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)] flex items-center gap-3 mt-0.5">
              {primary.current.humidity !== null && (
                <span className="flex items-center gap-1">
                  <Droplets className="h-3 w-3" />
                  {primary.current.humidity}%
                </span>
              )}
              {primary.current.windSpeed !== null && (
                <span className="flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  {Math.round(primary.current.windSpeed)} km/h
                </span>
              )}
              {primary.current.uvIndex !== null && (
                <span className="flex items-center gap-1">
                  <Sunset className="h-3 w-3" />
                  UV {Math.round(primary.current.uvIndex)} · {uvLabel(primary.current.uvIndex)}
                </span>
              )}
            </p>
          </div>
        </div>

        {restOfDay.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {restOfDay.map((point) => (
              <div key={point.time} className="flex flex-col items-center gap-1 shrink-0 min-w-12">
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {format(parseISO(point.time), "HH'h'", { locale: fr })}
                </span>
                <WeatherIcon icon={point.icon} className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                <span className="text-xs font-medium">{Math.round(point.temperature)}°</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {point.precipitationProbability !== null ? `${point.precipitationProbability}%` : " "}
                </span>
              </div>
            ))}
          </div>
        )}

        {primary.daily.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 pt-1 border-t border-[var(--color-border)]">
            {primary.daily.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1 shrink-0 min-w-14">
                <span className="text-xs text-[var(--color-muted-foreground)] capitalize">
                  {isTomorrow(parseISO(day.date))
                    ? "Demain"
                    : format(parseISO(day.date), "EEE", { locale: fr })}
                </span>
                <WeatherIcon icon={day.icon} className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                <span className="text-xs">
                  <span className="font-medium">{Math.round(day.temperatureMax)}°</span>
                  {" / "}
                  <span className="text-[var(--color-muted-foreground)]">{Math.round(day.temperatureMin)}°</span>
                </span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  {day.precipitationProbability !== null ? `${day.precipitationProbability}%` : " "}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 pt-1 border-t border-[var(--color-border)]">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Pluie dans l&apos;heure</p>
          {weather.sources.map((source) => (
            <div key={source.source} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted-foreground)]">{source.label}</span>
                <span className="font-medium">
                  {!source.rainNextHour || !source.rainNextHour.willRain
                    ? "Pas de pluie prévue"
                    : source.rainNextHour.startsInMinutes === 0
                      ? "Pluie en cours ou imminente"
                      : `Pluie dans ~${source.rainNextHour.startsInMinutes} min`}
                </span>
              </div>
              {source.nextHourTimeline.length > 1 && (
                <div className="flex items-end gap-0.5 h-6">
                  {source.nextHourTimeline.map((point) => (
                    <div
                      key={point.time}
                      className="flex-1 rounded-sm bg-[var(--color-primary)]"
                      style={{
                        height: `${Math.max(8, Math.min(100, (point.precipitation / 2) * 100))}%`,
                        opacity: point.precipitation > 0 ? 1 : 0.15,
                      }}
                      title={`${format(parseISO(point.time), "HH:mm")} · ${point.precipitation.toFixed(1)} mm/h`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {weather.errors.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-[var(--color-border)]">
            {weather.errors.map((err) => (
              <p
                key={err.source}
                className="text-xs text-[var(--color-muted-foreground)] flex items-start gap-1.5"
              >
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>
                  {err.source} indisponible : {err.message}
                </span>
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
