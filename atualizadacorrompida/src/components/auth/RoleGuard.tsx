import { ReactNode, useEffect } from "react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export function RoleGuard({
  roles,
  children,
  fallback,
  redirectTo = "/acesso-negado",
}: {
  roles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}) {
  const { hasRole, loading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const isLoading = loading || rolesLoading;
  const ok = !isLoading && roles.some((r) => hasRole(r));

  useEffect(() => {
    if (!isLoading && !ok && !fallback) {
      navigate({ to: redirectTo, replace: true });
    }
  }, [isLoading, ok, fallback, redirectTo, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando permissões…
      </div>
    );
  }
  if (ok) return <>{children}</>;
  if (fallback) return <>{fallback}</>;
  return null;
}
