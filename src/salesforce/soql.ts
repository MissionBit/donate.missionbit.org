export function soqlQuote(value: string): string {
  const escapes = {
    ["\n"]: "\\n",
    ["\r"]: "\\r",
    ["\t"]: "\\t",
    ["\b"]: "\\b",
    ["\f"]: "\\f",
    ['"']: '\\"',
    [`'`]: `\\'`,
    ["\\"]: "\\\\",
  };
  return (
    "'" +
    value.replace(
      /[\n\r\t\b\f"'\\]/g,
      (match) => escapes[match as keyof typeof escapes],
    ) +
    "'"
  );
}

export function soql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings
    .map(
      (str, i) =>
        `${str}${
          typeof values[i] === "string" ? soqlQuote(values[i] as string) : ""
        }`,
    )
    .join("");
}
