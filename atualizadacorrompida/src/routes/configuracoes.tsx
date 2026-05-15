import { createFileRoute } from "@tanstack/react-router";
import { Settings, Shield, User as UserIcon, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  component: ConfigPage,
  head: () => ({ meta: [{ title: "Configurações — ADNA" }] }),
});

function ConfigPage() {
  const { user, profile, isAdmin, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="Configurações"
        subtitle="Gerencie sua conta e preferências"
        accent="blue"
        icon={<Settings className="h-6 w-6" />}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-lg font-bold text-white">
            {(profile?.display_name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{profile?.display_name ?? "Sem nome"}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
              isAdmin
                ? "border-[color:var(--brand-amber)]/40 bg-[color:var(--brand-amber)]/10 text-[color:var(--brand-amber-glow)]"
                : "border-[color:var(--brand-blue)]/30 bg-[color:var(--brand-blue)]/10 text-[color:var(--brand-blue-glow)]"
            }`}
          >
            {isAdmin ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
            {isAdmin ? "Administrador" : "Membro"}
          </span>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition"
          >
            <LogOut className="h-4 w-4" /> Sair da conta
          </button>
        </div>
      </motion.div>
    </div>
  );
}
