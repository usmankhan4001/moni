"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface BarChartProps {
  data: Array<{
    name: string;
    payoutPkr: number;
  }>;
}

export function OutsourcerPayoutChart({ data }: BarChartProps) {
  if (!data || data.length === 0 || data.every((d) => d.payoutPkr === 0)) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
        No outsourcer payout data pending.
      </div>
    );
  }

  return (
    <div
      className="w-full h-72"
      role="img"
      aria-label="Pending outsourcer payouts by contractor"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(val) => `Rs ${Math.round(val / 1000)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--popover)",
              borderColor: "var(--border)",
              borderRadius: "8px",
              color: "var(--popover-foreground)",
              fontSize: "12px",
            }}
            formatter={(val: number | string | readonly (number | string)[] | undefined) => [
              `Rs ${Number(val || 0).toLocaleString()}`,
              "Due (PKR)",
            ]}
          />
          <Bar dataKey="payoutPkr" name="Payout (PKR)" fill="#D97706" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
