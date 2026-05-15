/**
 * Helper central para leitura de cargos.
 * Regra: a role vem SOMENTE do banco (tabela public.user_roles).
 * Nunca usar localStorage, fallback fixo, role mockada ou hardcoded.
 */
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";

export type AppRole = "admin" | "lider" | "membro";

const PRIORITY: AppRole[] = ["admin", "lider", "membro"];

export function pickPrimaryRole(roles: string[] | null | undefined): AppRole | null {
  if (!roles || roles.length === 0) return null;
  for (const r of PRIORITY) if (roles.includes(r)) return r;
  return null;
}

/**
 * Retorna a role principal do usuário logado (ou de outro usuário, se admin).
 * Para o usuário logado usa o RPC `get_my_roles` (imune a RLS).
 * Retorna: "admin" | "lider" | "membro" | null
 */
export async function getUserRole(userId?: string): Promise<AppRole | null> {
  // Caso 1: usuário logado — usa RPC seguro
  const { data: sess } = await supabase.auth.getSession();
  const currentId = sess.session?.user.id;
  if (!userId || userId === currentId) {
    const { data, error } = await (supabase as any).rpc("get_my_roles");
    if (error) {
      console.error("[getUserRole] get_my_roles falhou:", error.message);
      return null;
    }
    return pickPrimaryRole(data as string[]);
  }

  // Caso 2: outro usuário — só funciona se o caller for admin (RLS)
  const { data, error } = await (supabase as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) {
    console.error("[getUserRole] select user_roles falhou:", error.message);
    return null;
  }
  return pickPrimaryRole((data ?? []).map((r: any) => r.role));
}
