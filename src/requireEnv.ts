function expectString(value: unknown, message?: string): string {
  if (typeof value !== "string") {
    throw new TypeError(message ?? "Expected string");
  }
  return value;
}

export default function requireEnv(key: string): string {
  return expectString(
    process.env[key],
    `Required environment variable ${key} missing`,
  );
}
