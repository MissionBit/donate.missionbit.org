export function formatCents(cents: number): string {
  return Math.floor(cents / 100).toFixed(0);
}
