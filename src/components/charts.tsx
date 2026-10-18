"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDayKey } from "@/lib/dates";
import { formatEuro, formatNumber } from "@/i18n";

export const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const tooltipStyle = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--fg)" },
  labelStyle: { color: "var(--fg)", fontWeight: 600 },
  itemStyle: { color: "var(--fg)" },
  cursor: { fill: "color-mix(in oklab, var(--primary) 10%, transparent)", stroke: "var(--border)" },
};

const g = (v: unknown) => `${formatNumber(Number(v), 1)} g`;

/** Tageswerte als Linie (Gramm reinen Alkohols pro Tag). */
export function DailyLineChart({ data, height = 240 }: { data: { day: string; grams: number }[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, label: formatDayKey(d.day, "weekday") }));
  return (
    <div style={{ height }} role="img" aria-label="Liniendiagramm: Gramm reinen Alkohols pro Tag">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} width={52} allowDecimals={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [g(v), "Alkohol"]} />
          <Line isAnimationActive={false} type="linear" dataKey="grams" stroke="var(--chart-1)" strokeWidth={2.5} dot={rows.length <= 14} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Balken: aktueller vs. vorheriger Zeitraum bzw. Wochen/Monate. */
export function BucketBarChart({
  data,
  height = 240,
  label,
}: {
  data: { key: string; label: string; grams: number; highlight?: boolean }[];
  height?: number;
  label: string;
}) {
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={8} />
          <YAxis tickLine={false} axisLine={false} width={52} allowDecimals={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [g(v), "Alkohol"]} />
          <Bar isAnimationActive={false} dataKey="grams" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.highlight ? "var(--chart-1)" : "color-mix(in oklab, var(--chart-1) 45%, transparent)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Geschätzter Modellverlauf (‰) mit Markierung "jetzt". */
export function EstimateChart({
  curve,
  now,
  timezone,
  height = 200,
}: {
  curve: { t: string; promille: number }[];
  now?: string;
  timezone: string;
  height?: number;
}) {
  const fmt = new Intl.DateTimeFormat("de-DE", { timeZone: timezone, hour: "2-digit", minute: "2-digit" });
  const rows = curve.map((p) => ({ t: new Date(p.t).getTime(), promille: Math.round(p.promille * 1000) / 1000 }));
  const nowT = now ? new Date(now).getTime() : undefined;
  return (
    <div style={{ height }} role="img" aria-label="Flächendiagramm: geschätzter Modellverlauf in Promille">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 18, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="estimateFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            scale="time"
            tickFormatter={(v) => fmt.format(v)}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatNumber(v, 1)} />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(v) => fmt.format(Number(v)) + " Uhr"}
            formatter={(v) => [`ca. ${formatNumber(Number(v), 2)} ‰`, "Modellwert"]}
          />
          <Area isAnimationActive={false} type="linear" dataKey="promille" stroke="var(--chart-1)" strokeWidth={2} fill="url(#estimateFill)" />
          {nowT && <ReferenceLine x={nowT} stroke="var(--fg-muted)" strokeDasharray="4 4" label={{ value: "jetzt", position: "top", fill: "var(--fg-muted)", fontSize: 11 }} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Kreisdiagramm mit Legende (Kategorien oder Community). */
export function ShareDonut({
  data,
  height = 260,
  label,
}: {
  data: { name: string; value: number }[];
  height?: number;
  label: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie isAnimationActive={false} data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={data.length > 1 ? 2 : 0} stroke="var(--card)" strokeWidth={data.length > 1 ? 2 : 0}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={i < CHART_COLORS.length ? CHART_COLORS[i] : `color-mix(in oklab, ${CHART_COLORS[i % 5]} 55%, var(--fg-muted))`} />
            ))}
          </Pie>
          <Tooltip
            {...tooltipStyle}
            formatter={(v, name) => [`${g(v)} (${total > 0 ? formatNumber((Number(v) / total) * 100, 0) : 0} %)`, String(name)]}
          />
          <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12, color: "var(--fg-muted)" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontales Balkendiagramm (bessere Lesbarkeit für Ranglisten). */
export function RankingBarChart({
  data,
  height = 300,
  unit = "g",
}: {
  data: { name: string; grams: number; highlight?: boolean }[];
  height?: number;
  unit?: "g" | "eur";
}) {
  const fmt = (v: unknown) => (unit === "eur" ? formatEuro(Number(v)) : g(v));
  return (
    <div style={{ height }} role="img" aria-label={unit === "eur" ? "Balkendiagramm: Sparschwein je Teilnehmer" : "Balkendiagramm: Gesamtmenge je Teilnehmer"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmt(v), unit === "eur" ? "Gespart" : "Gesamt"]} />
          <Bar isAnimationActive={false} dataKey="grams" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.highlight ? "var(--chart-2)" : "var(--chart-1)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
