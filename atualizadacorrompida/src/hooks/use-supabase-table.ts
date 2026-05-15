import { useEffect, useState, useCallback } from "react";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { toast } from "sonner";

export interface Row {
  id: string;
  nome?: string | null;
  grupo?: string | null;
  valor?: number | null;
  created_at: string;
}

type TableName = "membros" | "visitantes" | "ofertas";

export function useSupabaseTable(table: TableName) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    fetchRows();
    const ch = supabase
      .channel(`tbl-${table}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        fetchRows,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [table, fetchRows]);

  const insert = useCallback(
    async (values: Partial<Row>) => {
      const { error } = await (supabase as any).from(table).insert(values);
      if (error) {
        toast.error("Erro ao adicionar", { description: error.message });
        throw error;
      }
      toast.success("Registro adicionado com sucesso");
      await fetchRows();
    },
    [table, fetchRows],
  );

  const update = useCallback(
    async (id: string, values: Partial<Row>) => {
      const { error } = await (supabase as any).from(table).update(values).eq("id", id);
      if (error) {
        toast.error("Erro ao atualizar", { description: error.message });
        throw error;
      }
      toast.success("Registro atualizado");
      await fetchRows();
    },
    [table, fetchRows],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq("id", id);
      if (error) {
        toast.error("Erro ao excluir", { description: error.message });
        throw error;
      }
      toast.success("Registro excluído");
      await fetchRows();
    },
    [table, fetchRows],
  );

  return { rows, loading, error, refetch: fetchRows, insert, update, remove };
}
