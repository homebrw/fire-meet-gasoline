// Reverse-geocodes coordinates to a human-readable place name using
// OpenStreetMap's Nominatim service (free, no key, but requires a
// descriptive User-Agent per their usage policy). Falls back to null on
// failure so the weather feature still works without a location label.
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse")
    url.searchParams.set("lat", String(lat))
    url.searchParams.set("lon", String(lon))
    url.searchParams.set("format", "json")
    url.searchParams.set("zoom", "10")
    url.searchParams.set("accept-language", "fr")

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "User-Agent": "fire-meet-gasoline (family calendar app)" },
    })
    if (!res.ok) return null

    const data = (await res.json()) as { address?: Record<string, string> }
    const address = data.address
    if (!address) return null

    const city = address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb
    return city ?? null
  } catch {
    return null
  }
}
