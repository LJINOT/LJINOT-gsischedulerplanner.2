import { formatInTimeZone } from "date-fns-tz";

const PH_TZ = "Asia/Manila";

export function formatPH(date: Date | string, fmt: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, PH_TZ, fmt);
}
