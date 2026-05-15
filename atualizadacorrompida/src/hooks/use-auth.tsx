import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export type AppRole = "admin" | "lider" | "membro";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  rolesLoading: boolean;
  isAdmin: boolean;
  isLider: boolean;
  isMembro: boolean;
  hasRole: (r: AppRole) => boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  const loadUserExtras = async (uid: string, authUser?: User | null) => {
    setRolesLoading(true);

    // 1) Profile — com fallback a partir de auth.user_metadata quando a linha
    //    em `profiles` ainda não existe ou veio com campos vazios.
    const profRes = await (supabase as any)
      .from("profiles")
      .select("id, display_name, avatar_url")
      .eq("id", uid)
      .maybeSingle();

    const meta = (authUser?.user_metadata ?? {}) as Record<string, any>;
    const fallbackName =
      meta.display_name || meta.full_name || meta.name ||
      (authUser?.email ? authUser.email.split("@")[0] : null);
    const fallbackAvatar = meta.avatar_url || meta.picture || null;

    const merged: Profile = {
      id: uid,
      display_name: (profRes.data?.display_name && String(profRes.data.display_name).trim())
        ? profRes.data.display_name
        : fallbackName ?? null,
      avatar_url: profRes.data?.avatar_url ?? fallbackAvatar ?? null,
    };
    setProfile(merged);

    // Se a linha não existe em `profiles`, tenta criar com os dados do auth
    // (best-effort: ignora erro de RLS/duplicidade silenciosamente).
    if (!profRes.data && (fallbackName || fallbackAvatar)) {
      void (supabase as any).from("profiles").upsert(
        { id: uid, display_name: fallbackName, avatar_url: fallbackAvatar },
        { onConflict: "id" },
      );
    }

    // 2) Role — tenta RPC `get_my_roles` (SECURITY DEFINER, imune a RLS).
    //    Fallback: SELECT direto em user_roles (RLS permite ler o próprio).
    let resolved: AppRole[] = [];
    const rpcRes = await (supabase as any).rpc("get_my_roles");
    if (rpcRes.error) {
      console.warn("[useAuth] get_my_roles indisponível, usando fallback:", rpcRes.error.message);
    } else if (Array.isArray(rpcRes.data)) {
      resolved = rpcRes.data as AppRole[];
    }

    if (resolved.length === 0) {
      const fb = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (fb.error) {
        console.error("[useAuth] fallback user_roles falhou:", fb.error.message);
      } else {
        resolved = (fb.data ?? []).map((r: { role: AppRole }) => r.role);
      }
    }

    if (resolved.length === 0) {
      console.warn("[useAuth] Nenhum cargo encontrado para", uid,
        "— verifique se public.user_roles tem linha para esse user_id e se FIX_ROLES.sql foi executado.");
    } else {
      console.info("[useAuth] roles do usuário:", resolved);
    }
    setRoles(resolved);
    setRolesLoading(false);
  };

  const refreshProfile = async () => {
    if (user) await loadUserExtras(user.id, user);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        void loadUserExtras(sess.user.id, sess.user);
      } else {
        setProfile(null);
        setRoles([]);
        setRolesLoading(false);
      }
    });
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) await loadUserExtras(sess.user.id, sess.user);
      else setRolesLoading(false);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime: sincroniza cargos quando user_roles muda para o usuário atual
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`user-roles-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
        () => { void loadUserExtras(user.id, user); },
      )
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => { void loadUserExtras(user.id, user); },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  const isAdmin = roles.includes("admin");
  const isLider = roles.includes("lider") || isAdmin;
  const isMembro = roles.includes("membro") || isLider;
  const hasRole = (r: AppRole) => roles.includes(r) || (r === "lider" && isAdmin) || (r === "membro" && isLider);

  return (
    <AuthContext.Provider
      value={{
        session, user, profile, roles, rolesLoading, isAdmin, isLider, isMembro, hasRole,
        loading, signIn, signUp, signOut, resetPassword, updatePassword, refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
