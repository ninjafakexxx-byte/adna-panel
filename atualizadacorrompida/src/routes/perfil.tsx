import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { User as UserIcon, Camera, Save, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/hooks/use-auth";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/perfil")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Perfil — ADNA" }] }),
});

function ProfilePage() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();

  // Fallbacks robustos a partir do auth.user_metadata para casos em que
  // a linha em `profiles` ainda não existe ou veio vazia.
  const meta = (user?.user_metadata ?? {}) as Record<string, any>;
  const fallbackName = useMemo(
    () => meta.display_name || meta.full_name || meta.name || (user?.email ? user.email.split("@")[0] : ""),
    [meta.display_name, meta.full_name, meta.name, user?.email],
  );
  const fallbackAvatar = useMemo(
    () => meta.avatar_url || meta.picture || "",
    [meta.avatar_url, meta.picture],
  );

  const [name, setName] = useState<string>(profile?.display_name ?? fallbackName ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string>(profile?.avatar_url ?? fallbackAvatar ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sincroniza estado quando o profile/auth termina de hidratar (login/refresh).
  useEffect(() => {
    setName((cur) => cur || profile?.display_name || fallbackName || "");
    setAvatarUrl((cur) => cur || profile?.avatar_url || fallbackAvatar || "");
  }, [profile?.display_name, profile?.avatar_url, fallbackName, fallbackAvatar]);

  const initials = (name || user?.email || "?").slice(0, 2).toUpperCase();

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedAvatar = avatarUrl.trim() || null;
      const { error } = await (supabase as any)
        .from("profiles")
        .upsert({ id: user.id, display_name: trimmedName, avatar_url: trimmedAvatar }, { onConflict: "id" });
      if (error) throw error;
      // Mantém auth.user_metadata sincronizado para hidratação imediata pós-reload.
      await supabase.auth.updateUser({ data: { display_name: trimmedName, avatar_url: trimmedAvatar } });
      await refreshProfile();
      toast.success("Perfil atualizado com sucesso");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast.success("Avatar enviado — clique em Salvar para confirmar");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload (verifique se o bucket 'avatars' existe)");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Meu Perfil"
        subtitle="Atualize seu nome e foto"
        accent="blue"
        icon={<UserIcon className="h-6 w-6" />}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-[color:var(--brand-blue)]/20">
              <AvatarImage src={avatarUrl} alt={name} />
              <AvatarFallback className="bg-gradient-to-br from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition hover:scale-105"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </div>
          <div className="flex-1 space-y-1 text-center sm:text-left">
            <p className="text-lg font-semibold">{name || fallbackName || "—"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${
                isAdmin
                  ? "border-[color:var(--brand-amber)]/40 bg-[color:var(--brand-amber)]/10 text-[color:var(--brand-amber-glow)]"
                  : "border-[color:var(--brand-blue)]/30 bg-[color:var(--brand-blue)]/10 text-[color:var(--brand-blue-glow)]"
              }`}
            >
              {isAdmin ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
              {isAdmin ? "Administrador" : "Membro"}
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-4 border-t border-border pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome de exibição</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">URL do Avatar</Label>
            <Input
              id="avatar"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-muted-foreground">
              Você pode colar uma URL ou enviar uma foto pelo botão da câmera.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
