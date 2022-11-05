const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export default function dollars(cents: number): string {
  return usdFormatter.format(Math.floor(0.01 * cents));
}
