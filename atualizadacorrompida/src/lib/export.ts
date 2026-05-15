import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateTimeBR } from "@/lib/utils";

export function exportCSV<T extends Record<string, any>>(rows: T[], filename: string) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF<T extends Record<string, any>>(
  rows: T[],
  filename: string,
  title: string,
  columns?: { header: string; key: keyof T }[],
) {
  const doc = new jsPDF();
  const cols =
    columns ??
    (rows[0] ? (Object.keys(rows[0]) as (keyof T)[]).map((k) => ({ header: String(k), key: k })) : []);
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(formatDateTimeBR(new Date()), 14, 21);
  autoTable(doc, {
    startY: 26,
    head: [cols.map((c) => c.header)],
    body: rows.map((r) => cols.map((c) => formatCell(r[c.key]))),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(`${filename}.pdf`);
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (v instanceof Date) return formatDateTimeBR(v);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return formatDateTimeBR(v);
    return v;
  }
  return JSON.stringify(v);
}
