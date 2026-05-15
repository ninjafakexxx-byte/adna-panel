import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// Datas — sempre pt-BR (DD/MM/YYYY), independente do locale do
// navegador / runtime. Não usamos Intl/toLocaleDateString para
// evitar variações entre Chrome, Firefox, Edge, VS Code preview etc.
// Backend continua recebendo/devolvendo ISO (timestamptz).
// ============================================================

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

const pad = (n: number) => n.toString().padStart(2, "0");

/** Formata `DD/MM/YYYY` (pt-BR), sem dependência de Intl. */
export function formatDateBR(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Formata `DD/MM/YYYY HH:mm` (pt-BR), sem dependência de Intl. */
export function formatDateTimeBR(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDateBR(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Versão com " às " entre data e hora — usada em listagens/feed. */
export function formatDateTimeBRLong(value: string | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${formatDateBR(d)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converte `DD/MM/YYYY` em `YYYY-MM-DD` (usado por inputs/Supabase). */
export function brDateToISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/** Converte `YYYY-MM-DD` em `DD/MM/YYYY`. */
export function isoDateToBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

/** `DD/MM/YYYY HH:mm` -> `YYYY-MM-DDTHH:mm`. */
export function brDateTimeToISO(br: string): string | null {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi] = m;
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/** `YYYY-MM-DDTHH:mm[:ss...]` -> `DD/MM/YYYY HH:mm`. */
export function isoDateTimeToBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return "";
  const [, yyyy, mm, dd, hh, mi] = m;
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
