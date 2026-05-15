import { useEffect, useState } from "react";
import { z, ZodObject } from "zod";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader } from "./ImageUploader";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "images";
  placeholder?: string;
  imageFolder?: string;
  imageMax?: number;
}

interface Props<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  schema: ZodObject<any>;
  initialValues?: Partial<T>;
  onSubmit: (values: T) => Promise<void>;
  submitLabel?: string;
  accentClass?: string;
}

export function CrudFormDialog<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  description,
  fields,
  schema,
  initialValues,
  onSubmit,
  submitLabel = "Salvar",
  accentClass = "bg-gradient-to-r from-[color:var(--brand-blue)] to-[color:var(--brand-blue-glow)]",
}: Props<T>) {
  const empty = Object.fromEntries(fields.map((f) => [f.name, f.type === "images" ? [] : ""])) as Record<string, any>;
  const [values, setValues] = useState<Record<string, any>>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      const init = { ...empty, ...(initialValues ?? {}) };
      Object.keys(init).forEach((k) => {
        const fieldDef = fields.find((f) => f.name === k);
        if (init[k] == null) init[k] = fieldDef?.type === "images" ? [] : "";
      });
      setValues(init);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    try {
      setLoading(true);
      await onSubmit(parsed.data as T);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name}>{f.label}</Label>
              {f.type === "images" ? (
                <ImageUploader
                  value={Array.isArray(values[f.name]) ? values[f.name] : []}
                  onChange={(urls) => setValues((v) => ({ ...v, [f.name]: urls }))}
                  folder={f.imageFolder}
                  max={f.imageMax}
                />
              ) : (
                <Input
                  id={f.name}
                  type={f.type ?? "text"}
                  placeholder={f.placeholder}
                  value={values[f.name] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.name]: e.target.value }))
                  }
                  disabled={loading}
                />
              )}
              {errors[f.name] && (
                <p className="text-xs text-destructive">{errors[f.name]}</p>
              )}
            </div>
          ))}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`${accentClass} text-white border-0 hover:opacity-90`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { z };
