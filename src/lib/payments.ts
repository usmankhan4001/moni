export interface PaymentCalculationInput {
  taxRate: number;
  transferFeeRate: number;
  exchangeRate: number;
  payPercentage: number;
}

export interface PaymentBreakdown {
  grossUsd: number;
  taxUsd: number;
  transferFeeUsd: number;
  netUsd: number;
  netPkr: number;
  payAmountPkr: number;
}

// Money is rounded to integer cents at every boundary so float drift can
// never accumulate across the gross -> tax -> fee -> net -> PKR chain.
export function toCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function roundMoney(value: number): number {
  return fromCents(toCents(value));
}

export function calcTax(grossUsd: number, taxRate: number): number {
  return roundMoney(grossUsd * (taxRate / 100));
}

export function calcTransferFee(grossUsd: number, taxRate: number, feeRate: number): number {
  const netAfterTax = grossUsd - calcTax(grossUsd, taxRate);
  return roundMoney(netAfterTax * (feeRate / 100));
}

export function calcNetUsd(grossUsd: number, taxRate: number, feeRate: number): number {
  return roundMoney(
    grossUsd - calcTax(grossUsd, taxRate) - calcTransferFee(grossUsd, taxRate, feeRate),
  );
}

export function calcToPkr(usd: number, exchangeRate: number): number {
  return roundMoney(usd * exchangeRate);
}

// Order of deductions: tax on gross, transfer fee on net-after-tax, then the
// owner's pay share applied to the final PKR net.
export function calculateOutsourcerPayment(
  grossUsd: number,
  { taxRate, transferFeeRate, exchangeRate, payPercentage }: PaymentCalculationInput,
): PaymentBreakdown {
  if (grossUsd < 0) {
    throw new RangeError("grossUsd must be non-negative");
  }
  if (taxRate < 0 || taxRate > 100) {
    throw new RangeError("taxRate must be between 0 and 100");
  }
  if (transferFeeRate < 0 || transferFeeRate > 100) {
    throw new RangeError("transferFeeRate must be between 0 and 100");
  }
  if (exchangeRate <= 0) {
    throw new RangeError("exchangeRate must be positive");
  }
  if (payPercentage < 0 || payPercentage > 100) {
    throw new RangeError("payPercentage must be between 0 and 100");
  }

  const taxUsd = calcTax(grossUsd, taxRate);
  const transferFeeUsd = calcTransferFee(grossUsd, taxRate, transferFeeRate);
  const netUsd = roundMoney(grossUsd - taxUsd - transferFeeUsd);
  const netPkr = calcToPkr(netUsd, exchangeRate);
  const payAmountPkr = roundMoney(netPkr * (payPercentage / 100));

  return { grossUsd, taxUsd, transferFeeUsd, netUsd, netPkr, payAmountPkr };
}