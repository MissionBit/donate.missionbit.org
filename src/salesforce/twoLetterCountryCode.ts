export function twoLetterCountryCode(
  country: string | null | undefined,
): string | null {
  if (country?.length === 2) {
    return country;
  } else if (country === "USA") {
    return "US";
  }
  return null;
}
