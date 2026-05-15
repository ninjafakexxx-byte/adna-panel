import { useCallback, useEffect, useState } from "react";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";

export interface AuditLog {
  id: string;

  user_id: string | null;

  action: string;

  entity: string | null;

  entity_id: string | null;

  details: Record<string, unknown> | null;

  created_at: string;
}

export function useAudit() {
  const [rows, setRows] = useState<AuditLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const fetchRows = useCallback(async () => {
    const { data, error } = await (
      supabase as any
    )
      .from("audit_logs")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      setLoading(false);

      return;
    }

    setRows(
      (data ?? []) as AuditLog[],
    );

    setError(null);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRows();

    const ch = supabase
      .channel("audit-realtime")
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "audit_logs",
        },
        fetchRows,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchRows]);

  return {
    rows,
    loading,
    error,
    refetch: fetchRows,
  };
}