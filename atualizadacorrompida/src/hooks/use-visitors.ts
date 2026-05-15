import { useCallback, useEffect, useMemo, useState } from "react";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export interface Visitor {
  id: string;

  full_name: string | null;
  email: string | null;
  phone: string | null;

  invited_by: string | null;
  visit_date: string | null;

  city: string | null;
  neighborhood: string | null;

  notes: string | null;

  status: string | null;

  is_active: boolean;

  created_by: string | null;

  created_at: string;
  updated_at: string;
}

export type VisitorInput = Partial<
  Omit<Visitor, "id" | "created_at" | "updated_at">
>;

export function useVisitors() {
  const [rows, setRows] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("visitors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as Visitor[]);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();

    const ch = supabase
      .channel("visitors-realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "visitors" },
        fetchRows,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchRows]);

  const insert = useCallback(
    async (values: VisitorInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        ...values,
        created_by: user?.id ?? null,
      };

      const { data, error } = await (supabase as any)
        .from("visitors")
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast.error("Erro ao adicionar visitante", {
          description: error.message,
        });

        throw error;
      }

      toast.success("Visitante adicionado");

      await logAudit(
        "visitor.create",
        "visitors",
        data?.id,
        { full_name: data?.full_name },
      );

      await fetchRows();

      return data as Visitor;
    },
    [fetchRows],
  );

  const update = useCallback(
    async (id: string, values: VisitorInput) => {
      const { error } = await (supabase as any)
        .from("visitors")
        .update(values)
        .eq("id", id);

      if (error) {
        toast.error("Erro ao atualizar visitante", {
          description: error.message,
        });

        throw error;
      }

      toast.success("Visitante atualizado");

      await logAudit(
        "visitor.update",
        "visitors",
        id,
        values as Record<string, unknown>,
      );

      await fetchRows();
    },
    [fetchRows],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any)
        .from("visitors")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Erro ao excluir visitante", {
          description: error.message,
        });

        throw error;
      }

      toast.success("Visitante excluído");

      await logAudit("visitor.delete", "visitors", id);

      await fetchRows();
    },
    [fetchRows],
  );

  const toggleActive = useCallback(
    async (v: Visitor) => {
      await update(v.id, {
        is_active: !v.is_active,
      });
    },
    [update],
  );

  return {
    rows,
    loading,
    error,
    refetch: fetchRows,

    insert,
    update,
    remove,

    toggleActive,
  };
}

export function useVisitorsKpis(rows: Visitor[]) {
  return useMemo(() => {
    const total = rows.length;

    const ativos = rows.filter((v) => v.is_active).length;

    const convertidos = rows.filter(
      (v) => v.status === "convertido",
    ).length;

    const novos30 = rows.filter((v) => {
      const created = new Date(v.created_at).getTime();

      return (
        Date.now() - created <=
        30 * 24 * 60 * 60 * 1000
      );
    }).length;

    return {
      total,
      ativos,
      convertidos,
      novos30,
    };
  }, [rows]);
}