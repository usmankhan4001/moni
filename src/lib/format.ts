export interface MoneyFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

interface DateFormatOptions {
  dateStyle?: "short" | "medium" | "long" | "full";
  timeStyle?: "short" | "medium";
  timeZone?: string;
}

export function formatUSD(amount: number, options: MoneyFormatOptions = {}): string {
  const min = options.minimumFractionDigits ?? 2;
  const max = options.maximumFractionDigits ?? 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Math.min(min, max),
    maximumFractionDigits: Math.max(min, max),
  }).format(amount);
}

export function formatPKR(amount: number, options: MoneyFormatOptions = {}): string {
  const min = options.minimumFractionDigits ?? 0;
  const max = options.maximumFractionDigits ?? 0;
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: Math.min(min, max),
    maximumFractionDigits: Math.max(min, max),
  }).format(amount);
}

export function formatDate(
  input: string | number | Date,
  options: DateFormatOptions = {},
): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: options.dateStyle ?? "medium",
    ...(options.timeStyle ? { timeStyle: options.timeStyle } : {}),
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  }).format(new Date(input));
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}