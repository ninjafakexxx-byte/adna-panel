import { useCallback, useEffect, useState } from "react";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";

export interface UpcomingEvent {
  id: string;
  title: string;
  event_date: string;
  location: string | null;
  color: string | null;
}

export interface MetaRow {
  id: string;
  title?: string | null;
  // legados (compat)
  titulo?: string | null;
  nome?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  progress?: number | null;
  due_date?: string | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  action: string | null;
  entity: string | null;
  entity_id?: string | null;
  user_id?: string | null;
  user_email?: string | null;
  created_at: string;
}

export interface DashboardExtras {
  upcomingEvents: UpcomingEvent[];
  totalMetas: number;
  metasConcluidas: number;
  metasProgressoMedio: number;
  metasTop: MetaRow[];
  recentAudit: AuditEntry[];
  loading: boolean;
  error: string | null;
}

const initial: DashboardExtras = {
  upcomingEvents: [],
  totalMetas: 0,
  metasConcluidas: 0,
  metasProgressoMedio: 0,
  metasTop: [],
  recentAudit: [],
  loading: true,
  error: null,
};

export function useDashboardExtras(): DashboardExtras {
  const [state, setState] = useState<DashboardExtras>(initial);

  const fetchAll = useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();
      const [evRes, metaRes, auditRes] = await Promise.all([
        (supabase as any)
          .from("events")
          .select("id, title, event_date, location, color")
          .gte("event_date", nowIso)
          .order("event_date", { ascending: true })
          .limit(5),
        (supabase as any)
          .from("goals")
          .select("id,title,category,priority,status,progress,due_date,created_at")
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("audit_logs")
          .select("id, action, entity, entity_id, user_id, user_email, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      // Tolerante a falhas individuais — apenas loga e segue.
      if (evRes.error) console.warn("[extras] events:", evRes.error.message);
      if (metaRes.error) console.warn("[extras] goals:", metaRes.error.message);
      if (auditRes.error) console.warn("[extras] audit_logs:", auditRes.error.message);

      const metas: MetaRow[] = metaRes.data ?? [];
      const totalMetas = metas.length;
      const metasConcluidas = metas.filter((m) => (m.status ?? "") === "completed").length;
      const progressos = metas.map((m) => Math.min(100, Math.max(0, Number(m.progress ?? 0))));
      const metasProgressoMedio = progressos.length
        ? Math.round(progressos.reduce((s, n) => s + n, 0) / progressos.length)
        : 0;
      const metasTop = [...metas]
        .sort((a, b) => Number(b.progress ?? 0) - Number(a.progress ?? 0))
        .slice(0, 4);

      setState({
        upcomingEvents: evRes.data ?? [],
        totalMetas,
        metasConcluidas,
        metasProgressoMedio,
        metasTop,
        recentAudit: auditRes.data ?? [],
        loading: false,
        error: null,
      });
    } catch (e: any) {
      setState((s) => ({ ...s, loading: false, error: e?.message ?? "Erro ao carregar" }));
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("dashboard-extras-realtime")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "events" }, fetchAll)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "goals" }, fetchAll)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "audit_logs" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  return state;
}
