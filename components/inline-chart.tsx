"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  Legend,
} from "recharts";

interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  xLabels: string[];
  series: { name: string; values: number[] }[];
}

const COLORS = [
  "oklch(0.60 0.10 185)",
  "oklch(0.70 0.12 183)",
  "oklch(0.78 0.13 182)",
  "oklch(0.85 0.13 181)",
  "oklch(0.51 0.09 186)",
  "oklch(0.58 0.22 27)",
];

export default function InlineChart({ data }: { data: ChartData }) {
  if (!data || !data.xLabels || !data.series) return null;

  const chartData = data.xLabels.map((label, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const point: Record<string, any> = { name: label };
    data.series.forEach((s) => {
      point[s.name] = s.values[i] ?? 0;
    });
    return point;
  });

  const renderChart = () => {
    switch (data.type) {
      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {data.series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {data.series.map((s, i) => (
              <Line key={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {data.series.map((s, i) => (
              <Area key={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.2} />
            ))}
          </AreaChart>
        );
      case "pie": {
        const pieData = data.xLabels.map((label, i) => ({
          name: label,
          value: data.series[0]?.values[i] ?? 0,
        }));
        return (
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={((props: { name?: string; percent?: number }) => `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as never} labelLine={false} fontSize={9}>
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11 }} />
          </PieChart>
        );
      }
    }
  };

  return (
    <div className="my-2 rounded-md border border-border bg-background/50 p-2">
      <p className="text-[0.625rem] font-medium mb-1 text-center">{data.title}</p>
      <ResponsiveContainer width="100%" height={180}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
