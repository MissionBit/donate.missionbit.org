import dayjs from "dayjs";
import { fetch } from "cross-fetch";
import { getSupabaseClient } from "./getSupabaseClient";

// https://docs.google.com/spreadsheets/d/1h06Ee495xC7q_WEwa9cGxBv_31hj7t_c7qcREoFacTk/edit
// This spreadsheet must have "Anyone with the link can view" permission
export const SPREADSHEET_ID = "1h06Ee495xC7q_WEwa9cGxBv_31hj7t_c7qcREoFacTk";

export interface BalanceModification {
  readonly name: string;
  readonly amount: number;
  readonly notes: string;
  readonly created: number;
}

export interface IgnoredCharge {
  readonly id: string;
  readonly notes: string;
}

export interface BalanceModifications {
  readonly pollTime: number;
  readonly transactions: readonly BalanceModification[];
  readonly goalCents: number;
  readonly allGoalCents: readonly number[];
  readonly goalName: string;
  readonly campaignCopy: string;
  readonly ignoredTransactions: readonly IgnoredCharge[];
  readonly startTimestamp: number;
  readonly endTimestamp: number | null;
  readonly presetAmounts: readonly number[] | null;
  readonly galaDate: string | null;
  readonly galaAgenda: { href: string; title: string } | null;
}

function asUnknown(obj: unknown, prop: string): unknown {
  if (obj && typeof obj === "object") {
    return (obj as { [k: string]: unknown })[prop];
  }
  throw new Error(`Expected ${prop}`);
}

function asString(obj: unknown, prop: string): string {
  if (obj && typeof obj === "object") {
    const x = (obj as { [k: string]: unknown })[prop];
    if (typeof x === "string") {
      return x;
    }
  }
  throw new Error(`Expected string at ${prop}`);
}

function asArray(obj: unknown, prop: string): unknown[] {
  if (obj && typeof obj === "object") {
    const x = (obj as { [k: string]: unknown })[prop];
    if (x && Array.isArray(x)) {
      return x;
    }
  }
  throw new Error(`Expected Array at ${prop}`);
}

interface SheetValue {
  effectiveValue?: EffectiveValue;
}

interface EffectiveValue {
  boolValue?: boolean;
  stringValue?: string;
  numberValue?: number;
}

function effectiveValue(v: unknown): EffectiveValue | undefined {
  return !v && typeof v !== "object"
    ? undefined
    : (v as SheetValue).effectiveValue;
}

async function spreadsheetApiRequest(
  id: string,
  args: readonly string[],
): Promise<unknown> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}?${[
      ...args,
      `key=${process.env.GOOGLE_API_KEY}`,
    ].join("&")}`,
  );
  if (res.ok) {
    return await res.json();
  } else {
    console.error(await res.text());
    throw new Error(`${res.status} ${res.statusText}`);
  }
}

function isEmptyObject(v: unknown): v is Record<never, never> {
  if (typeof v !== "object" || v === null) {
    return false;
  }
  for (const _k in v) {
    return false;
  }
  return true;
}

function parseDocToSheetsAndRows(
  doc: unknown,
): Partial<{ [sheet: string]: unknown[] }> {
  const sheets: { [sheet: string]: unknown[] } = {};
  for (const sheet of asArray(doc, "sheets")) {
    const title = asString(asUnknown(sheet, "properties"), "title");
    const rows: unknown[] = [];
    sheets[title] = rows;
    for (const data of asArray(sheet, "data")) {
      if (!isEmptyObject(data)) {
        for (const rowData of asArray(data, "rowData")) {
          if (!isEmptyObject(rowData)) {
            rows.push(rowData);
          }
        }
      }
    }
  }
  return sheets;
}

export async function _getBalanceModifications(): Promise<BalanceModifications> {
  const pollTime = dayjs().unix();
  const transactions: BalanceModification[] = [];
  const id = SPREADSHEET_ID;
  const ignoredTransactions: IgnoredCharge[] = [];
  const parsed = parseDocToSheetsAndRows(
    await spreadsheetApiRequest(id, [
      "ranges=IgnoredTransactions!A2:B",
      "ranges=Adjustments!A2:E",
      "ranges=Instructions!A2:J",
      "fields=sheets(properties,data.rowData(values(effectiveValue)))",
    ]),
  );
  for (const rowData of asArray(parsed, "IgnoredTransactions")) {
    const values = asArray(rowData, "values").map(effectiveValue);
    const [idV, notesV] = values;
    if (idV?.stringValue) {
      ignoredTransactions.push({
        id: idV.stringValue,
        notes: notesV?.stringValue ?? "",
      });
    }
  }
  for (const rowData of asArray(parsed, "Adjustments")) {
    const values = asArray(rowData, "values").map(effectiveValue);
    const [nameV, amountV, includeV, notesV, timestampV] = values;
    if (includeV?.boolValue && timestampV?.stringValue) {
      transactions.push({
        name: nameV?.stringValue ?? "",
        amount: Math.floor(100 * (amountV?.numberValue ?? 0)),
        notes: notesV?.stringValue ?? "",
        created: Math.floor(
          (Date.parse(timestampV?.stringValue) ?? Date.now()) / 1000,
        ),
      });
    }
  }
  const allGoalCents = [];
  let goalCents = 1000 * 100;
  let goalName = "Mission Bit";
  let campaignCopy = "";
  let presetAmounts: readonly number[] | null = null;
  let startTimestamp =
    Date.parse(dayjs().format("YYYY-MM-01T00:00:00Z")) / 1000;
  let endTimestamp = null;
  let galaDate = null;
  let galaAgendaTitle = null;
  let galaAgendaUrl = null;
  for (const rowData of asArray(parsed, "Instructions")) {
    const values = asArray(rowData, "values").map(effectiveValue);
    const [nameV, amountV] = values;
    if (nameV?.stringValue === "Goal Amount" && amountV?.numberValue) {
      goalCents = Math.floor(100 * amountV.numberValue);
      allGoalCents.push(
        ...values.flatMap((v, i) =>
          i > 0 && v?.numberValue ? [Math.floor(100 * v.numberValue)] : [],
        ),
      );
    } else if (nameV?.stringValue === "Goal Name" && amountV?.stringValue) {
      goalName = amountV.stringValue;
    } else if (
      nameV?.stringValue === "Start Timestamp" &&
      amountV?.stringValue
    ) {
      startTimestamp = Date.parse(amountV.stringValue) / 1000;
    } else if (nameV?.stringValue === "End Timestamp" && amountV?.stringValue) {
      endTimestamp = Date.parse(amountV.stringValue) / 1000;
    } else if (
      nameV?.stringValue === "Preset Amounts" &&
      amountV?.numberValue
    ) {
      presetAmounts = values
        .slice(1)
        .flatMap((v) => (v?.numberValue ? [100 * v.numberValue] : []));
    } else if (nameV?.stringValue === "Campaign Copy" && amountV?.stringValue) {
      campaignCopy = amountV.stringValue;
    } else if (nameV?.stringValue === "Gala Date") {
      if (amountV?.stringValue) {
        galaDate = amountV.stringValue;
      } else if (amountV?.numberValue) {
        const d = new Date(1900, 0, 1);
        d.setDate(d.getDate() + amountV.numberValue - 2);
        galaDate = new Intl.DateTimeFormat("fr-CA", {
          dateStyle: "short",
        }).format(d);
      }
    } else if (
      nameV?.stringValue === "Gala Agenda Title" &&
      amountV?.stringValue
    ) {
      galaAgendaTitle = amountV.stringValue;
    } else if (
      nameV?.stringValue === "Gala Agenda URL" &&
      amountV?.stringValue
    ) {
      galaAgendaUrl = amountV.stringValue;
    }
  }
  return {
    pollTime,
    transactions,
    allGoalCents: allGoalCents.length > 0 ? allGoalCents : [goalCents],
    goalCents,
    goalName,
    ignoredTransactions,
    startTimestamp,
    endTimestamp,
    presetAmounts,
    campaignCopy,
    galaDate,
    galaAgenda:
      galaAgendaTitle && galaAgendaUrl
        ? { href: galaAgendaUrl, title: galaAgendaTitle }
        : null,
  };
}

const CACHE_ID = "google-sheet";

export async function upsertBalanceModifications(): Promise<void> {
  const supabase = getSupabaseClient();
  const data = await _getBalanceModifications();
  const res = await supabase
    .from("cache")
    .upsert({ id: CACHE_ID, data }, { count: "exact" });
  if (res.error) {
    throw res.error;
  }
}

export async function getBalanceModifications(): Promise<BalanceModifications> {
  const supabase = getSupabaseClient();
  const res = await supabase.from("cache").select("data").eq("id", CACHE_ID);
  if (res.error) {
    throw res.error;
  }
  if (res.data.length !== 1) {
    throw new Error("Expecitng 1 result in cache");
  }
  return res.data[0].data;
}

export default getBalanceModifications;
