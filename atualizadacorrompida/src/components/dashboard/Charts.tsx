import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--foreground)",
  boxShadow: "var(--shadow-card)",
};

interface BarProps {
  data: { grupo: string; membros: number; visitantes: number }[];
}

export function GroupsBarChart({ data }: BarProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Relatório dos Grupos</h3>
          <p className="text-xs text-muted-foreground">Membros e visitantes por grupo familiar</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--brand-blue)]" />Membros</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--brand-green)]" />Visitantes</span>
        </div>
      </div>
      <div className="mt-4 h-72 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados cadastrados
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={6}>
              <defs>
                <linearGradient id="gMembros" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-blue-glow)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--brand-blue)" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="gVisitantes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-green-glow)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--brand-green)" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="grupo" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--accent)", opacity: 0.3 }} contentStyle={tooltipStyle} />
              <Bar dataKey="membros" radius={[8, 8, 0, 0]} name="Membros" fill="url(#gMembros)" />
              <Bar dataKey="visitantes" radius={[8, 8, 0, 0]} name="Visitantes" fill="url(#gVisitantes)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface PieProps { membros: number; visitantes: number; }

export function PresencePieChart({ membros, visitantes }: PieProps) {
  const total = membros + visitantes;
  const data = [
    { name: "Membros", value: membros, color: "var(--brand-blue)" },
    { name: "Visitantes", value: visitantes, color: "var(--brand-green)" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)] h-full">
      <h3 className="text-base sm:text-lg font-semibold text-foreground">Membros vs Visitantes</h3>
      <p className="text-xs text-muted-foreground">Distribuição da presença</p>
      <div className="mt-4 h-72 w-full relative">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem dados cadastrados
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="60%"
                  outerRadius="85%"
                  stroke="var(--card)"
                  strokeWidth={4}
                  paddingAngle={2}
                >
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ ...tooltipStyle, color: "#FFFFFF" }} itemStyle={{ color: "#FFFFFF" }} labelStyle={{ color: "#FFFFFF" }} />
                <Legend iconType="circle" wrapperStyle={{ color: "#FFFFFF", fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none -mt-6">
              <span className="text-3xl font-bold text-foreground">{total}</span>
              <span className="text-xs text-muted-foreground">Pessoas</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface AreaProps {
  data: { grupo: string; ofertas: number }[];
}

export function OffersAreaChart({ data }: AreaProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Ofertas por Grupo</h3>
          <p className="text-xs text-muted-foreground">Distribuição financeira</p>
        </div>
      </div>
      <div className="mt-4 h-64 w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sem ofertas registradas
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gOfertas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-amber-glow)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="var(--brand-amber)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="grupo" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="ofertas"
                stroke="var(--brand-amber-glow)"
                strokeWidth={2.5}
                fill="url(#gOfertas)"
                name="Ofertas"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

interface MonthlyProps {
  data: { mes: string; membros: number; visitantes: number; ofertas: number }[];
}

export function MonthlyEvolutionChart({ data }: MonthlyProps) {
  const empty = data.every((d) => d.membros === 0 && d.visitantes === 0 && d.ofertas === 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Evolução Mensal</h3>
          <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--brand-blue)]" />Membros</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[color:var(--brand-green)]" />Visitantes</span>
        </div>
      </div>
      <div className="mt-4 h-72 w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem histórico ainda</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--foreground)" }} />
              <Line type="monotone" dataKey="membros" stroke="var(--brand-blue-glow)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="visitantes" stroke="var(--brand-green-glow)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
