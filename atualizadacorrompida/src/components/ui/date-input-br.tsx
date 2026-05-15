import * as React from "react";
import { cn } from "@/lib/utils";
import {
  brDateToISO,
  brDateTimeToISO,
  isoDateToBR,
  isoDateTimeToBR,
} from "@/lib/utils";

/**
 * Inputs de data com formatação pt-BR estável em todos os navegadores.
 *
 * - UI sempre `DD/MM/YYYY` (ou `DD/MM/YYYY HH:mm`).
 * - `value` / `onChange` continuam usando o formato ISO consumido pelo
 *   restante do app (`yyyy-MM-dd` ou `yyyy-MM-ddTHH:mm`), de modo que o
 *   payload enviado ao Supabase não muda.
 * - Não dependemos de `<input type="date">` para evitar variações de
 *   locale (Chrome em en-US mostra mm/dd/yyyy, etc).
 */

const baseClasses =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const p1 = digits.slice(0, 2);
  const p2 = digits.slice(2, 4);
  const p3 = digits.slice(4, 8);
  let out = p1;
  if (digits.length >= 3) out += "/" + p2;
  if (digits.length >= 5) out += "/" + p3;
  return out;
}

function maskDateTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 12);
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const hh = digits.slice(8, 10);
  const mi = digits.slice(10, 12);
  let out = dd;
  if (digits.length >= 3) out += "/" + mm;
  if (digits.length >= 5) out += "/" + yyyy;
  if (digits.length >= 9) out += " " + hh;
  if (digits.length >= 11) out += ":" + mi;
  return out;
}

export interface DateInputBRProps {
  /** Valor em ISO `YYYY-MM-DD`. */
  value?: string;
  /** Recebe ISO `YYYY-MM-DD` ou string vazia quando incompleto. */
  onChange?: (iso: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function DateInputBR({
  value,
  onChange,
  className,
  placeholder = "dd/mm/aaaa",
  disabled,
  id,
}: DateInputBRProps) {
  const [text, setText] = React.useState<string>(() =>
    value ? isoDateToBR(value) : "",
  );

  React.useEffect(() => {
    const next = value ? isoDateToBR(value) : "";
    if (next !== text) setText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      lang="pt-BR"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      className={cn(baseClasses, className)}
      value={text}
      onChange={(e) => {
        const masked = maskDate(e.target.value);
        setText(masked);
        const iso = brDateToISO(masked);
        onChange?.(iso ?? "");
      }}
    />
  );
}

export interface DateTimeInputBRProps {
  /** Valor em ISO `YYYY-MM-DDTHH:mm` (ou ISO completo, primeiros 16 chars). */
  value?: string;
  /** Recebe ISO `YYYY-MM-DDTHH:mm` ou string vazia. */
  onChange?: (iso: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

export function DateTimeInputBR({
  value,
  onChange,
  className,
  placeholder = "dd/mm/aaaa hh:mm",
  disabled,
  id,
}: DateTimeInputBRProps) {
  const [text, setText] = React.useState<string>(() =>
    value ? isoDateTimeToBR(value) : "",
  );

  React.useEffect(() => {
    const next = value ? isoDateTimeToBR(value) : "";
    if (next !== text) setText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      lang="pt-BR"
      autoComplete="off"
      placeholder={placeholder}
      disabled={disabled}
      className={cn(baseClasses, className)}
      value={text}
      onChange={(e) => {
        const masked = maskDateTime(e.target.value);
        setText(masked);
        const iso = brDateTimeToISO(masked);
        onChange?.(iso ?? "");
      }}
    />
  );
}