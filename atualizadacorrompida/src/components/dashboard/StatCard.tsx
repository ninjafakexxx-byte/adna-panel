import { ReactNode } from "react";
import { CountUp } from "@/components/ui/count-up";

type Variant = "blue" | "green" | "amber" | "red";

const gradients: Record<Variant, string> = {
  blue: "var(--gradient-blue)",
  green: "var(--gradient-green)",
  amber: "var(--gradient-amber)",
  red: "var(--gradient-red)",
};

const glows: Record<Variant, string> = {
  blue: "var(--shadow-glow-blue)",
  green: "var(--shadow-glow-green)",
  amber: "var(--shadow-glow-amber)",
  red: "var(--shadow-glow-red)",
};

interface StatCardProps {
  title: string;
  /** Aceita string (formatado) ou number (anima com CountUp). */
  value: string | number;
  /** Formatador opcional usado quando `value` é number. */
  format?: (n: number) => string;
  delta?: string;
  icon: ReactNode;
  variant: Variant;
}

export function StatCard({ title, value, delta, icon, variant, format }: StatCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl p-5 sm:p-6 text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]"
      style={{
        backgroundImage: gradients[variant],
        boxShadow: glows[variant],
      }}
    >
      <div className="absolute -bottom-10 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-opacity duration-300 group-hover:bg-white/20" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur transition-transform duration-300 group-hover:scale-105">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm/5 font-medium text-white/85">{title}</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              {typeof value === "number" ? <CountUp value={value} format={format} /> : value}
            </span>
            {delta && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium text-white/95">
                {delta}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
