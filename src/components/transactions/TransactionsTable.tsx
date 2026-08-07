"use client";

import { useState } from "react";
import type { TransactionWithRelations } from "@/lib/data";
import { formatDate, formatPKR, formatUSD } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionRowActions } from "@/components/transactions/TransactionRowActions";

type Filter = "all" | "income" | "expense" | "fee";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
  { value: "fee", label: "Fees" },
];

const typeChip = {
  income: { bg: "bg-emerald-600/10", text: "text-emerald-600", label: "Income" },
  expense: { bg: "bg-destructive/10", text: "text-destructive", label: "Expense" },
  fee: { bg: "bg-muted/10", text: "text-muted-foreground", label: "Fee" },
} as const;

export function TransactionsTable({
  transactions,
}: {
  transactions: TransactionWithRelations[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const rows =
    filter === "all"
      ? transactions
      : transactions.filter((transaction) => transaction.type === filter);

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList variant="line">
          {FILTERS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-display text-lg text-foreground">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              No {filter === "all" ? "transactions" : `${filter} transactions`}{" "}
              recorded.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden md:table-cell">Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((transaction) => {
                const chip = typeChip[transaction.type];
                const amount =
                  transaction.currency === "USD"
                    ? formatUSD(Math.abs(transaction.amount))
                    : formatPKR(Math.abs(transaction.amount));
                const isIncome = transaction.type === "income";
                return (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(transaction.transaction_date, {
                        dateStyle: "medium",
                      })}
                    </TableCell>
                    <TableCell className="max-w-0">
                      <p className="truncate font-medium text-foreground">
                        {transaction.description}
                      </p>
                      {transaction.project_title && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {transaction.project_title}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest font-medium ${chip.bg} ${chip.text}`}
                      >
                        {chip.label}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {transaction.account_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-mono text-sm font-medium tabular-nums ${
                          isIncome ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {isIncome ? "+" : "−"}
                        {amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <TransactionRowActions
                        id={transaction.id}
                        description={transaction.description}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}