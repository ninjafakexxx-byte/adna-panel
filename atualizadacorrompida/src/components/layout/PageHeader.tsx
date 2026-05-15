import { motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  accent?: "blue" | "green" | "amber" | "red";
}

const grads = {
  blue: "var(--gradient-blue)",
  green: "var(--gradient-green)",
  amber: "var(--gradient-amber)",
  red: "var(--gradient-red)",
};

export function PageHeader({ title, subtitle, icon, actions, accent = "blue" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]"
    >
      <div
        className="absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-30 blur-3xl"
        style={{ backgroundImage: grads[accent] }}
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {icon && (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg"
              style={{ backgroundImage: grads[accent] }}
            >
              {icon}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </motion.div>
  );
}
