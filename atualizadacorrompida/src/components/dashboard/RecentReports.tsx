import { Layers, Shield, BookOpen, Heart } from "lucide-react";
import { formatBRL } from "@/hooks/use-dashboard-data";

const variants = ["blue", "green", "amber", "red"] as const;
type Variant = (typeof variants)[number];

const icons = [Layers, Shield, BookOpen, Heart];

const accents: Record<Variant, { gradient: string; icon: string; iconBg: string }> = {
  blue: { gradient: "var(--gradient-blue)", icon: "text-[color:var(--brand-blue-glow)]", iconBg: "bg-[color:var(--brand-blue)]/15" },
  green: { gradient: "var(--gradient-green)", icon: "text-[color:var(--brand-green-glow)]", iconBg: "bg-[color:var(--brand-green)]/15" },
  amber: { gradient: "var(--gradient-amber)", icon: "text-[color:var(--brand-amber-glow)]", iconBg: "bg-[color:var(--brand-amber)]/15" },
  red: { gradient: "var(--gradient-red)", icon: "text-[color:var(--brand-red-glow)]", iconBg: "bg-[color:var(--brand-red)]/15" },
};

interface Props {
  reports: { grupo: string; valor: number; membros: number; visitantes: number }[];
  onSelect?: (grupo: string) => void;
  activeGrupo?: string;
}

export function RecentReports({ reports, onSelect, activeGrupo }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
      <h3 className="text-base sm:text-lg font-semibold text-foreground">Últimos Relatórios</h3>
      {reports.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhuma oferta registrada ainda.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reports.map((r, i) => {
            const variant = variants[i % variants.length];
            const a = accents[variant];
            const Icon = icons[i % icons.length];
            const isActive = activeGrupo === r.grupo;
            const clickable = !!onSelect;
            return (
              <button
                type="button"
                key={r.grupo}
                onClick={clickable ? () => onSelect!(r.grupo) : undefined}
                disabled={!clickable}
                aria-pressed={isActive}
                className={[
                  "group overflow-hidden rounded-xl border text-left transition-all",
                  "bg-background/40",
                  isActive
                    ? "border-[color:var(--brand-blue)] shadow-[var(--shadow-glow-blue)] -translate-y-0.5"
                    : "border-border",
                  clickable
                    ? "cursor-pointer hover:-translate-y-0.5 hover:border-[color:var(--brand-blue)]/60 hover:shadow-[var(--shadow-card)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
                    : "cursor-default",
                ].join(" ")}
              >
                <div
                  className="flex items-center gap-2 px-4 py-3 text-white"
                  style={{ backgroundImage: a.gradient }}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                    <span className="text-xs font-bold">●</span>
                  </div>
                  <span className="font-semibold truncate">{r.grupo}</span>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.iconBg}`}>
                      <Icon className={`h-4 w-4 ${a.icon}`} />
                    </div>
                    <span className="text-xl font-bold text-foreground">{formatBRL(r.valor)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{r.membros} Membros</span>
                    <span>{r.visitantes} Visitantes</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
