import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cog, Save, Image as ImageIcon, MessageSquare, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/sistema")({
  component: SistemaPage,
  head: () => ({ meta: [{ title: "Sistema — ADNA" }] }),
});

interface Settings {
  org_name?: string;
  org_logo?: string;
  welcome_message?: string;
  notify_on_new_member?: boolean;
  notify_on_oferta?: boolean;
}

function SistemaPage() {
  return (
    <RoleGuard roles={["admin"]}>
      <SistemaInner />
    </RoleGuard>
  );
}

function SistemaInner() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).from("system_settings").select("*");
      const obj: Settings = {};
      (data ?? []).forEach((r: any) => { (obj as any)[r.key] = r.value; });
      setSettings(obj);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const rows = Object.entries(settings).map(([key, value]) => ({ key, value: value as any, updated_at: new Date().toISOString() }));
    const { error } = await (supabase as any).from("system_settings").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    logAudit("system_settings.update", "system_settings", undefined, { keys: Object.keys(settings) });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24" /><Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurações do Sistema"
        subtitle="Personalize sua organização e notificações"
        accent="amber"
        icon={<Cog className="h-6 w-6" />}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] space-y-5"
      >
        <Section icon={Building2} title="Organização">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome da organização">
              <Input value={settings.org_name ?? ""} onChange={(e) => setSettings({ ...settings, org_name: e.target.value })} placeholder="Grupo ADNA" />
            </Field>
            <Field label="URL do logotipo">
              <Input value={settings.org_logo ?? ""} onChange={(e) => setSettings({ ...settings, org_logo: e.target.value })} placeholder="https://…" />
            </Field>
          </div>
        </Section>

        <Section icon={MessageSquare} title="Mensagem de boas-vindas">
          <Textarea
            rows={3}
            value={settings.welcome_message ?? ""}
            onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
            placeholder="Bem-vindo ao painel ADNA…"
          />
        </Section>

        <Section icon={ImageIcon} title="Notificações automáticas">
          <Toggle
            label="Notificar ao adicionar novo membro"
            checked={!!settings.notify_on_new_member}
            onChange={(v) => setSettings({ ...settings, notify_on_new_member: v })}
          />
          <Toggle
            label="Notificar ao registrar oferta"
            checked={!!settings.notify_on_oferta}
            onChange={(v) => setSettings({ ...settings, notify_on_oferta: v })}
          />
        </Section>

        <div className="flex justify-end border-t border-border pt-4">
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-[color:var(--brand-blue-glow)]" /> {title}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
