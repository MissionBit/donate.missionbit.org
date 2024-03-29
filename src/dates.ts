const timeZone = "America/Los_Angeles";

export const LongDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  timeZoneName: "short",
});

export const LongDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export const MediumDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  year: "numeric",
  month: "long",
  day: "numeric",
});

export const ShortDateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  year: "2-digit",
  month: "numeric",
  day: "numeric",
});

export const CourseDateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone,
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  timeZoneName: "short",
});

function dropWhile<T>(collection: T[], predicate: (x: T) => boolean): T[] {
  for (let i = 0; i < collection.length; i++) {
    if (!predicate(collection[i])) {
      return collection.slice(i);
    }
  }
  return [];
}

function dropRightWhile<T>(collection: T[], predicate: (x: T) => boolean): T[] {
  for (let i = collection.length; i > 0; i--) {
    if (!predicate(collection[i - 1])) {
      return collection.slice(0, i);
    }
  }
  return [];
}

function span<T>(collection: T[], predicate: (x: T) => boolean): [T[], T[]] {
  const suffix = dropWhile(collection, predicate);
  return [collection.slice(0, collection.length - suffix.length), suffix];
}

interface HourStartEndPartsOpts {
  format: Intl.DateTimeFormat;
  ordinalDay: boolean;
}

const hourStartEndPartsOptsDefaults: HourStartEndPartsOpts = {
  format: LongDateTimeFormat,
  ordinalDay: false,
};

const suffixMap: { readonly [k: number]: string } = {
  1: "st",
  2: "nd",
  3: "rd",
} as const;

function ordinalSuffix(n: number): string {
  const suffix = suffixMap[n > 10 && n < 20 ? 0 : n % 10] ?? "th";
  return `${n}${suffix}`;
}

export function hourStartEndParts(
  start: number,
  end: number,
  opts?: Partial<HourStartEndPartsOpts>,
): { date: string; time: string } {
  const { format, ordinalDay } = {
    ...hourStartEndPartsOptsDefaults,
    ...(opts ?? {}),
  };
  const notHour = ({ type }: Intl.DateTimeFormatPart) => type !== "hour";
  const notYear = ({ type }: Intl.DateTimeFormatPart) =>
    type !== "year" && type !== "day";
  const notDayPeriod = ({ type }: Intl.DateTimeFormatPart) =>
    // Workaround for node 10 bug that uses dayperiod instead of dayPeriod
    // https://github.com/zapier/intl-dateformat/issues/4
    !/^day[Pp]eriod$/.test(type);
  const getValue = ({ type, value }: Intl.DateTimeFormatPart) =>
    type === "day" && ordinalDay ? ordinalSuffix(+value) : value;
  const [startDate, startHour] = span(format.formatToParts(start), notHour);
  const endHour = dropWhile(format.formatToParts(end), notHour);
  const dateParts: string[] = dropRightWhile(startDate, notYear).map(getValue);
  const timeParts: string[] = dropRightWhile(startHour, notDayPeriod).map(
    getValue,
  );
  timeParts.push(" - ", ...endHour.map(getValue));
  return {
    date: dateParts.join(""),
    time: timeParts.join("").replace(/:00/g, ""),
  };
}
