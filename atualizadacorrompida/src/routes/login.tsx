import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock, ArrowLeft, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — ADNA" }] }),
});

type Mode = "signin" | "signup" | "forgot";

const emailSchema = z.string().trim().email("E-mail inválido").max(255);
const passwordSchema = z.string().min(6, "Mínimo 6 caracteres").max(72);
const nameSchema = z.string().trim().min(2, "Nome muito curto").max(80);

function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const em = emailSchema.parse(email);
      if (mode === "signin") {
        passwordSchema.parse(pwd);
        await signIn(em, pwd);
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/" });
      } else if (mode === "signup") {
        nameSchema.parse(name);
        passwordSchema.parse(pwd);
        await signUp(em, pwd, name);
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
        setMode("signin");
      } else {
        await resetPassword(em);
        toast.success("E-mail de recuperação enviado.");
        setMode("signin");
      }
    } catch (err: any) {
      const msg = err?.issues?.[0]?.message ?? err?.message ?? "Erro";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const titleMap = {
    signin: { title: "Bem vindo!", sub: "Entre na sua conta ADNA" },
    signup: { title: "Criar conta", sub: "Junte-se ao painel ADNA" },
    forgot: { title: "Recuperar senha", sub: "Enviaremos um link por e-mail" },
  }[mode];

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-10 overflow-hidden">
      <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[color:var(--brand-blue)]/30 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[color:var(--brand-red)]/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-[var(--shadow-card)] backdrop-blur-xl"
      >
        {mode !== "signin" && (
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </button>
        )}

        <div className="mt-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-red)] text-white shadow-[var(--shadow-glow-blue)]">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{titleMap.title}</h1>
            <p className="text-xs text-muted-foreground">{titleMap.sub}</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <Field icon={<UserIcon className="h-4 w-4 text-muted-foreground" />} label="Nome">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/60"
              />
            </Field>
          )}

          <Field icon={<Mail className="h-4 w-4 text-muted-foreground" />} label="E-mail">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/60"
            />
          </Field>

          {mode !== "forgot" && (
            <Field icon={<Lock className="h-4 w-4 text-muted-foreground" />} label="Senha">
              <input
                type="password"
                required
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground/60"
              />
            </Field>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow-blue)] transition hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
          </button>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            {mode === "signin" ? (
              <>
                <button type="button" onClick={() => setMode("forgot")} className="hover:text-foreground transition">
                  Esqueci minha senha
                </button>
                <button type="button" onClick={() => setMode("signup")} className="hover:text-foreground transition">
                  Criar conta
                </button>
              </>
            ) : mode === "signup" ? (
              <button type="button" onClick={() => setMode("signin")} className="mx-auto hover:text-foreground transition">
                Já tenho conta — entrar
              </button>
            ) : (
              <span className="mx-auto">Você receberá um link no e-mail informado.</span>
            )}
          </div>
        </form>
      </motion.div>

      <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/40 mt-6">
        Pensado e criado por{" "}
        <span className="font-semibold text-[color:var(--brand-blue)]">Willy Santos</span>
      </p>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-2.5 focus-within:ring-2 focus-within:ring-ring transition">
        {icon}
        {children}
      </div>
    </div>
  );
}
