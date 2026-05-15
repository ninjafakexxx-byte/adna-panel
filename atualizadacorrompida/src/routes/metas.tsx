import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, Trash2, Pencil, CheckCircle2, Clock, Flag,
  Trophy, Filter, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { DateTimeInputBR } from "@/components/ui/date-input-br";
import { formatDateTimeBR } from "@/lib/utils";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { RoleGuard } from "@/components/auth/RoleGuard";

export const Route = createFileRoute("/metas")({
  component: MetasPageGuarded,
  head: () => ({ meta: [{ title: "Metas — ADNA" }] }),
});

export function MetasModule() {
  return <MetasPage />;
}

function MetasPageGuarded() {
  return (
    <RoleGuard roles={["membro", "lider", "admin"]}>
      <MetasPage />
    </RoleGuard>
  );
}

type GoalStatus = "pending" | "in_progress" | "completed" | "cancelled";
type GoalPriority = "low" | "medium" | "high";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: GoalPriority;
  status: GoalStatus;
  progress: number;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const GOALS_TABLE = "goals";
const GOAL_COLUMNS =
  "id,title,description,category,priority,status,progress,due_date,created_by,created_at,updated_at";

const CATEGORIES = [
  { value: "membros", label: "Membros" },
  { value: "visitantes", label: "Visitantes" },
  { value: "ofertas", label: "Ofertas" },
  { value: "espiritual", label: "Espiritual" },
  { value: "geral", label: "Geral" },
];

const STATUS_META: Record<GoalStatus, { label: string; accent: string; dot: string }> = {
  pending:     { label: "Pendente",    accent: "text-muted-foreground", dot: "bg-muted-foreground" },
  in_progress: { label: "Em progresso",accent: "text-[color:var(--brand-blue-glow)]",  dot: "bg-[color:var(--brand-blue-glow)]" },
  completed:   { label: "Concluída",   accent: "text-[color:var(--brand-green-glow)]", dot: "bg-[color:var(--brand-green-glow)]" },
  cancelled:   { label: "Cancelada",   accent: "text-destructive",                     dot: "bg-destructive" },
};

const PRIORITY_META: Record<GoalPriority, { label: string; cls: string }> = {
  low:    { label: "Baixa",  cls: "border-[color:var(--brand-blue)]/40  bg-[color:var(--brand-blue)]/10  text-[color:var(--brand-blue-glow)]" },
  medium: { label: "Média",  cls: "border-[color:var(--brand-amber)]/40 bg-[color:var(--brand-amber)]/10 text-[color:var(--brand-amber-glow)]" },
  high:   { label: "Alta",   cls: "border-[color:var(--brand-red)]/40   bg-[color:var(--brand-red)]/10   text-[color:var(--brand-red-glow)]" },
};

function friendlyError(err: { message?: string; code?: string } | null | undefined, fallback = "Algo deu errado.") {
  if (!err) return fallback;
  const msg = err.message ?? "";
  const code = err.code ?? "";
  if (code === "42P01" || /relation .* does not exist/i.test(msg)) {
    return "Tabela 'goals' não encontrada. Execute o SQL em supabase/GOALS.sql.";
  }
  if (code === "42501" || /permission denied/i.test(msg) || /row-level security/i.test(msg)) {
    return "Você não tem permissão para esta ação.";
  }
  if (/jwt|auth/i.test(msg)) return "Sessão expirada. Faça login novamente.";
  return msg || fallback;
}

function MetasPage() {
  const { isLider, isAdmin, user } = useAuth();
  const canWrite = isLider || isAdmin;

  const [items, setItems] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | GoalStatus>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from(GOALS_TABLE)
      .select(GOAL_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(friendlyError(error));
      setItems([]);
      setLoading(false);
      return;
    }
    setItems((data as Goal[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("goals-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: GOALS_TABLE }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtered = useMemo(
    () => items.filter(
      (g) =>
        (filterStatus === "all" || g.status === filterStatus) &&
        (filterCategory === "all" || g.category === filterCategory),
    ),
    [items, filterStatus, filterCategory],
  );

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((g) => g.status === "completed").length;
    const pending = items.filter((g) => g.status !== "completed" && g.status !== "cancelled").length;
    const avg = total ? Math.round(items.reduce((s, g) => s + (g.progress ?? 0), 0) / total) : 0;
    return { total, completed, pending, avg };
  }, [items]);

  const handleSave = async (form: Partial<Goal>) => {
    if (!user) return toast.error("Faça login para gerenciar metas.");
    if (!form.title?.trim()) return toast.error("Informe o título da meta.");

    const progress = Math.max(0, Math.min(100, Number(form.progress ?? 0)));
    const status: GoalStatus =
      progress >= 100 && form.status !== "cancelled" ? "completed" : (form.status ?? "pending");

    const payload = {
      title: form.title.trim(),
      description: form.description?.toString().trim() || null,
      category: form.category || "geral",
      priority: (form.priority as GoalPriority) || "medium",
      status,
      progress,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
    };

    if (editing) {
      const { data, error } = await supabase
        .from(GOALS_TABLE)
        .update(payload)
        .eq("id", editing.id)
        .select(GOAL_COLUMNS)
        .single();
      if (error) return toast.error(friendlyError(error));
      const updated = data as Goal;
      setItems((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      toast.success("Meta atualizada");
      const wasCompleted = editing.status !== "completed" && updated.status === "completed";
      logAudit(wasCompleted ? "goal.complete" : "goal.update", GOALS_TABLE, updated.id, payload);
    } else {
      const insertPayload = { ...payload, created_by: user.id };
      const { data, error } = await supabase
        .from(GOALS_TABLE)
        .insert(insertPayload)
        .select(GOAL_COLUMNS)
        .single();
      if (error) return toast.error(friendlyError(error));
      const created = data as Goal;
      setItems((prev) => [created, ...prev]);
      toast.success("Meta criada");
      logAudit("goal.create", GOALS_TABLE, created.id, insertPayload);
    }
    setOpen(false);
    setEditing(null);
  };

  const handleComplete = async (g: Goal) => {
    const { data, error } = await supabase
      .from(GOALS_TABLE)
      .update({ status: "completed", progress: 100 })
      .eq("id", g.id)
      .select(GOAL_COLUMNS)
      .single();
    if (error) return toast.error(friendlyError(error));
    const updated = data as Goal;
    setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
    toast.success("Meta concluída 🎉");
    logAudit("goal.complete", GOALS_TABLE, updated.id);
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    const id = confirmId;
    const previous = items;
    setItems((prev) => prev.filter((g) => g.id !== id));
    setConfirmId(null);
    const { error, data } = await supabase.from(GOALS_TABLE).delete().eq("id", id).select("id");
    if (error) {
      setItems(previous);
      return toast.error(friendlyError(error));
    }
    if (!data || data.length === 0) {
      setItems(previous);
      return toast.error("Sem permissão para excluir esta meta.");
    }
    toast.success("Meta excluída");
    logAudit("goal.delete", GOALS_TABLE, id);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Metas & Objetivos"
        subtitle="Acompanhe o progresso das suas metas em tempo real"
        accent="green"
        icon={<Target className="h-6 w-6" />}
        actions={canWrite && (
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova meta
          </Button>
        )}
      />

      {/* Indicadores */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Total",         value: stats.total,     icon: Target,       accent: "blue"  as const },
          { label: "Concluídas",    value: stats.completed, icon: CheckCircle2, accent: "green" as const },
          { label: "Pendentes",     value: stats.pending,   icon: Clock,        accent: "amber" as const },
          { label: "Progresso méd", value: `${stats.avg}%`, icon: Trophy,       accent: "red"   as const },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundImage: `var(--gradient-${s.accent})` }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">Todas categorias</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} de {items.length}</span>
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Trophy className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? "Nenhuma meta cadastrada ainda." : "Nenhuma meta com esses filtros."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence>
              {filtered.map((g, i) => {
                const sm = STATUS_META[g.status];
                const pm = PRIORITY_META[g.priority];
                const cat = CATEGORIES.find((c) => c.value === g.category)?.label ?? g.category;
                return (
                  <motion.li
                    key={g.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                    exit={{ opacity: 0 }}
                    className="group rounded-xl border border-border bg-background/50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${sm.dot}`} />
                          <p className="truncate font-semibold text-foreground">{g.title}</p>
                        </div>
                        {g.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                          <span className="rounded-full border border-border bg-card px-2 py-0.5 text-muted-foreground">
                            {cat}
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 ${pm.cls}`}>
                            <Flag className="mr-1 inline h-3 w-3" />
                            {pm.label}
                          </span>
                          <span className={`rounded-full border border-border bg-card px-2 py-0.5 ${sm.accent}`}>
                            {sm.label}
                          </span>
                          {g.due_date && (
                            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-muted-foreground">
                              <Clock className="mr-1 inline h-3 w-3" />
                              {formatDateTimeBR(g.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {canWrite && g.status !== "completed" && (
                          <button
                            onClick={() => handleComplete(g)}
                            title="Concluir"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-[color:var(--brand-green-glow)]"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            onClick={() => { setEditing(g); setOpen(true); }}
                            title="Editar"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {(isAdmin || (isLider && g.created_by === user?.id)) && (
                          <button
                            onClick={() => setConfirmId(g.id)}
                            title="Excluir"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={g.progress ?? 0} className="h-2 flex-1" />
                      <span className="w-12 text-right text-xs font-bold tabular-nums">{g.progress ?? 0}%</span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <GoalDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}
        editing={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Excluir meta?"
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => { await handleDelete(); }}
      />
    </div>
  );
}

function GoalDialog({
  open, onOpenChange, editing, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Goal | null;
  onSave: (f: Partial<Goal>) => Promise<unknown> | unknown;
}) {
  const [form, setForm] = useState<Partial<Goal>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? { ...editing, due_date: editing.due_date ? editing.due_date.slice(0, 16) : "" }
          : {
              title: "",
              description: "",
              category: "geral",
              priority: "medium",
              status: "pending",
              progress: 0,
              due_date: "",
            },
      );
    }
  }, [open, editing]);

  const submit = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar meta" : "Nova meta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              rows={3}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select
                value={form.category ?? "geral"}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <select
                value={form.priority ?? "medium"}
                onChange={(e) => setForm({ ...form, priority: e.target.value as GoalPriority })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={form.status ?? "pending"}
                onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Progresso ({form.progress ?? 0}%)</Label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress ?? 0}
                onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })}
                className="w-full accent-[color:var(--brand-blue-glow)]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Prazo</Label>
            <DateTimeInputBR
              value={form.due_date ?? ""}
              onChange={(iso) => setForm({ ...form, due_date: iso })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={submit} disabled={!form.title || saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar alterações" : "Criar meta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}