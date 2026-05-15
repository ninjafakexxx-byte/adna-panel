import { createFileRoute } from "@tanstack/react-router";
import {
  Users, UserPlus, Search, Filter, Pencil, Trash2,
  ChevronLeft, ChevronRight, Cake, UserCheck, UserX, TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { useAuth } from "@/hooks/use-auth";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { useDebounce } from "@/hooks/use-debounce";
import { useMembers, useMembersKpis, type Member } from "@/hooks/use-members";
import { MemberFormDialog } from "@/components/members/MemberFormDialog";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatDateBR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/membros")({
  component: MembrosPage,
  head: () => ({ meta: [{ title: "Membros — ADNA" }] }),
});

function MembrosPage() {
  return (
    <RoleGuard roles={["lider", "admin"]}>
      <MembrosInner />
    </RoleGuard>
  );
}

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };
const PAGE_SIZE = 10;

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function MembrosInner() {
  const { rows, loading, insert, update, remove, toggleActive } = useMembers();
  const { isAdmin, isLider } = useAuth();
  const canCreate = isLider;
  const canEdit = isLider;
  const canDelete = isAdmin;

  const kpis = useMembersKpis(rows);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [ministry, setMinistry] = useState<string>("__all__");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(query, 250);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Member | null>(null);

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

  const ministries = useMemo(
    () => Array.from(new Set(rows.map((r) => r.ministry).filter((m): m is string => !!m))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    return rows.filter((m) => {
      if (status === "active" && !m.is_active) return false;
      if (status === "inactive" && m.is_active) return false;
      if (ministry !== "__all__" && (m.ministry ?? "") !== ministry) return false;
      if (!q) return true;
      const hay = [m.full_name, m.email, m.phone, m.role, m.ministry, m.congregation, m.city]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, debounced, status, ministry]);

  useEffect(() => setPage(1), [debounced, status, ministry]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (m: Member) => { setEditing(m); setFormOpen(true); };
  const askDelete = (m: Member) => { setDeleting(m); setConfirmOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Users className="h-5 w-5 text-white" />}
        title="Membros"
        subtitle="Cadastro completo dos membros do Grupo Familiar"
        actions={
          canCreate ? (
            <Button
              onClick={openNew}
              className="bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-white shadow-[var(--shadow-glow-blue)]"
            >
              <UserPlus className="mr-2 h-4 w-4" /> Novo membro
            </Button>
          ) : null
        }
      />

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
          <StatCard title="Total de membros" value={kpis.total} variant="blue" icon={<Users className="h-6 w-6 text-white" />} />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
          <StatCard title="Ativos" value={kpis.ativos} variant="green" icon={<UserCheck className="h-6 w-6 text-white" />} delta={`${kpis.inativos} inativos`} />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }}>
          <StatCard
            title="Novos (30d)"
            value={kpis.novos30}
            variant="amber"
            icon={<TrendingUp className="h-6 w-6 text-white" />}
            delta={`${kpis.crescimentoMensal >= 0 ? "+" : ""}${kpis.crescimentoMensal}% mês`}
          />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }}>
          <StatCard title="Aniversários (30d)" value={kpis.aniversariantes.length} variant="red" icon={<Cake className="h-6 w-6 text-white" />} />
        </motion.div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 shadow-[var(--shadow-card)] backdrop-blur sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail, telefone, ministério…"
            className="pl-9 bg-background/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-md border border-border bg-background/50 p-1 text-xs">
            {(["all", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  status === s
                    ? "bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "Todos" : s === "active" ? "Ativos" : "Inativos"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-background/50 px-2 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={ministry}
              onChange={(e) => setMinistry(e.target.value)}
              className="bg-transparent text-foreground outline-none"
            >
              <option value="__all__">Todos os ministérios</option>
              {ministries.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-background/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Membro</th>
                <th className="px-4 py-3 text-left">Contato</th>
                <th className="px-4 py-3 text-left">Ministério</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Cadastro</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-4 w-40" /></div></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-16" /></td>
                  </tr>
                ))
              )}

              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand-blue)]/20 to-[color:var(--brand-blue-glow)]/20">
                        <Users className="h-6 w-6 text-[color:var(--brand-blue-glow)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Nenhum membro encontrado</p>
                        <p className="mt-1 text-xs">
                          {rows.length === 0
                            ? "Comece cadastrando o primeiro membro do grupo."
                            : "Ajuste os filtros ou a busca para ver mais resultados."}
                        </p>
                      </div>
                      {canCreate && rows.length === 0 && (
                        <Button size="sm" onClick={openNew} className="bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-white">
                          <UserPlus className="mr-2 h-4 w-4" /> Cadastrar membro
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              <AnimatePresence initial={false}>
                {!loading && pageRows.map((m) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="border-t border-border/50 hover:bg-accent/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt={m.full_name ?? ""} className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-xs font-bold text-white">
                            {initials(m.full_name)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{m.full_name ?? "—"}</p>
                          {m.role && <p className="truncate text-xs text-muted-foreground">{m.role}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        {m.email && <p className="truncate text-foreground/90">{m.email}</p>}
                        {m.phone && <p className="text-muted-foreground">{m.phone}</p>}
                        {!m.email && !m.phone && <span className="text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {m.ministry ? (
                        <span className="rounded-full border border-[color:var(--brand-blue)]/30 bg-[color:var(--brand-blue)]/10 px-2.5 py-0.5 text-xs font-medium text-[color:var(--brand-blue-glow)]">
                          {m.ministry}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => canEdit && toggleActive(m)}
                        disabled={!canEdit}
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                          m.is_active
                            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                            : "border border-zinc-500/30 bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20"
                        } ${!canEdit ? "cursor-default opacity-80" : "cursor-pointer"}`}
                        title={canEdit ? "Alternar ativo/inativo" : ""}
                      >
                        {m.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                        {m.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateBR(m.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button
                            onClick={() => openEdit(m)}
                            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => askDelete(m)}
                            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">
            <span>
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md p-1.5 transition hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-medium text-foreground">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md p-1.5 transition hover:bg-accent disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Aniversariantes */}
      {kpis.aniversariantes.length > 0 && (
        <section className="rounded-2xl border border-border bg-card/60 p-5 shadow-[var(--shadow-card)] backdrop-blur">
          <div className="mb-3 flex items-center gap-2">
            <Cake className="h-4 w-4 text-[color:var(--brand-red-glow)]" />
            <h2 className="text-sm font-semibold text-foreground">Aniversariantes próximos</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.aniversariantes.slice(0, 9).map(({ member, next }) => (
              <div key={member.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-center gap-3">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[color:var(--brand-red)] to-[color:var(--brand-red-glow)] text-xs font-bold text-white">
                      {initials(member.full_name)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDateBR(member.birth_date!)}</p>
                  </div>
                </div>
                <span className="rounded-full border border-[color:var(--brand-red)]/30 bg-[color:var(--brand-red)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[color:var(--brand-red-glow)]">
                  {next.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <MemberFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={async (values) => {
          if (editing) await update(editing.id, values);
          else await insert(values);
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir membro?"
        description={deleting ? `O membro "${deleting.full_name}" será removido permanentemente.` : ""}
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (deleting) await remove(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
