import { FileText, PieChart as PieIcon, ChevronDown, Menu } from "lucide-react";
import { useState } from "react";

export function Topbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-red)] text-white font-bold">
            A
          </div>
          <h1 className="truncate text-base sm:text-lg font-bold tracking-wide text-foreground">
            GRUPOFAMILIAR <span className="text-[color:var(--brand-blue-glow)]">ADNA</span>
          </h1>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition">
            <FileText className="h-4 w-4 text-[color:var(--brand-blue-glow)]" />
            RELATÓRIOS
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition">
            <PieIcon className="h-4 w-4 text-[color:var(--brand-green-glow)]" />
            TOTAL GERAL
          </button>
          <div className="ml-2 flex items-center gap-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-sm font-bold text-white">
              W
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </nav>

        <button
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-2">
          <button className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">
            <FileText className="h-4 w-4 text-[color:var(--brand-blue-glow)]" /> RELATÓRIOS
          </button>
          <button className="flex w-full items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground">
            <PieIcon className="h-4 w-4 text-[color:var(--brand-green-glow)]" /> TOTAL GERAL
          </button>
        </div>
      )}
    </header>
  );
}
