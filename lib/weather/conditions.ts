// French condition labels keyed by WMO weather code (Open-Meteo).
const WMO_LABELS: Record<number, string> = {
  0: "Ciel dégagé",
  1: "Plutôt dégagé",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine",
  55: "Bruine dense",
  56: "Bruine verglaçante",
  57: "Bruine verglaçante dense",
  61: "Pluie légère",
  63: "Pluie",
  65: "Pluie forte",
  66: "Pluie verglaçante",
  67: "Pluie verglaçante forte",
  71: "Neige légère",
  73: "Neige",
  75: "Neige forte",
  77: "Grains de neige",
  80: "Averses légères",
  81: "Averses",
  82: "Averses violentes",
  85: "Averses de neige légères",
  86: "Averses de neige fortes",
  95: "Orage",
  96: "Orage avec grêle légère",
  99: "Orage avec grêle forte",
}

export function wmoCodeToLabel(code: number): string {
  return WMO_LABELS[code] ?? "Conditions variables"
}
