"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DonutChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = ["#D97706", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"];

export function IncomeDistributionChart({ data }: DonutChartProps) {
  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-light border border-dashed border-border rounded-lg">
        No income distribution data.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#1B2340",
              borderColor: "#1B2340",
              borderRadius: "8px",
              color: "#FDFCFA",
              fontSize: "12px",
            }}
            formatter={(val: any) => [
              `$${Number(val || 0).toLocaleString()}`,
              "Amount",
            ]}
          />
          <Legend
            iconType="circle"
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
