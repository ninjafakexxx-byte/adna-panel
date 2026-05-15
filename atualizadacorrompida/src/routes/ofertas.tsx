import { formatDateBR, formatDateTimeBR } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Wallet, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { CrudFormDialog, FieldDef } from "@/components/data/CrudFormDialog";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { useSupabaseTable, Row } from "@/hooks/use-supabase-table";
import { formatBRL } from "@/hooks/use-dashboard-data";
import { ExportMenu } from "@/components/data/ExportMenu";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/RoleGuard";

export const Route = createFileRoute("/ofertas")({
  component: OfertasPage,
  head: () => ({ meta: [{ title: "Ofertas — ADNA" }] }),
});

const schema = z.object({
  grupo: z.string().trim().min(1, "Informe o grupo").max(60),
  valor: z.coerce.number({ message: "Valor inválido" }).min(0, "Valor deve ser maior ou igual a 0"),
  imagens: z.array(z.string()).optional().default([]),
});

const fields: FieldDef[] = [
  { name: "grupo", label: "Grupo", placeholder: "Ex.: Domingo manhã" },
  { name: "valor", label: "Valor (R$)", type: "number", placeholder: "0,00" },
  { name: "imagens", label: "Imagens (galeria)", type: "images", imageFolder: "ofertas", imageMax: 8 },
];

const cols: Column<Row>[] = [
  {
    key: "grupo",
    header: "Grupo",
    sortable: true,
    render: (r) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[color:var(--brand-amber)] to-[color:var(--brand-amber-glow)] text-white">
          <Wallet className="h-4 w-4" />
        </div>
        <span className="font-medium">{r.grupo ?? "Sem grupo"}</span>
      </div>
    ),
  },
  {
    key: "imagens",
    header: "Galeria",
    render: (r: any) => {
      const imgs: string[] = Array.isArray(r.imagens) ? r.imagens : [];
      if (imgs.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <div className="flex -space-x-2">
          {imgs.slice(0, 3).map((u, i) => (
            <img key={i} src={u} alt="" className="h-8 w-8 rounded-lg border-2 border-card object-cover" />
          ))}
          {imgs.length > 3 && (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-card bg-muted text-[10px] font-bold">
              +{imgs.length - 3}
            </span>
          )}
        </div>
      );
    },
  },
  {
    key: "valor",
    header: "Valor",
    sortable: true,
    className: "text-right",
    render: (r) => (
      <span className="font-bold text-[color:var(--brand-amber-glow)]">
        {formatBRL(Number(r.valor) || 0)}
      </span>
    ),
  },
  {
    key: "created_at",
    header: "Data",
    sortable: true,
    render: (r) => formatDateBR(r.created_at),
  },
];

function OfertasPage() {
  return (
    <RoleGuard roles={["lider", "admin"]}>
      <OfertasInner />
    </RoleGuard>
  );
}

function OfertasInner() {
  const { rows, loading, insert, update, remove } = useSupabaseTable("ofertas");
  const { isAdmin, isLider } = useAuth();
  const canCreate = isLider;
  const canDelete = isAdmin;
  const total = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
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
        title="Ofertas"
        subtitle={`${rows.length} registros · Total ${formatBRL(total)}`}
        accent="amber"
        icon={<Wallet className="h-6 w-6" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canCreate && (
              <ExportMenu
                rows={rows.map((r) => ({ Grupo: r.grupo, Valor: r.valor, Data: formatDateTimeBR(r.created_at) }))}
                filename="ofertas"
                title="Relatório de Ofertas"
              />
            )}
            {canCreate && (
              <button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--brand-amber)] to-[color:var(--brand-amber-glow)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-glow-amber)] hover:opacity-90 transition"
              >
                <Plus className="h-4 w-4" /> Nova oferta
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
          searchKeys={["grupo"]}
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
        title={editing ? "Editar oferta" : "Nova oferta"}
        description={editing ? "Atualize os dados da oferta." : "Registre uma nova oferta."}
        fields={fields}
        schema={schema}
        initialValues={
          editing
            ? { grupo: editing.grupo ?? "", valor: editing.valor ?? 0, imagens: Array.isArray((editing as any).imagens) ? (editing as any).imagens : [] }
            : undefined
        }
        accentClass="bg-gradient-to-r from-[color:var(--brand-amber)] to-[color:var(--brand-amber-glow)]"
        onSubmit={async (values: any) => {
          const payload: any = { grupo: values.grupo, valor: Number(values.valor), imagens: values.imagens ?? [] };
          if (editing) await update(editing.id, payload);
          else await insert(payload);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir oferta?"
        description={`Tem certeza que deseja excluir esta oferta de ${formatBRL(Number(deleting?.valor) || 0)}? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (deleting) await remove(deleting.id);
        }}
      />
    </div>
  );
}
