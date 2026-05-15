import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import type { Member, MemberInput } from "@/hooks/use-members";
import { ImageUploader } from "@/components/data/ImageUploader";

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome completo").max(120),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
  phone: z.string().max(40).optional().or(z.literal("")),
  birth_date: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  state: z.string().max(40).optional().or(z.literal("")),
  zip_code: z.string().max(20).optional().or(z.literal("")),
  marital_status: z.string().optional().or(z.literal("")),
  baptism_date: z.string().optional().or(z.literal("")),
  role: z.string().max(80).optional().or(z.literal("")),
  ministry: z.string().max(80).optional().or(z.literal("")),
  congregation: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
  avatar_url: z.string().optional().or(z.literal("")),
  is_active: z.boolean().optional(),
});

type FormState = Record<string, any>;

const empty: FormState = {
  full_name: "", email: "", phone: "", birth_date: "", gender: "",
  address: "", city: "", state: "", zip_code: "", marital_status: "",
  baptism_date: "", role: "", ministry: "", congregation: "",
  notes: "", avatar_url: "", is_active: true,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Member | null;
  onSubmit: (values: MemberInput) => Promise<void>;
}

export function MemberFormDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [values, setValues] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const init: FormState = { ...empty };
      if (initial) {
        Object.keys(empty).forEach((k) => {
          const v = (initial as any)[k];
          init[k] = v == null ? (k === "is_active" ? true : "") : v;
        });
      }
      setValues(init);
      setErrors({});
    }
  }, [open, initial]);

  const set = (k: string, v: any) => setValues((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        if (i.path[0]) errs[String(i.path[0])] = i.message;
      });
      setErrors(errs);
      return;
    }
    // normalize empty strings to null for date/optional fields
    const v = parsed.data as Record<string, any>;
    const payload: MemberInput = {} as MemberInput;
    Object.keys(v).forEach((k) => {
      const val = v[k];
      (payload as any)[k] = val === "" ? null : val;
    });
    setLoading(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      /* toast handled upstream */
    } finally {
      setLoading(false);
    }
  };

  const f = (name: string, label: string, type: string = "text", placeholder?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        id={name}
        type={type}
        value={values[name] ?? ""}
        placeholder={placeholder}
        onChange={(e) => set(name, e.target.value)}
        className="bg-background/50"
      />
      {errors[name] && <p className="text-[11px] text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {initial ? "Editar membro" : "Novo membro"}
          </DialogTitle>
          <DialogDescription>
            Cadastro completo do membro do Grupo Familiar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar */}
          <div className="rounded-xl border border-border bg-card/50 p-4">
            <Label className="mb-2 block text-xs font-medium text-muted-foreground">Foto / Avatar</Label>
            <ImageUploader
              value={values.avatar_url ? [values.avatar_url] : []}
              onChange={(arr) => set("avatar_url", arr[0] ?? "")}
              folder="members"
              max={1}
            />
          </div>

          {/* Identificação */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {f("full_name", "Nome completo *", "text", "Ex.: João da Silva")}
            {f("email", "E-mail", "email", "exemplo@email.com")}
            {f("phone", "Telefone", "tel", "(00) 00000-0000")}
            {f("birth_date", "Data de nascimento", "date")}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Gênero</Label>
              <select
                value={values.gender ?? ""}
                onChange={(e) => set("gender", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">—</option>
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Estado civil</Label>
              <select
                value={values.marital_status ?? ""}
                onChange={(e) => set("marital_status", e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">—</option>
                <option value="solteiro">Solteiro(a)</option>
                <option value="casado">Casado(a)</option>
                <option value="divorciado">Divorciado(a)</option>
                <option value="viuvo">Viúvo(a)</option>
                <option value="uniao_estavel">União estável</option>
              </select>
            </div>
          </section>

          {/* Endereço */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-6">
            <div className="sm:col-span-4">{f("address", "Endereço", "text", "Rua, número, bairro")}</div>
            <div className="sm:col-span-2">{f("zip_code", "CEP", "text", "00000-000")}</div>
            <div className="sm:col-span-4">{f("city", "Cidade")}</div>
            <div className="sm:col-span-2">{f("state", "UF")}</div>
          </section>

          {/* Igreja */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {f("baptism_date", "Data do batismo", "date")}
            {f("role", "Cargo / Função", "text", "Ex.: Diácono, Líder…")}
            {f("ministry", "Ministério", "text", "Ex.: Louvor, Crianças…")}
            {f("congregation", "Congregação", "text", "Ex.: Sede, Filial…")}
          </section>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Observações</Label>
            <Textarea
              value={values.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Notas internas…"
              className="bg-background/50"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
            <div>
              <Label className="text-sm font-medium">Membro ativo</Label>
              <p className="text-xs text-muted-foreground">Inativos não contam nas métricas principais.</p>
            </div>
            <Switch
              checked={!!values.is_active}
              onCheckedChange={(v) => set("is_active", v)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? "Salvar alterações" : "Criar membro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
