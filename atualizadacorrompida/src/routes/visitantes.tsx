import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Hand, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { CrudFormDialog, FieldDef } from "@/components/data/CrudFormDialog";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { useSupabaseTable, Row } from "@/hooks/use-supabase-table";
import { ExportMenu } from "@/components/data/ExportMenu";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/RoleGuard";

export const Route = createFileRoute("/visitantes")({
  component: VisitantesPage,
  head: () => ({ meta: [{ title: "Visitantes — ADNA" }] }),
});

const schema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  grupo: z.string().trim().max(60).optional().or(z.literal("")),
});

const fields: FieldDef[] = [
  { name: "nome", label: "Nome", placeholder: "Nome do visitante" },
  { name: "grupo", label: "Grupo", placeholder: "Ex.: Convidado, Família…" },
];

const cols: Column<Row>[] = [
  {
    key: "nome",
    header: "Nome",
    sortable: true,
    render: (r) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand-green)] to-[color:var(--brand-green-glow)] text-xs font-bold text-white">
          {String(r.nome ?? "?").slice(0, 1).toUpperCase()}
        </div>
        <span className="font-medium">{r.nome ?? "—"}</span>
      </div>
    ),
  },
  {
    key: "grupo",
    header: "Grupo",
    sortable: true,
    render: (r) => (
      <span className="rounded-full border border-[color:var(--brand-green)]/30 bg-[color:var(--brand-green)]/10 px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-green-glow)]">
        {r.grupo ?? "Sem grupo"}
      </span>
    ),
  },
  {
    key: "created_at",
    header: "Visitou em",
    sortable: true,
    render: (r) => formatDateBR(r.created_at),
  },
];

function VisitantesPage() {
  return (
    <RoleGuard roles={["lider", "admin"]}>
      <VisitantesInner />
    </RoleGuard>
  );
}

function VisitantesInner() {
  const { rows, loading, insert, update, remove } = useSupabaseTable("visitantes");
  const { isAdmin, isLider } = useAuth();
  const canCreate = isLider;
  const canDelete = isAdmin;
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !canCreate) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setEditing(null);
      setFormOpen(true);
      params.delete("new");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, [canCreate]);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <PageHeader
        title="Visitantes"
        subtitle={`${rows.length} visitantes registrados`}
        accent="green"
        icon={<Hand className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && (
              <ExportMenu
                rows={rows.map((r) => ({ Nome: r.nome, Grupo: r.grupo, Visitou: formatDateTimeBR(r.created_at) }))}
                filename="visitantes"
                title="Lista de Visitantes"
              />
            )}
            {canCreate && (
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--brand-green)] to-[color:var(--brand-green-glow)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-glow-green)] hover:opacity-90 transition"
              >
                <Plus className="h-4 w-4" /> Novo visitante
              </button>
            )}
          </div>
        }
      />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
        <DataTable
          rows={rows}
          columns={cols}
          loading={loading}
          searchKeys={["nome", "grupo"]}
          filterKey="grupo"
          onEdit={(r) => {
            setEditing(r);
            setFormOpen(true);
          }}
          onDelete={(r) => {
            setDeleting(r);
            setConfirmOpen(true);
          }}
          canEdit={canCreate}
          canDelete={canDelete}
        />
      </motion.div>

      <CrudFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Editar visitante" : "Novo visitante"}
        description={editing ? "Atualize os dados do visitante." : "Registre um novo visitante."}
        fields={fields}
        schema={schema}
        initialValues={editing ?? undefined}
        accentClass="bg-gradient-to-r from-[color:var(--brand-green)] to-[color:var(--brand-green-glow)]"
        onSubmit={async (values) => {
          const payload = { nome: values.nome, grupo: values.grupo || null };
          if (editing) await update(editing.id, payload);
          else await insert(payload);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir visitante?"
        description={`Tem certeza que deseja excluir "${deleting?.nome ?? ""}"? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (deleting) await remove(deleting.id);
        }}
      />
    </div>
  );
}
