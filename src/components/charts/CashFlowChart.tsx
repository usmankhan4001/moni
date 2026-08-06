"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CashFlowChartProps {
  data: Array<{
    month: string;
    income: number;
    expenses: number;
    net: number;
  }>;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-light border border-dashed border-border rounded-lg">
        No transaction history available yet.
      </div>
    );
  }

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1B2340",
              borderColor: "#1B2340",
              borderRadius: "8px",
              color: "#FDFCFA",
              fontSize: "12px",
            }}
            formatter={(value: any) => [
              `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
            ]}
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Income (USD)"
            stroke="#10B981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#incomeGrad)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses (USD)"
            stroke="#EF4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#expenseGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
