/**
 * Sistema central de permissões baseado em roles.
 * Roles: admin > lider > membro
 *
 * Regra geral:
 *  - admin: acesso total
 *  - lider: dashboard + CRUD (criar/editar) de membros, visitantes, ofertas, eventos, metas
 *  - membro: apenas próprio perfil e configurações pessoais
 *
 * Exclusões, auditoria, bloqueio de usuários, gerenciamento global e
 * configurações do sistema são EXCLUSIVOS de admin.
 */
import type { AppRole } from "@/hooks/use-auth";

export type Permission =
  | "dashboard.view"
  | "membros.view"
  | "membros.create"
  | "membros.edit"
  | "membros.delete"
  | "visitantes.view"
  | "visitantes.create"
  | "visitantes.edit"
  | "visitantes.delete"
  | "ofertas.view"
  | "ofertas.create"
  | "ofertas.edit"
  | "ofertas.delete"
  | "eventos.view"
  | "eventos.create"
  | "eventos.edit"
  | "eventos.delete"
  | "metas.view"
  | "metas.create"
  | "metas.delete"
  | "users.manage"
  | "users.block"
  | "audit.view"
  | "system.settings"
  | "admin.panel"
  | "export.data";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    "dashboard.view",
    "membros.view", "membros.create", "membros.edit", "membros.delete",
    "visitantes.view", "visitantes.create", "visitantes.edit", "visitantes.delete",
    "ofertas.view", "ofertas.create", "ofertas.edit", "ofertas.delete",
    "eventos.view", "eventos.create", "eventos.edit", "eventos.delete",
    "metas.view", "metas.create", "metas.delete",
    "users.manage", "users.block",
    "audit.view", "system.settings", "admin.panel", "export.data",
  ],
  lider: [
    "dashboard.view",
    "membros.view", "membros.create", "membros.edit",
    "visitantes.view", "visitantes.create", "visitantes.edit",
    "ofertas.view", "ofertas.create", "ofertas.edit",
    "eventos.view", "eventos.create", "eventos.edit",
    "metas.view", "metas.create",
    "export.data",
  ],
  membro: [],
};

export function roleHasPermission(role: AppRole | null, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(perm) ?? false;
}

export function rolesHavePermission(roles: AppRole[], perm: Permission): boolean {
  return roles.some((r) => roleHasPermission(r, perm));
}
