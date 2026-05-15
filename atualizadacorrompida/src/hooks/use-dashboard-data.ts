import { useEffect, useState, useCallback, useMemo } from "react";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";

interface RawRow { id: string; grupo: string | null; created_at: string; valor?: number | null }

export interface DashboardData {
  totalMembros: number;
  totalVisitantes: number;
  totalOfertas: number;
  growthMembros: number;
  growthVisitantes: number;
  growthOfertas: number;
  porGrupo: { grupo: string; membros: number; visitantes: number; ofertas: number }[];
  monthlySeries: { mes: string; membros: number; visitantes: number; ofertas: number }[];
  membrosVsVisitantes: { membros: number; visitantes: number };
  ultimasOfertas: { grupo: string; valor: number; membros: number; visitantes: number }[];
  gruposDisponiveis: string[];
  loading: boolean;
  error: string | null;
}

const initial: DashboardData = {
  totalMembros: 0, totalVisitantes: 0, totalOfertas: 0,
  growthMembros: 0, growthVisitantes: 0, growthOfertas: 0,
  porGrupo: [], monthlySeries: [],
  membrosVsVisitantes: { membros: 0, visitantes: 0 },
  ultimasOfertas: [], gruposDisponiveis: [],
  loading: true, error: null,
};

export interface DashboardFilters {
  from?: Date;
  to?: Date;
  grupo?: string;
}

const MES_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function inRange(iso: string, from?: Date, to?: Date) {
  const d = new Date(iso).getTime();
  if (from && d < from.getTime()) return false;
  if (to) {
    const end = new Date(to); end.setHours(23, 59, 59, 999);
    if (d > end.getTime()) return false;
  }
  return true;
}

function matchGrupo(g: string | null, grupo?: string) {
  if (!grupo || grupo === "__all__") return true;
  return (g ?? "Sem grupo") === grupo;
}

export function useDashboardData(filters: DashboardFilters = {}) {
  const [raw, setRaw] = useState<{ membros: RawRow[]; visitantes: RawRow[]; ofertas: RawRow[]; loading: boolean; error: string | null }>({
    membros: [], visitantes: [], ofertas: [], loading: true, error: null,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [m, v, o] = await Promise.all([
        (supabase as any).from("membros").select("*"),
        (supabase as any).from("visitantes").select("*"),
        (supabase as any).from("ofertas").select("*"),
      ]);
      if (m.error) throw m.error;
      if (v.error) throw v.error;
      if (o.error) throw o.error;
      setRaw({ membros: m.data ?? [], visitantes: v.data ?? [], ofertas: o.data ?? [], loading: false, error: null });
    } catch (e: any) {
      setRaw((s) => ({ ...s, loading: false, error: e?.message ?? "Erro ao carregar" }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "membros" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "visitantes" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "ofertas" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  return useMemo<DashboardData>(() => {
    const { membros: M, visitantes: V, ofertas: O, loading, error } = raw;

    const filt = (rows: RawRow[]) =>
      rows.filter((r) => inRange(r.created_at, filters.from, filters.to) && matchGrupo(r.grupo, filters.grupo));

    const Mf = filt(M), Vf = filt(V), Of = filt(O);

    const totalMembros = Mf.length;
    const totalVisitantes = Vf.length;
    const totalOfertas = Of.reduce((s, r) => s + (Number(r.valor) || 0), 0);

    // Growth: compare last 30d vs previous 30d (only when no explicit range)
    const calcGrowth = (rows: RawRow[], valueOf?: (r: RawRow) => number) => {
      const now = Date.now();
      const d30 = 30 * 24 * 60 * 60 * 1000;
      const cur = rows.filter((r) => now - new Date(r.created_at).getTime() <= d30);
      const prev = rows.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return now - t > d30 && now - t <= 2 * d30;
      });
      const sum = (xs: RawRow[]) => valueOf ? xs.reduce((s, r) => s + valueOf(r), 0) : xs.length;
      const c = sum(cur), p = sum(prev);
      if (p === 0) return c > 0 ? 100 : 0;
      return Math.round(((c - p) / p) * 100);
    };

    const growthMembros = calcGrowth(M);
    const growthVisitantes = calcGrowth(V);
    const growthOfertas = calcGrowth(O, (r) => Number(r.valor) || 0);

    const grupos = new Map<string, { membros: number; visitantes: number; ofertas: number }>();
    const ensure = (g: unknown) => {
      const k = (g == null || g === "" ? "Sem grupo" : String(g));
      if (!grupos.has(k)) grupos.set(k, { membros: 0, visitantes: 0, ofertas: 0 });
      return grupos.get(k)!;
    };
    Mf.forEach((m) => { ensure(m.grupo).membros += 1; });
    Vf.forEach((v) => { ensure(v.grupo).visitantes += 1; });
    Of.forEach((o) => { ensure(o.grupo).ofertas += Number(o.valor) || 0; });

    const porGrupo = Array.from(grupos.entries()).map(([grupo, v]) => ({ grupo, ...v }));

    // Monthly series — last 6 months
    const months: { key: string; mes: string; membros: number; visitantes: number; ofertas: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        mes: MES_LABELS[d.getMonth()],
        membros: 0, visitantes: 0, ofertas: 0,
      });
    }
    const bucket = (iso: string) => {
      const d = new Date(iso);
      return `${d.getFullYear()}-${d.getMonth()}`;
    };
    Mf.forEach((r) => { const m = months.find((x) => x.key === bucket(r.created_at)); if (m) m.membros++; });
    Vf.forEach((r) => { const m = months.find((x) => x.key === bucket(r.created_at)); if (m) m.visitantes++; });
    Of.forEach((r) => { const m = months.find((x) => x.key === bucket(r.created_at)); if (m) m.ofertas += Number(r.valor) || 0; });

    const ultimasOfertas = porGrupo
      .filter((g) => g.ofertas > 0)
      .sort((a, b) => b.ofertas - a.ofertas)
      .slice(0, 4)
      .map((g) => ({ grupo: g.grupo, valor: g.ofertas, membros: g.membros, visitantes: g.visitantes }));

    const gruposDisponiveis = Array.from(
      new Set([...M, ...V, ...O].map((r) => (r.grupo == null || r.grupo === "" ? "Sem grupo" : r.grupo))),
    ).sort();

    return {
      totalMembros, totalVisitantes, totalOfertas,
      growthMembros, growthVisitantes, growthOfertas,
      porGrupo,
      monthlySeries: months.map(({ key, ...r }) => r),
      membrosVsVisitantes: { membros: totalMembros, visitantes: totalVisitantes },
      ultimasOfertas,
      gruposDisponiveis,
      loading, error,
    };
  }, [raw, filters.from, filters.to, filters.grupo]);
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
