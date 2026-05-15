import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Plus, MapPin, Clock, Trash2 } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DateTimeInputBR } from "@/components/ui/date-input-br";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/data/ConfirmDialog";
import { logAudit } from "@/lib/audit";
import { RoleGuard } from "@/components/auth/RoleGuard";

// Tradução amigável de erros do Supabase para o usuário final.
function friendlyError(err: { message?: string; code?: string } | null | undefined, fallback = "Algo deu errado.") {
  if (!err) return fallback;
  const msg = err.message ?? "";
  const code = err.code ?? "";
  if (code === "42P01" || /relation .* does not exist/i.test(msg)) {
    return "Tabela 'events' não encontrada no banco. Execute o SQL em supabase/EVENTS.sql.";
  }
  if (code === "42501" || /permission denied/i.test(msg) || /row-level security/i.test(msg)) {
    return "Você não tem permissão para esta ação.";
  }
  if (/jwt|auth/i.test(msg)) return "Sessão expirada. Faça login novamente.";
  if (/network|fetch/i.test(msg)) return "Falha de conexão. Verifique sua internet.";
  return msg || fallback;
}

export const Route = createFileRoute("/eventos")({
  component: EventosPageGuarded,
  head: () => ({ meta: [{ title: "Calendário — ADNA" }] }),
});

function EventosPageGuarded() {
  return (
    <RoleGuard roles={["lider", "admin"]}>
      <EventosPage />
    </RoleGuard>
  );
}

interface Evento {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  event_date: string;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

type EventoInsert = Omit<Evento, "id" | "created_at"> & { id?: string; created_at?: string };
type EventoUpdate = Partial<Omit<Evento, "id" | "created_at" | "created_by">>;

const EVENTS_TABLE = "events";
const EVENT_COLUMNS = "id,title,description,location,event_date,color,created_by,created_at";

const colors: Record<string, string> = {
  blue: "bg-[color:var(--brand-blue)]/20 text-[color:var(--brand-blue-glow)] border-[color:var(--brand-blue)]/40",
  green: "bg-[color:var(--brand-green)]/20 text-[color:var(--brand-green-glow)] border-[color:var(--brand-green)]/40",
  amber: "bg-[color:var(--brand-amber)]/20 text-[color:var(--brand-amber-glow)] border-[color:var(--brand-amber)]/40",
  red: "bg-[color:var(--brand-red)]/20 text-[color:var(--brand-red-glow)] border-[color:var(--brand-red)]/40",
};

function EventosPage() {
  const { isLider, isAdmin, user } = useAuth();
  const [items, setItems] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Evento | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select(EVENT_COLUMNS)
      .order("event_date", { ascending: true });

    if (error) {
      toast.error(friendlyError(error));
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data as Evento[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("eventos-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: EVENTS_TABLE }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evento[]>();
    items.forEach((e) => {
      const k = format(parseISO(e.event_date), "yyyy-MM-dd");
      map.set(k, [...(map.get(k) ?? []), e]);
    });
    return map;
  }, [items]);

  const upcoming = useMemo(
    () => items.filter((e) => new Date(e.event_date) >= new Date(new Date().setHours(0, 0, 0, 0))).slice(0, 5),
    [items],
  );

  const handleSave = async (form: Partial<Evento>) => {
    if (!user) return toast.error("Faça login para gerenciar eventos.");
    if (!form.title || !form.event_date) return toast.error("Informe título e data do evento.");

    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      location: form.location?.trim() || null,
      event_date: form.event_date,
      color: form.color ?? "blue",
    } satisfies EventoUpdate;

    if (editing) {
      const { data, error } = await supabase
        .from(EVENTS_TABLE)
        .update(payload)
        .eq("id", editing.id)
        .select(EVENT_COLUMNS)
        .single();
      if (error) return toast.error(friendlyError(error));
      const updated = data as Evento;
      setItems((prev) =>
        prev
          .map((it) => (it.id === updated.id ? updated : it))
          .sort((a, b) => a.event_date.localeCompare(b.event_date)),
      );
      toast.success("Evento atualizado");
      logAudit("evento.update", EVENTS_TABLE, editing.id, payload);
    } else {
      const insertPayload = { ...payload, created_by: user.id } satisfies EventoInsert;
      const { data, error } = await supabase
        .from(EVENTS_TABLE)
        .insert(insertPayload)
        .select(EVENT_COLUMNS)
        .single();
      if (error) return toast.error(friendlyError(error));
      const created = data as Evento;
      setItems((prev) =>
        [...prev, created].sort((a, b) => a.event_date.localeCompare(b.event_date)),
      );
      toast.success("Evento criado");
      logAudit("evento.create", EVENTS_TABLE, undefined, insertPayload);
    }
    void load();
    setOpen(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    const id = confirmId;
    const { error } = await supabase.from(EVENTS_TABLE).delete().eq("id", id);
    if (error) return toast.error(friendlyError(error));
    setItems((prev) => prev.filter((it) => it.id !== id));
    toast.success("Evento excluído");
    logAudit("evento.delete", EVENTS_TABLE, id);
    setConfirmId(null);
    void load();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendário de Eventos"
        subtitle="Organize encontros, cultos e atividades"
        accent="blue"
        icon={<CalendarIcon className="h-6 w-6" />}
        actions={isLider && (
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Novo evento
          </Button>
        )}
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold capitalize">
              {format(cursor, "MMMM yyyy", { locale: ptBR })}
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setCursor(subMonths(cursor, 1))} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">‹</button>
              <button onClick={() => setCursor(new Date())} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">Hoje</button>
              <button onClick={() => setCursor(addMonths(cursor, 1))} className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent">›</button>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-[360px] w-full" />
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {["dom","seg","ter","qua","qui","sex","sáb"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d) => {
                  const k = format(d, "yyyy-MM-dd");
                  const evs = eventsByDay.get(k) ?? [];
                  const inMonth = isSameMonth(d, cursor);
                  const isToday = isSameDay(d, new Date());
                  const isSelected = selectedDay && isSameDay(d, selectedDay);
                  const handleDayClick = () => {
                    if (!isLider) return;
                    setSelectedDay(d);
                    const base = new Date();
                    const dt = new Date(d);
                    dt.setHours(base.getHours(), base.getMinutes(), 0, 0);
                    setEditing(null);
                    setPrefillDate(format(dt, "yyyy-MM-dd'T'HH:mm"));
                    setOpen(true);
                  };
                  return (
                    <motion.div
                      key={k}
                      whileTap={isLider ? { scale: 0.96 } : undefined}
                      onClick={handleDayClick}
                      role={isLider ? "button" : undefined}
                      tabIndex={isLider ? 0 : -1}
                      onKeyDown={(ev) => {
                        if (isLider && (ev.key === "Enter" || ev.key === " ")) {
                          ev.preventDefault();
                          handleDayClick();
                        }
                      }}
                      className={`relative min-h-[64px] sm:min-h-[80px] rounded-lg border p-1.5 text-xs transition ${
                        inMonth ? "border-border bg-background/50" : "border-transparent text-muted-foreground/60"
                      } ${isToday ? "ring-2 ring-[color:var(--brand-blue-glow)]" : ""} ${
                        isSelected ? "ring-2 ring-[color:var(--brand-green-glow)] bg-accent/40" : ""
                      } ${isLider ? "cursor-pointer hover:bg-accent/50 hover:border-[color:var(--brand-blue-glow)]/40" : ""}`}
                    >
                      <div className={`text-[11px] font-semibold ${isToday ? "text-[color:var(--brand-blue-glow)]" : ""}`}>
                        {format(d, "d")}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {evs.slice(0, 2).map((e) => (
                          <button
                            key={e.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              if (isLider) { setEditing(e); setPrefillDate(null); setOpen(true); }
                            }}
                            className={`block w-full truncate rounded border px-1 text-left text-[10px] ${colors[e.color ?? "blue"] ?? colors.blue}`}
                          >
                            {e.title}
                          </button>
                        ))}
                        {evs.length > 2 && <p className="text-[9px] text-muted-foreground">+{evs.length - 2}</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
          className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
        >
          <h3 className="mb-3 text-sm font-semibold">Próximos eventos</h3>
          {loading ? (
            <Skeleton className="h-40" />
          ) : upcoming.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sem eventos próximos.</p>
          ) : (
            <ul className="space-y-2">
              <AnimatePresence>
                {upcoming.map((e) => (
                  <motion.li
                    key={e.id}
                    initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
                    className="group rounded-xl border border-border bg-background/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm">{e.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(e.event_date), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {e.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {e.location}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => setConfirmId(e.id)}
                          className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </motion.div>
      </div>

      <EventoDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setPrefillDate(null); setSelectedDay(null); } }}
        editing={editing}
        prefillDate={prefillDate}
        onSave={handleSave}
      />
      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(o) => !o && setConfirmId(null)}
        title="Excluir evento?"
        description="Esta ação não pode ser desfeita."
        onConfirm={async () => { await handleDelete(); }}
      />
    </div>
  );
}

function EventoDialog({
  open, onOpenChange, editing, prefillDate, onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: Evento | null;
  prefillDate?: string | null;
  onSave: (f: Partial<Evento>) => void;
}) {
  const [form, setForm] = useState<Partial<Evento>>({});
  useEffect(() => {
    if (open) {
      setForm(editing
        ? { ...editing, event_date: editing.event_date.slice(0, 16) }
        : { color: "blue", event_date: prefillDate ?? format(new Date(), "yyyy-MM-dd'T'HH:mm") });
    }
  }, [open, editing, prefillDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar evento" : "Novo evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Data e hora</Label>
            <DateTimeInputBR
              value={form.event_date ?? ""}
              onChange={(iso) => setForm({ ...form, event_date: iso })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Local</Label>
            <Input value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {Object.keys(colors).map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    form.color === c ? "border-foreground scale-110" : "border-transparent"
                  } ${colors[c]}`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              disabled={!form.title || !form.event_date}
              onClick={() => onSave({ ...form, event_date: new Date(form.event_date!).toISOString() })}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
