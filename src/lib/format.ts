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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  }).format(amount);
}

export function formatPKR(amount: number, options: MoneyFormatOptions = {}): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
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