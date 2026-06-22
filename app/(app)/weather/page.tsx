import { WeatherCard } from "@/components/weather/WeatherCard"

export default function WeatherPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pt-4 md:pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Météo</h1>
      <WeatherCard />
    </div>
  )
}
