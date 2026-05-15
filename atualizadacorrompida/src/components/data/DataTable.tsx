import { useMemo, useState, ReactNode, useEffect } from "react";
import { Search, ArrowUpDown, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

interface Props<T extends Record<string, any>> {
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchKeys: (keyof T)[];
  filterKey?: keyof T;
  emptyMessage?: string;
  pageSize?: number;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  toolbarRight?: ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  rows,
  columns,
  loading,
  searchKeys,
  filterKey,
  emptyMessage = "Nenhum registro encontrado",
  pageSize = 10,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
  toolbarRight,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("__all__");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [query, filter]);

  const filterOptions = useMemo(() => {
    if (!filterKey) return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      const v = r[filterKey];
      if (v != null && v !== "") set.add(String(v));
    });
    return Array.from(set).sort();
  }, [rows, filterKey]);

  const filtered = useMemo(() => {
    let out = rows;
    if (filterKey && filter !== "__all__") {
      out = out.filter((r) => String(r[filterKey] ?? "") === filter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((r) =>
        searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)),
      );
    }
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "number" && typeof bv === "number") {
          return sort.dir === "asc" ? av - bv : bv - av;
        }
        return sort.dir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return out;
  }, [rows, query, filter, filterKey, searchKeys, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const toggleSort = (key: string) => {
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  const showActions = !!((onEdit && canEdit) || (onDelete && canDelete));
  const colCount = columns.length + (showActions ? 1 : 0);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em tempo real…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>
        {filterKey && filterOptions.length > 0 && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="__all__">Todos os grupos</option>
            {filterOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-muted-foreground sm:ml-2">
          {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
        </span>
        {toolbarRight}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background/30">
              {columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground ${c.className ?? ""}`}
                >
                  {c.sortable ? (
                    <button
                      onClick={() => toggleSort(String(c.key))}
                      className="flex items-center gap-1 hover:text-foreground transition"
                    >
                      {c.header}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              ))}
              {showActions && (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 animate-ping rounded-full bg-primary" />
                    Carregando…
                  </span>
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {paged.map((row, i) => (
                  <motion.tr
                    key={row.id ?? i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.2) }}
                    className="border-b border-border/60 transition hover:bg-accent/30"
                  >
                    {columns.map((c) => (
                      <td key={String(c.key)} className={`px-4 py-3 text-foreground ${c.className ?? ""}`}>
                        {c.render ? c.render(row) : String(row[c.key as keyof T] ?? "—")}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {onEdit && canEdit && (
                            <button
                              onClick={() => onEdit(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition hover:border-[color:var(--brand-blue)]/50 hover:text-[color:var(--brand-blue-glow)]"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onDelete && canDelete && (
                            <button
                              onClick={() => onDelete(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/40 transition hover:bg-accent/30 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background/40 transition hover:bg-accent/30 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
