import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Nova senha — ADNA" }] }),
});

function ResetPasswordPage() {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [loading, setLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    if (pwd !== pwd2) return toast.error("As senhas não coincidem");
    setLoading(true);
    try {
      await updatePassword(pwd);
      toast.success("Senha atualizada!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[color:var(--brand-blue)]/30 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-[var(--shadow-card)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-red)] text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Definir nova senha</h1>
            <p className="text-xs text-muted-foreground">Escolha uma senha forte</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {[
            { v: pwd, set: setPwd, ph: "Nova senha" },
            { v: pwd2, set: setPwd2, ph: "Confirmar senha" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring transition">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.ph}
                className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/60"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow-blue)] transition hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Atualizar senha
          </button>
        </form>
      </motion.div>
    </div>
  );
}
