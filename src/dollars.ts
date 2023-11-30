export const dollarFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export default function dollars(cents: number): string {
  return dollarFormatter.format(Math.floor(0.01 * cents));
}
