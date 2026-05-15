import { createFileRoute } from "@tanstack/react-router";

import {
  ShieldCheck,
  Search,
  Trash2,
  Pencil,
  Plus,
  LogIn,
} from "lucide-react";

import { useMemo, useState } from "react";

import { motion } from "framer-motion";

import { PageHeader } from "@/components/layout/PageHeader";

import { Input } from "@/components/ui/input";

import { RoleGuard } from "@/components/auth/RoleGuard";

import { useAudit } from "@/hooks/use-audit";

export const Route =
  createFileRoute("/auditoria")({
    component: AuditoriaPage,
  });

function AuditoriaPage() {
  return (
    <RoleGuard roles={["admin"]}>
      <AuditoriaInner />
    </RoleGuard>
  );
}

function AuditoriaInner() {
  const {
    rows,
    loading,
  } = useAudit();

  const [query, setQuery] =
    useState("");

  const filtered = useMemo(() => {
    const q =
      query.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((r) => {
      const hay = [
        r.action,
        r.entity,
        r.user_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query]);

  const badge = (action: string) => {
    if (
      action.includes("create")
    ) {
      return {
        cls:
          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20",
        icon: (
          <Plus className="h-3 w-3" />
        ),
      };
    }

    if (
      action.includes("update")
    ) {
      return {
        cls:
          "bg-blue-500/10 text-blue-300 border border-blue-500/20",
        icon: (
          <Pencil className="h-3 w-3" />
        ),
      };
    }

    if (
      action.includes("delete")
    ) {
      return {
        cls:
          "bg-red-500/10 text-red-300 border border-red-500/20",
        icon: (
          <Trash2 className="h-3 w-3" />
        ),
      };
    }

    if (
      action.includes("login")
    ) {
      return {
        cls:
          "bg-purple-500/10 text-purple-300 border border-purple-500/20",
        icon: (
          <LogIn className="h-3 w-3" />
        ),
      };
    }

    return {
      cls:
        "bg-zinc-500/10 text-zinc-300 border border-zinc-500/20",
      icon: null,
    };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={
          <ShieldCheck className="h-5 w-5 text-white" />
        }
        title="Auditoria"
        subtitle="Logs e rastreamento das atividades do sistema"
      />

      {/* Busca */}

      <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-[var(--shadow-card)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value,
              )
            }
            placeholder="Buscar logs..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}

      <div className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">
                Ação
              </th>

              <th className="px-4 py-3 text-left">
                Entidade
              </th>

              <th className="px-4 py-3 text-left">
                Usuário
              </th>

              <th className="px-4 py-3 text-left">
                Data
              </th>

              <th className="px-4 py-3 text-left">
                Detalhes
              </th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              filtered.map((log) => {
                const b = badge(
                  log.action,
                );

                return (
                  <motion.tr
                    key={log.id}
                    initial={{
                      opacity: 0,
                      y: 4,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="border-t border-border/50 hover:bg-accent/20"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${b.cls}`}
                      >
                        {b.icon}

                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {log.entity ??
                        "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.user_id
                        ?.slice(0, 8) ??
                        "—"}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(
                        log.created_at,
                      ).toLocaleString(
                        "pt-BR",
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <pre className="max-w-[320px] overflow-auto rounded-lg bg-background/40 p-2 text-[11px] text-muted-foreground">
                        {JSON.stringify(
                          log.details,
                          null,
                          2,
                        )}
                      </pre>
                    </td>
                  </motion.tr>
                );
              })}
          </tbody>
        </table>

        {!loading &&
          filtered.length ===
            0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />

              <p className="text-sm font-medium text-foreground">
                Nenhum log encontrado
              </p>

              <p className="text-xs text-muted-foreground">
                Os registros de auditoria aparecerão aqui.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}