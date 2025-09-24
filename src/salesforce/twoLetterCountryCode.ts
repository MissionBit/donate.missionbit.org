import { whereAlpha3 } from "iso-3166-1";

export function twoLetterCountryCode(
  country: string | null | undefined,
): string | null {
  if (!country) {
    return null;
  } else if (country.length === 2) {
    return country.toUpperCase();
  }
  const c = whereAlpha3(country);
  return c ? c.alpha2 : null;
}
