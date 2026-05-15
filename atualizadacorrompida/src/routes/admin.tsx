import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, Shield, User as UserIcon, Activity, Users, Search, BarChart3,
  Calendar as CalendarIcon, Target, Lock, Unlock, Trash2, Pencil, Plus,
  TrendingUp, Wallet, Hand, Trophy,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { DateInputBR, DateTimeInputBR } from "@/components/ui/date-input-br";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { format, formatDistanceToNow, parseISO, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { MetasModule } from "@/routes/metas";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin — ADNA" }] }),
});

function AdminPage() {
  return (
    <RoleGuard roles={["admin"]}>
      <div className="space-y-5">
        <PageHeader
          title="Painel Administrativo"
          subtitle="Central de gestão, métricas e auditoria"
          accent="amber"
          icon={<Crown className="h-6 w-6" />}
        />
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card border border-border flex flex-wrap h-auto">
            <TabsTrigger value="overview"><BarChart3 className="h-4 w-4 mr-2" />Visão geral</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
            <TabsTrigger value="events"><CalendarIcon className="h-4 w-4 mr-2" />Eventos</TabsTrigger>
            <TabsTrigger value="goals"><Target className="h-4 w-4 mr-2" />Metas</TabsTrigger>
            <TabsTrigger value="audit"><Activity className="h-4 w-4 mr-2" />Auditoria</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="events"><EventsTab /></TabsContent>
          <TabsContent value="goals"><GoalsTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}

// ============================================================
// OVERVIEW
// ============================================================
export function OverviewTab() {
  const [stats, setStats] = useState({
    membros: 0, visitantes: 0, ofertasTotal: 0, metasConcluidas: 0,
    metasTotal: 0, eventosMes: 0, novosUsuarios30d: 0,
  });
  const [series, setSeries] = useState<{ day: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const since = subDays(new Date(), 30).toISOString();
      const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [mb, vs, of, mt, ev, lg] = await Promise.all([
        (supabase as any).from("membros").select("id", { count: "exact", head: true }),
        (supabase as any).from("visitantes").select("id", { count: "exact", head: true }),
        (supabase as any).from("ofertas").select("valor, created_at"),
        (supabase as any).from("goals").select("status"),
        (supabase as any).from("events").select("id", { count: "exact", head: true }).gte("event_date", startMonth),
        (supabase as any).from("audit_logs").select("created_at").gte("created_at", since).limit(2000),
      ]);
      if (cancel) return;

      // Goals concluídas: count alvo ≤ current
      const counts = {
        membros: mb.count ?? 0,
        visitantes: vs.count ?? 0,
        ofertas: (of.data ?? []).reduce((s: number, r: any) => s + Number(r.valor ?? 0), 0),
      };
      const metas = mt.data ?? [];
      const concluidas = metas.filter((m: any) => m.status === "completed").length;

      // Atividade últimos 14 dias
      const buckets = new Map<string, number>();
      for (let i = 13; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        buckets.set(d, 0);
      }
      (lg.data ?? []).forEach((l: any) => {
        const d = format(startOfDay(parseISO(l.created_at)), "yyyy-MM-dd");
        if (buckets.has(d)) buckets.set(d, (buckets.get(d) ?? 0) + 1);
      });

      setStats({
        membros: counts.membros,
        visitantes: counts.visitantes,
        ofertasTotal: counts.ofertas,
        metasConcluidas: concluidas,
        metasTotal: metas.length,
        eventosMes: ev.count ?? 0,
        novosUsuarios30d: 0, // sem auth admin — opcional
      });
      setSeries(Array.from(buckets.entries()).map(([day, total]) => ({
        day: format(parseISO(day), "dd/MM"),
        total,
      })));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  const cards = [
    { label: "Membros", value: stats.membros.toLocaleString("pt-BR"), icon: Users, accent: "blue" },
    { label: "Visitantes", value: stats.visitantes.toLocaleString("pt-BR"), icon: Hand, accent: "green" },
    { label: "Ofertas (R$)", value: stats.ofertasTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), icon: Wallet, accent: "amber" },
    { label: "Metas concluídas", value: `${stats.metasConcluidas}/${stats.metasTotal}`, icon: Trophy, accent: "green" },
    { label: "Eventos no mês", value: stats.eventosMes.toLocaleString("pt-BR"), icon: CalendarIcon, accent: "blue" },
    { label: "Atividade 30d", value: series.reduce((s, r) => s + r.total, 0).toLocaleString("pt-BR"), icon: TrendingUp, accent: "amber" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return loading ? (
            <Skeleton key={i} className="h-24 w-full" />
          ) : (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                  style={{ backgroundImage: `var(--gradient-${c.accent})` }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold tabular-nums truncate">{c.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4" /> Atividade dos últimos 14 dias
        </h3>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  color: "#FFFFFF",
                }}
                labelStyle={{ color: "#FFFFFF" }}
                itemStyle={{ color: "#FFFFFF" }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--brand-blue-glow)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

// ============================================================
// USERS
// ============================================================
interface UserRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_blocked: boolean;
  created_at: string | null;
  roles: string[];
}
type Role = "admin" | "lider" | "membro";

const roleMeta: Record<Role, {
  label: string;
  icon: any;
  accent: "amber" | "blue" | "green";
  activeCls: string;
  glowCls: string;
  ringCls: string;
  toastLabel: string;
}> = {
  admin: {
    label: "Admin",
    icon: Crown,
    accent: "amber",
    activeCls: "bg-gradient-to-r from-[color:var(--brand-amber)] to-[color:var(--brand-amber-glow)] text-white border-[color:var(--brand-amber-glow)]",
    glowCls: "shadow-[0_0_18px_-2px_var(--brand-amber)]",
    ringCls: "ring-[color:var(--brand-amber-glow)]/40",
    toastLabel: "Usuário promovido para Admin",
  },
  lider: {
    label: "Líder",
    icon: Shield,
    accent: "blue",
    activeCls: "bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-white border-[color:var(--brand-blue-glow)]",
    glowCls: "shadow-[0_0_18px_-2px_var(--brand-blue)]",
    ringCls: "ring-[color:var(--brand-blue-glow)]/40",
    toastLabel: "Usuário definido como Líder",
  },
  membro: {
    label: "Membro",
    icon: UserIcon,
    accent: "green",
    activeCls: "bg-gradient-to-r from-[color:var(--brand-green)] to-[color:var(--brand-green-glow)] text-white border-[color:var(--brand-green-glow)]",
    glowCls: "shadow-[0_0_18px_-2px_var(--brand-green)]",
    ringCls: "ring-[color:var(--brand-green-glow)]/40",
    toastLabel: "Usuário definido como Membro",
  },
};

// Resolve "primary" role with priority admin > lider > membro.
// Retorna null quando o usuário NÃO tem nenhum cargo cadastrado em user_roles.
// IMPORTANTE: nunca usar fallback fixo para "membro" — isso mascarava o bug
// onde RLS filtrava as linhas e tudo aparecia como Membro.
const primaryRole = (roles: string[]): Role | null => {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("lider")) return "lider";
  if (roles.includes("membro")) return "membro";
  return null;
};

export function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterRole, setFilterRole] = useState<"todos" | Role>("todos");
  const [pending, setPending] = useState<Record<string, Role | null>>({});

  const load = useCallback(async () => {
    const rpcRes = await (supabase as any).rpc("admin_list_users");
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      const fromRpc: UserRow[] = (rpcRes.data as any[]).map((u) => ({
        id: u.id,
        display_name: u.display_name ?? null,
        avatar_url: u.avatar_url ?? null,
        email: u.email ?? null,
        is_blocked: !!u.is_blocked,
        created_at: u.created_at ?? null,
        roles: Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []),
      }));
      setUsers(fromRpc);
      setLoading(false);
      return;
    }
    if (rpcRes.error) {
      console.warn("[ADMIN/USERS] RPC admin_list_users indisponível:", rpcRes.error.message);
    }

    // Fallback sem email: o email real vem apenas de auth.users via RPC admin_list_users.
    const [profRes, rolesRes] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id, display_name, avatar_url, is_blocked, created_at")
        .order("created_at", { ascending: false }),
      (supabase as any).from("user_roles").select("user_id, role"),
    ]);
    if (profRes.error) {
      toast.error("Erro ao carregar usuários", { description: profRes.error.message });
      setUsers([]);
      setLoading(false);
      return;
    }

    const profiles = (profRes.data ?? []) as any[];
    const rolesRows = (rolesRes.data ?? []) as { user_id: string; role: string }[];
    console.log("[ADMIN/USERS] linhas brutas:", {
      profiles_count: profiles.length,
      user_roles_count: rolesRows.length,
      user_roles_sample: rolesRows.slice(0, 5),
      user_roles_error: rolesRes.error?.message ?? null,
    });

    // Detecta RLS filtrando user_roles (típico: só retorna a linha do próprio admin)
    if (profiles.length > 1 && rolesRows.length <= 1) {
      console.error(
        "[ADMIN/USERS] RLS bloqueando leitura de user_roles. " +
        "A política precisa permitir SELECT para admins (ex.: USING (public.has_role(auth.uid(),'admin')))."
      );
      toast.error("Permissão insuficiente para ler cargos", {
        description: "Política RLS de user_roles precisa liberar SELECT para administradores.",
      });
    }

    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRows) {
      const list = rolesByUser.get(r.user_id) ?? [];
      if (!list.includes(r.role)) list.push(r.role);
      rolesByUser.set(r.user_id, list);
    }

    // Dedupe por id (garantia extra)
    const seen = new Set<string>();
    const merged: UserRow[] = [];
    for (const p of profiles) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const userRoles = rolesByUser.get(p.id) ?? [];
      merged.push({
        id: p.id,
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
        email: null,
        is_blocked: !!p.is_blocked,
        created_at: p.created_at ?? null,
        roles: userRoles,
      });
    }
    setUsers(merged);
    setLoading(false);
  }, []);

  const pendingRef = useRef<Record<string, Role | null>>({});
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  useEffect(() => {
    void load();
    // Realtime sync — atualiza badges quando user_roles muda em qualquer cliente.
    // Ignora eventos enquanto há mutação local pendente (evita "voltar p/ Membro"
    // entre o DELETE e o INSERT da troca de cargo).
    const debouncedReload = () => {
      const hasPending = Object.values(pendingRef.current).some(Boolean);
      if (hasPending) return;
      void load();
    };
    const ch = supabase
      .channel("admin-user-roles")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "user_roles" }, debouncedReload)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "profiles" }, debouncedReload)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // Define um cargo único via RPC atômico (delete + insert no servidor).
  const setRole = async (user: UserRow, role: Role) => {
    const current = primaryRole(user.roles);
    if (current === role) return;
    if (pending[user.id]) return;

    setPending((p) => ({ ...p, [user.id]: role }));
    pendingRef.current = { ...pendingRef.current, [user.id]: role };
    // Optimistic UI
    setUsers((prev) => prev.map((x) => x.id === user.id ? { ...x, roles: [role] } : x));

    // RPC atômico — único round-trip, sem janela inconsistente
    const { error } = await (supabase as any).rpc("set_user_role", {
      _user_id: user.id,
      _role: role,
    });

    if (error) {
      // Fallback (caso a função ainda não exista no banco): delete + upsert
      const delRes = await (supabase as any).from("user_roles").delete().eq("user_id", user.id);
      if (delRes.error) {
        setPending((p) => ({ ...p, [user.id]: null }));
        pendingRef.current = { ...pendingRef.current, [user.id]: null };
        setUsers((prev) => prev.map((x) => x.id === user.id ? { ...x, roles: user.roles } : x));
        return toast.error("Erro ao atualizar cargo", { description: delRes.error.message });
      }
      const insRes = await (supabase as any)
        .from("user_roles")
        .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
      if (insRes.error) {
        setPending((p) => ({ ...p, [user.id]: null }));
        pendingRef.current = { ...pendingRef.current, [user.id]: null };
        void load();
        return toast.error("Erro ao definir cargo", { description: insRes.error.message });
      }
    }

    toast.success(roleMeta[role].toastLabel, { description: "Cargo atualizado com sucesso" });
    logAudit("role.set", "user_roles", user.id, { role, previous: current });
    setPending((p) => ({ ...p, [user.id]: null }));
    pendingRef.current = { ...pendingRef.current, [user.id]: null };
    void load();
  };

  const toggleBlocked = async (u: UserRow) => {
    const next = !u.is_blocked;
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_blocked: next } : x));
    // Tenta RPC primeiro (SECURITY DEFINER, garante permissão de admin)
    let { error } = await (supabase as any).rpc("admin_set_blocked", { _user_id: u.id, _blocked: next });
    if (error) {
      // Fallback: UPDATE direto (depende de RLS de profiles)
      const upd = await (supabase as any).from("profiles").update({ is_blocked: next }).eq("id", u.id);
      error = upd.error;
    }
    if (error) {
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_blocked: !next } : x));
      return toast.error("Erro ao atualizar bloqueio", { description: error.message });
    }
    toast.success(next ? "Usuário bloqueado" : "Usuário desbloqueado");
    logAudit(next ? "user.block" : "user.unblock", "profiles", u.id);
  };

  const debouncedQ = useDebounce(q, 200);
  const filtered = users.filter((u) => {
    const term = debouncedQ.toLowerCase();
    const matchQ = !term || (u.display_name ?? "").toLowerCase().includes(term)
      || (u.email ?? "").toLowerCase().includes(term);
    const matchRole = filterRole === "todos" || u.roles.includes(filterRole);
    return matchQ && matchRole;
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou email…"
            className="w-full bg-transparent outline-none"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value as any)}
          className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
        >
          <option value="todos">Todos os cargos</option>
          <option value="admin">Admin</option>
          <option value="lider">Líder</option>
          <option value="membro">Membro</option>
        </select>
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhum usuário encontrado" />
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((u) => (
            <motion.li
              key={u.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-wrap items-center gap-3 py-3 ${u.is_blocked ? "opacity-60" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-sm font-bold text-white">
                {u.avatar_url ? <img src={u.avatar_url} className="h-full w-full object-cover" /> : (u.display_name ?? u.email ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium flex items-center gap-2">
                  {u.display_name ?? "Sem nome"}
                  {u.is_blocked && <span className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--brand-red-glow)]">Bloqueado</span>}
                  {u.roles.length === 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
                      Sem cargo
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email ?? "—"} {u.created_at && `• Cadastro ${format(parseISO(u.created_at), "dd/MM/yyyy", { locale: ptBR })}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["admin", "lider", "membro"] as Role[]).map((r) => {
                  const current = primaryRole(u.roles);
                  const isActive = current === r;
                  const isLoading = pending[u.id] === r;
                  const isDisabled = !!pending[u.id];
                  const m = roleMeta[r];
                  const Icon = m.icon;
                  return (
                    <motion.button
                      key={r}
                      whileTap={isActive || isDisabled ? {} : { scale: 0.94 }}
                      whileHover={isActive || isDisabled ? {} : { scale: 1.06 }}
                      onClick={() => setRole(u, r)}
                      disabled={isActive || isDisabled}
                      title={isActive ? "Cargo atual" : `Definir como ${m.label}`}
                      aria-pressed={isActive}
                      className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? `${m.activeCls} ${m.glowCls} ring-2 ${m.ringCls} scale-105 cursor-not-allowed`
                          : "border-border/60 bg-background/40 text-muted-foreground opacity-60 hover:opacity-100 hover:border-border hover:bg-background backdrop-blur-sm"
                      } ${isDisabled && !isActive ? "cursor-not-allowed opacity-40" : ""}`}
                    >
                      {isLoading ? (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <Icon className={`h-3.5 w-3.5 ${isActive ? "drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" : ""}`} />
                      )}
                      <span>{m.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              <button
                onClick={() => toggleBlocked(u)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition hover:scale-105 ${
                  u.is_blocked
                    ? "bg-[color:var(--brand-red)]/15 text-[color:var(--brand-red-glow)] border-[color:var(--brand-red)]/30"
                    : "border-border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {u.is_blocked ? <><Unlock className="h-3 w-3" /> Desbloquear</> : <><Lock className="h-3 w-3" /> Bloquear</>}
              </button>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// EVENTS (admin-level CRUD list)
// ============================================================
interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  category: string | null;
  color: string | null;
}

export function EventsTab() {
  const { isAdmin, isLider, user } = useAuth();
  const canCreate = isAdmin || isLider;
  const [items, setItems] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("events")
      .select("id,title,description,location,event_date,category,color")
      .order("event_date", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as AdminEvent[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-events")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "events" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtered = items.filter((e) => {
    const matchQ = !q || e.title.toLowerCase().includes(q.toLowerCase())
      || (e.category ?? "").toLowerCase().includes(q.toLowerCase());
    const d = e.event_date.slice(0, 10);
    const matchFrom = !from || d >= from;
    const matchTo = !to || d <= to;
    return matchQ && matchFrom && matchTo;
  });

  const handleSave = async (form: Partial<AdminEvent>) => {
    const payload = {
      title: form.title?.trim(),
      description: form.description?.trim() || null,
      location: form.location?.trim() || null,
      event_date: form.event_date,
      category: form.category?.trim() || null,
      color: form.color ?? "blue",
    };
    if (editing) {
      const { error } = await (supabase as any).from("events").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Evento atualizado");
      logAudit("evento.update", "events", editing.id, payload);
    } else {
      if (!user) return toast.error("Faça login para criar eventos.");
      if (!payload.title || !payload.event_date) return toast.error("Informe título e data.");
      const insertPayload = { ...payload, created_by: user.id };
      const { data, error } = await (supabase as any)
        .from("events").insert(insertPayload).select("id").single();
      if (error) return toast.error(error.message);
      toast.success("Evento criado");
      logAudit("evento.create", "events", data?.id, insertPayload);
    }
    setOpen(false);
    setEditing(null);
    void load();
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    const id = confirmId;
    const previous = items;
    setItems((prev) => prev.filter((x) => x.id !== id));
    setConfirmId(null);
    const { error } = await (supabase as any).from("events").delete().eq("id", id);
    if (error) {
      setItems(previous);
      return toast.error(error.message);
    }
    toast.success("Evento excluído");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] flex flex-wrap items-center gap-2">
        <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar título ou categoria…" className="w-full bg-transparent outline-none" />
        </div>
        <DateInputBR value={from} onChange={(iso) => setFrom(iso)} className="w-auto" />
        <DateInputBR value={to} onChange={(iso) => setTo(iso)} className="w-auto" />
        {canCreate && (
          <Button
            onClick={() => { setEditing(null); setOpen(true); }}
            className="ml-auto gap-2 shrink-0"
          >
            <Plus className="h-4 w-4" /> Novo Evento
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState message="Nenhum evento encontrado" />
        ) : (
          <ul className="divide-y divide-border">
            <AnimatePresence>
              {filtered.map((e) => (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="flex flex-wrap items-center gap-3 py-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {format(parseISO(e.event_date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                      {e.category && <> • {e.category}</>}
                      {e.location && <> • {e.location}</>}
                    </p>
                  </div>
                  <button onClick={() => { setEditing(e); setOpen(true); }} className="text-muted-foreground hover:text-foreground transition opacity-0 group-hover:opacity-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setConfirmId(e.id)} className="text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
          <EventEditForm
            initial={editing ?? {
              id: "",
              title: "",
              description: null,
              location: null,
              event_date: new Date().toISOString(),
              category: null,
              color: "blue",
            }}
            onSave={handleSave}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Excluir evento?"
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => { await handleDelete(); }}
      />
    </div>
  );
}

function EventEditForm({ initial, onSave, onCancel }: {
  initial: AdminEvent;
  onSave: (f: Partial<AdminEvent>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<AdminEvent>>({
    ...initial,
    event_date: initial.event_date.slice(0, 16),
  });
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label>Título</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Data e hora</Label><DateTimeInputBR value={form.event_date ?? ""} onChange={(iso) => setForm({ ...form, event_date: iso })} /></div>
      <div className="space-y-1.5"><Label>Categoria</Label><Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="ex: Culto, Reunião…" /></div>
      <div className="space-y-1.5"><Label>Local</Label><Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button
          disabled={!form.title || !form.event_date}
          onClick={() => onSave({ ...form, event_date: new Date(form.event_date!).toISOString() })}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// GOALS (admin) — usa o módulo completo de Metas
// ============================================================
export function GoalsTab() {
  return <MetasModule />;
}

// ============================================================
// AUDIT
// ============================================================
interface AuditRow {
  id: string;
  user_id: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
}

export function AuditTab() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLogs((data as AuditRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin-audit-logs")
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "audit_logs" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtered = useMemo(
    () => logs.filter((l) => !q
      || l.action.toLowerCase().includes(q.toLowerCase())
      || (l.entity ?? "").toLowerCase().includes(q.toLowerCase())),
    [logs, q],
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar ação ou entidade…" className="w-full bg-transparent outline-none" />
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState message="Nenhuma ação registrada" />
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--brand-blue)]/15 text-[color:var(--brand-blue-glow)]">
                <Activity className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span className="font-mono font-medium">{l.action}</span>
                  {l.entity && <span className="text-muted-foreground"> em {l.entity}</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.user_id ? `${l.user_id.slice(0, 8)}… • ` : ""}
                  {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Activity className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
