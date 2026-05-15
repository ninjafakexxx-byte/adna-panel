import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const label =
    value.from && value.to
      ? `${format(value.from, "dd/MM/yy", { locale: ptBR })} → ${format(value.to, "dd/MM/yy", { locale: ptBR })}`
      : value.from
      ? `Desde ${format(value.from, "dd/MM/yy", { locale: ptBR })}`
      : "Filtrar por período";

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm hover:bg-accent transition">
            <CalendarIcon className="h-4 w-4" /> {label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={value as any}
            onSelect={(r: any) => onChange(r ?? {})}
            numberOfMonths={1}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      {(value.from || value.to) && (
        <button
          onClick={() => onChange({})}
          aria-label="Limpar"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
