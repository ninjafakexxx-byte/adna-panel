import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import {
  Users, Hand, Wallet, TrendingUp, TrendingDown,
  LayoutDashboard, Calendar as CalendarIcon, Target, Shield, Crown,
  Activity, MapPin, ArrowRight, Cake, UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { z } from "zod";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  GroupsBarChart, PresencePieChart, OffersAreaChart, MonthlyEvolutionChart,
} from "@/components/dashboard/Charts";
import { RecentReports } from "@/components/dashboard/RecentReports";
import { useDashboardData, formatBRL } from "@/hooks/use-dashboard-data";
import { useDashboardExtras } from "@/hooks/use-dashboard-extras";
import { useMembers, useMembersKpis } from "@/hooks/use-members";
import { formatDateTimeBR } from "@/lib/utils";
import { DateRangeFilter, DateRange } from "@/components/data/DateRangeFilter";
import {
  EventsTab, GoalsTab, UsersTab, AuditTab,
} from "@/routes/admin";
import { usePermissions } from "@/hooks/use-permissions";
import { Loader2 } from "lucide-react";

type View = "overview" | "eventos" | "metas" | "usuarios" | "auditoria";

const viewSchema = z.object({
  view: z.enum(["overview", "eventos", "metas", "usuarios", "auditoria"]).optional(),
});

export const Route = createFileRoute("/")({
  component: DashboardGuarded,
  validateSearch: (s) => viewSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Início ADNA — Grupo Familiar" },
      { name: "description", content: "Painel administrativo do Grupo Familiar ADNA com membros, visitantes, ofertas e relatórios em tempo real." },
    ],
  }),
});

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function formatDelta(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n}%`;
}

const ALL_TABS: { id: View; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: "overview", label: "Visão geral", icon: LayoutDashboard },
  { id: "eventos", label: "Eventos", icon: CalendarIcon },
  { id: "metas", label: "Metas", icon: Target },
  { id: "usuarios", label: "Usuários", icon: Shield, adminOnly: true },
  { id: "auditoria", label: "Auditoria", icon: Crown, adminOnly: true },
];

function DashboardGuarded() {
  const { can, loading } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !can("dashboard.view")) {
      navigate({ to: "/perfil", replace: true });
    }
  }, [loading, can, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando…
      </div>
    );
  }
  if (!can("dashboard.view")) return null;
  return <Dashboard />;
}

function Dashboard() {
  const { isAdmin } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const view: View = search.view ?? "overview";

  const tabs = ALL_TABS.filter((t) => !t.adminOnly || isAdmin);
  const setView = (v: View) =>
    navigate({ to: "/", search: { view: v === "overview" ? undefined : v } as any });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <DashboardHero />

      {/* Tabs */}
      <div className="sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card/70 p-1.5 shadow-[var(--shadow-card)] backdrop-blur-xl">
        {tabs.map((t) => {
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={[
                "relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition",
                active
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
              ].join(" ")}
            >
              {active && (
                <motion.span
                  layoutId="dashboard-tab-bg"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] shadow-[var(--shadow-glow-blue)]"
                  transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
                />
              )}
              <t.icon className="relative h-4 w-4" />
              <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
        >
          {view === "overview" && <OverviewView />}
          {view === "eventos" && <EventsTab />}
          {view === "metas" && <GoalsTab />}
          {view === "usuarios" && isAdmin && <UsersTab />}
          {view === "auditoria" && isAdmin && <AuditTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DashboardHero() {
  return (
    <motion.div
      {...fadeUp}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-background p-6 sm:p-8 shadow-[var(--shadow-card)]"
    >
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[color:var(--brand-blue)]/30 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[color:var(--brand-red)]/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1 text-xs font-medium text-amber-300/90 shadow-[0_0_20px_-5px_rgba(251,191,36,0.3)]">
            <span>Bem-vindo(a)!</span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl leading-tight">
            Relatório Geral do Grupo Familiar
            <span
              className="block bg-gradient-to-r from-[color:var(--brand-blue)] via-[color:var(--brand-blue-glow)] to-[color:var(--brand-blue)] bg-clip-text text-transparent"
              style={{ filter: "drop-shadow(0 0 18px color-mix(in oklab, var(--brand-blue-glow) 45%, transparent))" }}
            >
              Campo Nova Ananindeua
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium tracking-wide bg-gradient-to-r from-amber-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
            2026: Com Cristo no coração entendendo a urgência de fazer missão!
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function OverviewView() {
  const [range, setRange] = useState<DateRange>({});
  const [grupo, setGrupo] = useState<string>("__all__");
  const navigate = useNavigate();
  const { can } = usePermissions();
  const d = useDashboardData({ from: range.from, to: range.to, grupo });
  const extras = useDashboardExtras();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangeFilter value={range} onChange={setRange} />
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="__all__">Todos os grupos</option>
          {d.gruposDisponiveis.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        {(range.from || range.to || grupo !== "__all__") && (
          <button
            onClick={() => { setRange({}); setGrupo("__all__"); }}
            className="rounded-xl border border-[color:var(--brand-blue)]/40 bg-[color:var(--brand-blue)]/10 px-3 py-2 text-xs font-medium text-[color:var(--brand-blue-glow)] hover:bg-[color:var(--brand-blue)]/20 transition"
          >
            {grupo !== "__all__" ? `← Voltar para visão geral` : "Limpar filtros"}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm text-foreground">
          <TrendingUp className="h-4 w-4 text-[color:var(--brand-green-glow)]" />
          Total: <strong>{formatBRL(d.totalOfertas)}</strong>
        </div>
      </div>

      {d.error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Erro ao carregar dados: {d.error}
        </div>
      )}

      <MembersKpiStrip />

      <section className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
        {[
          { title: "Membros Totais", to: "/membros", value: d.loading ? "…" : String(d.totalMembros), delta: formatDelta(d.growthMembros), variant: "blue" as const, icon: <Users className="h-6 w-6 text-white" />, growth: d.growthMembros, perm: "membros.view" as const, createPerm: "membros.create" as const },
          { title: "Visitantes", to: "/visitantes", value: d.loading ? "…" : String(d.totalVisitantes), delta: formatDelta(d.growthVisitantes), variant: "green" as const, icon: <Hand className="h-6 w-6 text-white" />, growth: d.growthVisitantes, perm: "visitantes.view" as const, createPerm: "visitantes.create" as const },
          { title: "Ofertas", to: "/ofertas", value: d.loading ? "…" : formatBRL(d.totalOfertas), delta: formatDelta(d.growthOfertas), variant: "amber" as const, icon: <Wallet className="h-6 w-6 text-white" />, growth: d.growthOfertas, perm: "ofertas.view" as const, createPerm: "ofertas.create" as const },
        ].map((s, i) => {
          const clickable = can(s.perm);
          const canCreate = can(s.createPerm);
          const go = () => navigate({ to: s.to, search: canCreate ? ({ new: 1 } as any) : ({} as any) });
          return (
            <motion.div
              key={s.title}
              {...fadeUp}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              className={`relative rounded-2xl ${clickable ? "cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""}`}
              onClick={clickable ? go : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } } : undefined}
              aria-label={clickable ? `Abrir ${s.title}` : undefined}
            >
              <StatCard title={s.title} value={s.value} delta={s.delta} variant={s.variant} icon={s.icon} />
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                {s.growth >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                30d
              </span>
            </motion.div>
          );
        })}
      </section>

      <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.18 }}>
        <MonthlyEvolutionChart data={d.monthlySeries} />
      </motion.section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }} className="lg:col-span-2">
          <GroupsBarChart data={d.porGrupo} />
        </motion.div>
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.15 }}>
          <PresencePieChart membros={d.membrosVsVisitantes.membros} visitantes={d.membrosVsVisitantes.visitantes} />
        </motion.div>
      </section>

      <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }}>
        <OffersAreaChart data={d.porGrupo} />
      </motion.section>

      <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.25 }}>
        <RecentReports
          reports={d.ultimasOfertas}
          activeGrupo={grupo !== "__all__" ? grupo : undefined}
          onSelect={(g) => {
            setGrupo(g);
            if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        <UpcomingEventsCard events={extras.upcomingEvents} loading={extras.loading} />
        <MetasOverviewCard extras={extras} />
        <RecentAuditCard items={extras.recentAudit} loading={extras.loading} />
      </motion.section>
    </div>
  );
}

function UpcomingEventsCard({
  events,
  loading,
}: {
  events: ReturnType<typeof useDashboardExtras>["upcomingEvents"];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <CalendarIcon className="h-4 w-4 text-[color:var(--brand-blue-glow)]" />
          Próximos eventos
        </h3>
        <Link
          to="/eventos"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Ver todos <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Nenhum evento agendado.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl border border-border bg-background/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground line-clamp-1">{e.title}</p>
                <span className="shrink-0 rounded-full bg-[color:var(--brand-blue)]/15 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--brand-blue-glow)]">
                  {formatDateTimeBR(e.event_date)}
                </span>
              </div>
              {e.location && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {e.location}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetasOverviewCard({
  extras,
}: {
  extras: ReturnType<typeof useDashboardExtras>;
}) {
  const { totalMetas, metasConcluidas, metasProgressoMedio, metasTop, loading } = extras;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Target className="h-4 w-4 text-[color:var(--brand-amber-glow)]" />
          Metas
        </h3>
        <Link
          to="/metas"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Gerenciar <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-background/40 p-2">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold text-foreground">{loading ? "…" : totalMetas}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-2">
          <p className="text-xs text-muted-foreground">Concluídas</p>
          <p className="text-lg font-bold text-[color:var(--brand-green-glow)]">{loading ? "…" : metasConcluidas}</p>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-2">
          <p className="text-xs text-muted-foreground">Progresso</p>
          <p className="text-lg font-bold text-[color:var(--brand-amber-glow)]">{loading ? "…" : `${metasProgressoMedio}%`}</p>
        </div>
      </div>
      {metasTop.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {metasTop.map((m) => {
            const pct = Math.min(100, Math.max(0, Number(m.progress ?? 0)));
            const label = m.title || m.titulo || m.nome || "Meta";
            return (
              <li key={m.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-foreground">{label}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[color:var(--brand-amber)] to-[color:var(--brand-amber-glow)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecentAuditCard({
  items,
  loading,
}: {
  items: ReturnType<typeof useDashboardExtras>["recentAudit"];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Activity className="h-4 w-4 text-[color:var(--brand-red-glow)]" />
        Auditoria recente
      </h3>
      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem registros recentes.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.slice(0, 6).map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">
                  <span className="text-[color:var(--brand-blue-glow)]">{a.action ?? "—"}</span>
                  {a.entity ? <span className="text-muted-foreground"> · {a.entity}</span> : null}
                </p>
                <p className="truncate text-muted-foreground">{a.user_email ?? a.user_id ?? "Sistema"}</p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatDateTimeBR(a.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MembersKpiStrip() {
  const { rows, loading } = useMembers();
  const k = useMembersKpis(rows);
  const items = [
    { title: "Membros (cadastro)", value: k.total, variant: "blue" as const, icon: <Users className="h-6 w-6 text-white" /> },
    { title: "Ativos", value: k.ativos, variant: "green" as const, icon: <UserCheck className="h-6 w-6 text-white" />, delta: `${k.inativos} inativos` },
    { title: "Novos (30d)", value: k.novos30, variant: "amber" as const, icon: <TrendingUp className="h-6 w-6 text-white" />, delta: `${k.crescimentoMensal >= 0 ? "+" : ""}${k.crescimentoMensal}% mês` },
    { title: "Aniversários (30d)", value: k.aniversariantes.length, variant: "red" as const, icon: <Cake className="h-6 w-6 text-white" /> },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((s, i) => (
        <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
          <StatCard title={s.title} value={loading ? "…" : s.value} variant={s.variant} icon={s.icon} delta={s.delta} />
        </motion.div>
      ))}
    </section>
  );
}
