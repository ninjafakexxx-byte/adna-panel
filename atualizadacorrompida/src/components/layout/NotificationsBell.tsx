import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { externalSupabase as supabase } from "@/integrations/external-supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notif {
  id: string;
  title: string;
  body: string | null;
  read: boolean;
  link: string | null;
  created_at: string;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setItems((data as Notif[]) ?? []);
    };
    load();
    const ch = supabase
      .channel(`notif-${user.id}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user]);

  const markAll = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  };
  const markOne = async (id: string) => {
    await (supabase as any).from("notifications").update({ read: true }).eq("id", id);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition"
          aria-label="Notificações"
        >
          <Bell className="h-4 w-4 text-foreground" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--brand-red)] px-1 text-[10px] font-bold text-white"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <CheckCheck className="h-3 w-3" /> Marcar todas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`group flex gap-2 px-3 py-2.5 text-sm transition hover:bg-accent ${
                    !n.read ? "bg-[color:var(--brand-blue)]/5" : ""
                  }`}
                >
                  <div className="mt-1 flex h-2 w-2 shrink-0 items-center justify-center">
                    {!n.read && <span className="h-2 w-2 rounded-full bg-[color:var(--brand-blue-glow)]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => markOne(n.id)}
                      className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-foreground"
                      aria-label="Marcar como lida"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
