"use client";

import { X } from "@phosphor-icons/react";
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
import { useAppStore, type ChartConfig } from "@/lib/store";
import { Button } from "@/components/ui/button";

const COLORS = [
  "oklch(0.60 0.10 185)",
  "oklch(0.70 0.12 183)",
  "oklch(0.78 0.13 182)",
  "oklch(0.85 0.13 181)",
  "oklch(0.51 0.09 186)",
  "oklch(0.58 0.22 27)",
];

function ExpandedChart({ chart }: { chart: ChartConfig }) {
  const chartData = chart.xLabels.map((label, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const point: Record<string, any> = { name: label };
    chart.series.forEach((s) => {
      point[s.name] = s.values[i] ?? 0;
    });
    return point;
  });

  const renderChart = () => {
    switch (chart.type) {
      case "bar":
        return (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chart.series.map((s, i) => (
              <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chart.series.map((s, i) => (
              <Line key={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={{ r: 4 }} />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {chart.series.map((s, i) => (
              <Area key={s.name} dataKey={s.name} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
            ))}
          </AreaChart>
        );
      case "pie": {
        const pieData = chart.xLabels.map((label, i) => ({
          name: label,
          value: chart.series[0]?.values[i] ?? 0,
        }));
        return (
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              outerRadius={140}
              dataKey="value"
              label={((props: { name?: string; percent?: number }) =>
                `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as never}
              fontSize={12}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        );
      }
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
}

export default function ChartModal() {
  const { expandedChartId, setExpandedChart, charts } = useAppStore();

  if (!expandedChartId) return null;

  const chart = charts.find((c) => c.id === expandedChartId);
  if (!chart) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={() => setExpandedChart(null)}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-[90vw] max-w-[900px] h-[70vh] max-h-[560px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 className="text-sm font-medium">{chart.title}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpandedChart(null)}
          >
            <X weight="bold" />
          </Button>
        </div>
        {/* Chart area */}
        <div className="flex-1 p-5 min-h-0">
          <ExpandedChart chart={chart} />
        </div>
      </div>
    </div>
  );
}
