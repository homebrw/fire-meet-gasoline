"use client"

import { useEffect, useState } from "react"
import type { WeatherData, WeatherIconKey } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format, parseISO } from "date-fns"
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
} from "lucide-react"

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
  const [geoSupported] = useState(() => typeof navigator !== "undefined" && "geolocation" in navigator)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState<string | null>(
    geoSupported ? null : "Géolocalisation non disponible sur cet appareil"
  )
  const [loading, setLoading] = useState(geoSupported)

  useEffect(() => {
    if (!geoSupported) return

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
  }, [geoSupported])

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
            Position actuelle
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
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Pluie dans l&apos;heure</p>
          {weather.sources.map((source) => (
            <div key={source.source} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-muted-foreground)]">{source.label}</span>
              <span className="font-medium">
                {!source.rainNextHour || !source.rainNextHour.willRain
                  ? "Pas de pluie prévue"
                  : source.rainNextHour.startsInMinutes === 0
                    ? "Pluie en cours ou imminente"
                    : `Pluie dans ~${source.rainNextHour.startsInMinutes} min`}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
