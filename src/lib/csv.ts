export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
  // Neutralize spreadsheet formulas, including formula prefixes after whitespace.
  if (typeof value === "string" && (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text))) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function toCsv(headers: string[], rows: unknown[][]) {
  return "\uFEFF" + [headers, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}
