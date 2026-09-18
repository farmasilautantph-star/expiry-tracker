// Converts an Excel serial date (or a d/m/yyyy-ish string) to an ISO 'YYYY-MM-DD' string.
export function excelSerialToISODate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const ms = Math.round((v - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().split("T")[0];
  }
  const str = String(v).trim();
  if (!str) return null;
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mo = String(m[1]).padStart(2, "0");
    const da = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mo}-${da}`;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}
