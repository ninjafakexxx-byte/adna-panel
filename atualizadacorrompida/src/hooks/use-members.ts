import { useCallback, useEffect, useMemo, useState } from "react";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  marital_status: string | null;
  baptism_date: string | null;
  role: string | null;
  ministry: string | null;
  congregation: string | null;
  avatar_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MemberInput = Partial<Omit<Member, "id" | "created_at" | "updated_at">>;

export function useMembers() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Member[]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();
    const ch = supabase
      .channel("members-realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "members" },
        fetchRows,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchRows]);

  const insert = useCallback(
    async (values: MemberInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...values, created_by: user?.id ?? null };
      const { data, error } = await (supabase as any)
        .from("members")
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error("Erro ao adicionar membro", { description: error.message });
        throw error;
      }
      toast.success("Membro adicionado");
      await logAudit("member.create", "members", data?.id, { full_name: data?.full_name });
      await fetchRows();
      return data as Member;
    },
    [fetchRows],
  );

  const update = useCallback(
    async (id: string, values: MemberInput) => {
      const { error } = await (supabase as any)
        .from("members")
        .update(values)
        .eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar", { description: error.message });
        throw error;
      }
      toast.success("Membro atualizado");
      await logAudit("member.update", "members", id, values as Record<string, unknown>);
      await fetchRows();
    },
    [fetchRows],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from("members").delete().eq("id", id);
      if (error) {
        toast.error("Erro ao excluir", { description: error.message });
        throw error;
      }
      toast.success("Membro excluído");
      await logAudit("member.delete", "members", id);
      await fetchRows();
    },
    [fetchRows],
  );

  const toggleActive = useCallback(
    async (m: Member) => {
      await update(m.id, { is_active: !m.is_active });
    },
    [update],
  );

  return { rows, loading, error, refetch: fetchRows, insert, update, remove, toggleActive };
}

/** KPIs derivados (puramente client-side, leves). */
export function useMembersKpis(rows: Member[]) {
  return useMemo(() => {
    const total = rows.length;
    const ativos = rows.filter((m) => m.is_active).length;
    const inativos = total - ativos;

    const now = Date.now();
    const D30 = 30 * 24 * 60 * 60 * 1000;
    const novos30 = rows.filter((m) => now - new Date(m.created_at).getTime() <= D30).length;
    const novosPrev = rows.filter((m) => {
      const t = new Date(m.created_at).getTime();
      return now - t > D30 && now - t <= 2 * D30;
    }).length;
    const crescimentoMensal =
      novosPrev === 0 ? (novos30 > 0 ? 100 : 0) : Math.round(((novos30 - novosPrev) / novosPrev) * 100);

    // Aniversários nos próximos 30 dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const aniversariantes = rows
      .filter((m) => m.birth_date)
      .map((m) => {
        const b = new Date(m.birth_date as string);
        const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        return { member: m, next };
      })
      .filter((x) => x.next <= in30)
      .sort((a, b) => a.next.getTime() - b.next.getTime());

    return { total, ativos, inativos, novos30, crescimentoMensal, aniversariantes };
  }, [rows]);
}
