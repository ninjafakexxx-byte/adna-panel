import { createFileRoute } from "@tanstack/react-router";

import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

import { useMemo, useState } from "react";

import { motion } from "framer-motion";

import { PageHeader } from "@/components/layout/PageHeader";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { StatCard } from "@/components/dashboard/StatCard";

import { ConfirmDialog } from "@/components/data/ConfirmDialog";

import { RoleGuard } from "@/components/auth/RoleGuard";

import {
  useVisitors,
  useVisitorsKpis,
  type Visitor,
} from "@/hooks/use-visitors";

import { VisitorFormDialog } from "@/components/visitors/VisitorFormDialog";

import { useAuth } from "@/hooks/use-auth";

export const Route =
  createFileRoute("/visitantes")({
    component: VisitantesPage,
  });

function VisitantesPage() {
  return (
    <RoleGuard
      roles={["lider", "admin"]}
    >
      <VisitantesInner />
    </RoleGuard>
  );
}

function VisitantesInner() {
  const {
    rows,
    loading,
    insert,
    update,
    remove,
    toggleActive,
  } = useVisitors();

  const kpis =
    useVisitorsKpis(rows);

  const { isAdmin, isLider } =
    useAuth();

  const canEdit = isLider;
  const canDelete = isAdmin;

  const [query, setQuery] =
    useState("");

  const [formOpen, setFormOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<Visitor | null>(null);

  const [
    confirmOpen,
    setConfirmOpen,
  ] = useState(false);

  const [deleting, setDeleting] =
    useState<Visitor | null>(null);

  const filtered = useMemo(() => {
    const q =
      query.trim().toLowerCase();

    if (!q) return rows;

    return rows.filter((v) => {
      const hay = [
        v.full_name,
        v.email,
        v.phone,
        v.city,
        v.invited_by,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [rows, query]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (
    v: Visitor,
  ) => {
    setEditing(v);
    setFormOpen(true);
  };

  const askDelete = (
    v: Visitor,
  ) => {
    setDeleting(v);
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={
          <Users className="h-5 w-5 text-white" />
        }
        title="Visitantes"
        subtitle="Controle e acompanhamento dos visitantes"
        actions={
          <Button
            onClick={openNew}
            className="bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Novo visitante
          </Button>
        }
      />

      {/* KPIs */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total"
          value={kpis.total}
          variant="blue"
          icon={
            <Users className="h-6 w-6 text-white" />
          }
        />

        <StatCard
          title="Ativos"
          value={kpis.ativos}
          variant="green"
          icon={
            <UserCheck className="h-6 w-6 text-white" />
          }
        />

        <StatCard
          title="Convertidos"
          value={kpis.convertidos}
          variant="amber"
          icon={
            <UserPlus className="h-6 w-6 text-white" />
          }
        />

        <StatCard
          title="Novos (30d)"
          value={kpis.novos30}
          variant="red"
          icon={
            <Users className="h-6 w-6 text-white" />
          }
        />
      </section>

      {/* Busca */}

      <div className="rounded-2xl border border-border bg-card/60 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value,
              )
            }
            placeholder="Buscar visitante..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}

      <div className="overflow-hidden rounded-2xl border border-border bg-card/60">
        <table className="w-full text-sm">
          <thead className="bg-background/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">
                Nome
              </th>

              <th className="px-4 py-3 text-left">
                Contato
              </th>

              <th className="px-4 py-3 text-left">
                Cidade
              </th>

              <th className="px-4 py-3 text-left">
                Status
              </th>

              <th className="px-4 py-3 text-right">
                Ações
              </th>
            </tr>
          </thead>

          <tbody>
            {!loading &&
              filtered.map((v) => (
                <motion.tr
                  key={v.id}
                  initial={{
                    opacity: 0,
                    y: 4,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  className="border-t border-border/50"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {v.full_name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {
                          v.invited_by
                        }
                      </p>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-xs">
                    <p>{v.email}</p>
                    <p>{v.phone}</p>
                  </td>

                  <td className="px-4 py-3">
                    {v.city}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleActive(v)
                      }
                      disabled={
                        !canEdit
                      }
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${
                        v.is_active
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {v.is_active ? (
                        <UserCheck className="h-3 w-3" />
                      ) : (
                        <UserX className="h-3 w-3" />
                      )}

                      {v.is_active
                        ? "Ativo"
                        : "Inativo"}
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() =>
                          openEdit(v)
                        }
                        className="rounded-md p-1.5 hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {canDelete && (
                        <button
                          onClick={() =>
                            askDelete(v)
                          }
                          className="rounded-md p-1.5 hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
          </tbody>
        </table>
      </div>

      <VisitorFormDialog
        open={formOpen}
        onOpenChange={
          setFormOpen
        }
        initial={editing}
        onSubmit={async (
          values,
        ) => {
          if (editing) {
            await update(
              editing.id,
              values,
            );
          } else {
            await insert(values);
          }
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={
          setConfirmOpen
        }
        title="Excluir visitante?"
        description={
          deleting
            ? `O visitante "${deleting.full_name}" será removido.`
            : ""
        }
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (deleting) {
            await remove(
              deleting.id,
            );
          }

          setDeleting(null);
        }}
      />
    </div>
  );
}