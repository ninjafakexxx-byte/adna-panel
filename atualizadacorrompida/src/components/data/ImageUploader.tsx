import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { uploadImages } from "@/lib/storage";
import { toast } from "sonner";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  max?: number;
}

export function ImageUploader({ value, onChange, folder = "ofertas", max = 8 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, max - value.length);
    if (arr.length === 0) {
      toast.warning(`Máximo de ${max} imagens`);
      return;
    }
    setUploading(true);
    try {
      const urls = await uploadImages(arr, folder);
      onChange([...value, ...urls]);
      toast.success(`${urls.length} imagem(ns) enviada(s)`);
    } catch (e: any) {
      toast.error("Falha no upload", { description: e?.message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <AnimatePresence initial={false}>
          {value.map((url, i) => (
            <motion.div
              key={url}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-background/40 text-xs text-muted-foreground transition hover:border-[color:var(--brand-blue)]/50 hover:text-foreground disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span>{uploading ? "Enviando…" : "Adicionar"}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <p className="text-[11px] text-muted-foreground">
        {value.length}/{max} imagens · JPG, PNG ou WEBP
      </p>
    </div>
  );
}
