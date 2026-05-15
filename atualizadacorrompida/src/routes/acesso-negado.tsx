import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/acesso-negado")({
  component: AcessoNegadoPage,
  head: () => ({ meta: [{ title: "Acesso negado — ADNA" }] }),
});

function AcessoNegadoPage() {
  return (
    <div className="relative mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-destructive/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[color:var(--brand-blue)]/20 blur-3xl" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-[0_0_40px_-10px_hsl(var(--destructive)/0.5)]">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h1 className="relative text-2xl font-semibold tracking-tight text-foreground">
        Acesso negado
      </h1>
      <p className="relative max-w-sm text-sm text-muted-foreground">
        Você não tem permissão para acessar esta área. Esta seção é restrita a administradores.
        Caso acredite ser um engano, fale com um administrador do sistema.
      </p>
      <Link
        to="/"
        className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-glow-blue)] hover:opacity-90 transition"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao painel
      </Link>
    </div>
  );
}
