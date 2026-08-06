"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/app/actions";
import { runAction } from "@/lib/action";

interface SettingsFormProps {
  settings: {
    exchange_rate: number;
    pay_percentage: number;
    default_tax_rate: number;
    default_transfer_fee_rate: number;
  };
  onDone?: () => void;
}

function NumberField({
  id,
  label,
  hint,
  value,
  min = 0,
  max,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  min?: number;
  max?: number;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        {...(max !== undefined ? { max } : {})}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export function SettingsForm({ settings, onDone }: SettingsFormProps) {
  const router = useRouter();
  const [exchangeRate, setExchangeRate] = useState(String(settings.exchange_rate));
  const [payPercentage, setPayPercentage] = useState(String(settings.pay_percentage));
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(settings.default_tax_rate));
  const [defaultTransferFeeRate, setDefaultTransferFeeRate] = useState(
    String(settings.default_transfer_fee_rate),
  );
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const result = await runAction(updateSettings, {
      exchange_rate: Number(exchangeRate),
      pay_percentage: Number(payPercentage),
      default_tax_rate: Number(defaultTaxRate),
      default_transfer_fee_rate: Number(defaultTransferFeeRate),
    });
    setPending(false);
    if (result?.ok) {
      router.refresh();
      onDone?.();
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>Workspace defaults</CardTitle>
          <CardDescription>
            Used when creating outsourcers and generating monthly payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            id="settings-exchange-rate"
            label="Exchange rate"
            hint="USD → PKR, e.g. 284.5"
            value={exchangeRate}
            onChange={setExchangeRate}
          />
          <NumberField
            id="settings-pay-percentage"
            label="Pay percentage (%)"
            hint="Share of net you pay the outsourcer"
            value={payPercentage}
            onChange={setPayPercentage}
          />
          <NumberField
            id="settings-default-tax"
            label="Default tax rate (%)"
            hint="Applied to gross for new outsourcers"
            value={defaultTaxRate}
            onChange={setDefaultTaxRate}
          />
          <NumberField
            id="settings-default-fee"
            label="Default transfer fee (%)"
            hint="Applied to net for new outsourcers"
            value={defaultTransferFeeRate}
            onChange={setDefaultTransferFeeRate}
          />
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}