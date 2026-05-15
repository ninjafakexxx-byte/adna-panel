import { Search, ChevronDown, LogOut, Settings as SettingsIcon, Shield, User as UserIcon, Sun, Moon, Crown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRouterState, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const titles: Record<string, string> = {
  "/": "Início",
  "/membros": "Membros",
  "/visitantes": "Visitantes",
  "/ofertas": "Ofertas",
  "/eventos": "Calendário",
  "/metas": "Metas & Indicadores",
  "/admin": "Painel Administrativo",
  "/sistema": "Configurações do Sistema",
  "/perfil": "Meu Perfil",
  "/login": "Login",
  "/configuracoes": "Configurações",
};

export function Header() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const title = titles[path] ?? "Painel";
  const { user, profile, roles, rolesLoading, isAdmin, isLider, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const metaName = meta.display_name || meta.full_name || meta.name;
  const metaAvatar = meta.avatar_url || meta.picture;
  const displayName = profile?.display_name || metaName || user?.email?.split("@")[0] || "Usuário";
  const avatarUrl = profile?.avatar_url || metaAvatar || null;
  const initial = (displayName || user?.email || "?").slice(0, 1).toUpperCase();
  // Role real do banco — sem fallback. Skeleton enquanto carrega.
  const roleLabel = isAdmin ? "Administrador" : isLider ? "Líder" : roles.includes("membro") ? "Membro" : null;
  const RoleIcon = isAdmin ? Crown : isLider ? Shield : UserIcon;

  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/70 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
      <SidebarTrigger className="text-foreground" />
      <div className="hidden sm:block h-6 w-px bg-border" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{title}</h1>
        <p className="hidden sm:block text-xs text-muted-foreground">
          Bem-vindo de volta ao painel ADNA
        </p>
      </div>

      <div className="hidden lg:flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground w-72">
        <Search className="h-4 w-4" />
        <input
          placeholder="Buscar…"
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground/70 text-foreground"
        />
      </div>

      <button
        onClick={toggle}
        aria-label="Alternar tema"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <NotificationsBell />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5 hover:bg-accent transition">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-xs font-bold text-white overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-foreground leading-none truncate max-w-[120px]">{displayName}</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5 flex items-center gap-1">
                {rolesLoading ? (
                  <span className="inline-block h-2 w-16 animate-pulse rounded bg-muted" />
                ) : roleLabel ? (
                  <>
                    <RoleIcon className="h-2.5 w-2.5" />
                    {roleLabel}
                  </>
                ) : null}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/perfil" className="cursor-pointer">
              <UserIcon className="h-4 w-4 mr-2" /> Meu Perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/configuracoes" className="cursor-pointer">
              <SettingsIcon className="h-4 w-4 mr-2" /> Configurações
            </Link>
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild>
              <Link to="/admin" className="cursor-pointer">
                <Crown className="h-4 w-4 mr-2" /> Painel Admin
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
