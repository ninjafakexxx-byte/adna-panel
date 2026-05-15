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

import type {
  Visitor,
  VisitorInput,
} from "@/hooks/use-visitors";

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome"),
  email: z.union([
    z.string().email("E-mail inválido"),
    z.literal(""),
  ]).optional(),

  phone: z.string().optional().or(z.literal("")),

  invited_by: z.string().optional().or(z.literal("")),

  visit_date: z.string().optional().or(z.literal("")),

  city: z.string().optional().or(z.literal("")),

  neighborhood: z.string().optional().or(z.literal("")),

  notes: z.string().optional().or(z.literal("")),

  status: z.string().optional().or(z.literal("")),

  is_active: z.boolean().optional(),
});

type FormState = Record<string, any>;

const empty: FormState = {
  full_name: "",
  email: "",
  phone: "",

  invited_by: "",
  visit_date: "",

  city: "",
  neighborhood: "",

  notes: "",

  status: "novo",

  is_active: true,
};

interface Props {
  open: boolean;

  onOpenChange: (v: boolean) => void;

  initial?: Visitor | null;

  onSubmit: (
    values: VisitorInput,
  ) => Promise<void>;
}

export function VisitorFormDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: Props) {
  const [values, setValues] =
    useState<FormState>(empty);

  const [errors, setErrors] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (open) {
      const init: FormState = { ...empty };

      if (initial) {
        Object.keys(empty).forEach((k) => {
          const v = (initial as any)[k];

          init[k] =
            v == null
              ? k === "is_active"
                ? true
                : ""
              : v;
        });
      }

      setValues(init);
      setErrors({});
    }
  }, [open, initial]);

  const set = (k: string, v: any) =>
    setValues((s) => ({
      ...s,
      [k]: v,
    }));

  const handleSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const parsed =
      schema.safeParse(values);

    if (!parsed.success) {
      const errs: Record<string, string> =
        {};

      parsed.error.issues.forEach((i) => {
        if (i.path[0]) {
          errs[String(i.path[0])] =
            i.message;
        }
      });

      setErrors(errs);

      return;
    }

    const payload: VisitorInput = {};

    Object.entries(parsed.data).forEach(
      ([k, val]) => {
        (payload as any)[k] =
          val === "" ? null : val;
      },
    );

    setLoading(true);

    try {
      await onSubmit(payload);

      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const f = (
    name: string,
    label: string,
    type: string = "text",
    placeholder?: string,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>

      <Input
        type={type}
        value={values[name] ?? ""}
        placeholder={placeholder}
        onChange={(e) =>
          set(name, e.target.value)
        }
        className="bg-background/50"
      />

      {errors[name] && (
        <p className="text-[11px] text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? "Editar visitante"
              : "Novo visitante"}
          </DialogTitle>

          <DialogDescription>
            Cadastro e acompanhamento
            de visitantes.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {f(
              "full_name",
              "Nome completo *",
            )}

            {f(
              "email",
              "E-mail",
              "email",
            )}

            {f(
              "phone",
              "Telefone",
            )}

            {f(
              "visit_date",
              "Data da visita",
              "date",
            )}

            {f(
              "invited_by",
              "Convidado por",
            )}

            {f("city", "Cidade")}

            {f(
              "neighborhood",
              "Bairro",
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Status
              </Label>

              <select
                value={values.status ?? ""}
                onChange={(e) =>
                  set(
                    "status",
                    e.target.value,
                  )
                }
                className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm outline-none"
              >
                <option value="novo">
                  Novo
                </option>

                <option value="acompanhamento">
                  Em acompanhamento
                </option>

                <option value="convertido">
                  Convertido
                </option>

                <option value="inativo">
                  Inativo
                </option>
              </select>
            </div>
          </section>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Observações
            </Label>

            <Textarea
              value={values.notes ?? ""}
              onChange={(e) =>
                set("notes", e.target.value)
              }
              rows={4}
              className="bg-background/50"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
            <div>
              <Label className="text-sm font-medium">
                Visitante ativo
              </Label>

              <p className="text-xs text-muted-foreground">
                Controla métricas e
                acompanhamento.
              </p>
            </div>

            <Switch
              checked={
                !!values.is_active
              }
              onCheckedChange={(v) =>
                set("is_active", v)
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(false)
              }
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)] text-white"
            >
              {loading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              {initial
                ? "Salvar alterações"
                : "Criar visitante"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}