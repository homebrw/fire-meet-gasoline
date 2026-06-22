import { createClient } from "@/lib/supabase/server"
import { fetchWeather } from "@/lib/weather"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get("lat"))
  const lon = Number(searchParams.get("lon"))

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Missing or invalid lat/lon" }, { status: 400 })
  }

  const weather = await fetchWeather(lat, lon)

  if (weather.sources.length === 0) {
    return NextResponse.json({ error: "No weather source available" }, { status: 502 })
  }

  return NextResponse.json(weather)
}
