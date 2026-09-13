export const WAITLIST_SEASONS: Record<string, string> = {
  spring: 'Spring',
  summer: 'Summer',
}

export const WAITLIST_CITIES: Record<string, string> = {
  berlin: 'Berlin',
  hamburg: 'Hamburg',
  paris: 'Paris',
}

export const WAITLIST_SEASONS_RU: Record<string, string> = {
  spring: 'Весна',
  winter: 'Зима',
  summer: 'Лето',
}

export const WAITLIST_CITIES_RU: Record<string, string> = {
  berlin: 'Берлин',
  hamburg: 'Гамбург',
  paris: 'Париж',
}

function readChoices(
  formData: FormData,
  name: string,
  options: Record<string, string>
): string[] | null {
  const values = formData.getAll(name).map(String)
  if (values.length === 0 || values.some((value) => !Object.hasOwn(options, value))) {
    return null
  }
  return Object.keys(options).filter((value) => values.includes(value))
}

export function parseWaitlistPreferences(formData: FormData):
  | { ok: true; seasons: string[]; cities: string[] }
  | { ok: false; error: string } {
  const seasons = readChoices(formData, 'seasons', WAITLIST_SEASONS)
  if (!seasons) return { ok: false, error: 'Please choose at least one season.' }

  const cities = readChoices(formData, 'cities', WAITLIST_CITIES)
  if (!cities) return { ok: false, error: 'Please choose at least one city.' }

  return { ok: true, seasons, cities }
}
