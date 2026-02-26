"use client";

import { ArrowsOut } from "@phosphor-icons/react";
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
import { useAppStore } from "@/lib/store";

interface ChartData {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  xLabels: string[];
  series: { name: string; values: number[] }[];
  chartId?: string;
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
  const { setExpandedChart } = useAppStore();

  if (!data || !data.xLabels || !data.series) return null;

  const chartData = data.xLabels.map((label, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const point: Record<string, any> = { name: label };
    data.series.forEach((s) => {
      point[s.name] = s.values[i] ?? 0;
    });
    return point;
  });

  const handleExpand = () => {
    if (data.chartId) {
      setExpandedChart(data.chartId);
    }
  };

  const renderChart = () => {
    switch (data.type) {
      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {data.series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {data.series.map((s, i) => (
              <Line key={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
            <YAxis tick={{ fontSize: 9 }} />
            <Tooltip contentStyle={{ fontSize: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
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
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={55}
              dataKey="value"
              label={((props: { name?: string; percent?: number }) =>
                `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as never}
              labelLine={false}
              fontSize={8}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 10 }} />
          </PieChart>
        );
      }
    }
  };

  return (
    <div className="my-2 rounded-md border border-border bg-background/50 p-2 relative">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[0.625rem] font-medium">{data.title}</p>
        {data.chartId && (
          <button
            onClick={handleExpand}
            title="Expand chart"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[0.5625rem] font-medium transition-colors"
          >
            <ArrowsOut weight="bold" className="size-3" />
            Expand
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={170}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
