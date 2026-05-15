import { useAuth } from "@/hooks/use-auth";
import { rolesHavePermission, type Permission } from "@/lib/permissions";

export function usePermissions() {
  const { roles, loading, rolesLoading } = useAuth();
  const can = (perm: Permission) => rolesHavePermission(roles, perm);
  return { can, loading: loading || rolesLoading, roles };
}
