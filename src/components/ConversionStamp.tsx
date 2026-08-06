"use client";

interface ConversionStampProps {
  usdAmount: number;
  exchangeRate: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ConversionStamp({
  usdAmount,
  exchangeRate,
  size = "md",
  showLabel = true,
}: ConversionStampProps) {
  const pkrAmount = usdAmount * exchangeRate;

  const formatUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatPKR = (amount: number) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const sizeClasses = {
    sm: "w-20 h-20 text-[10px]",
    md: "w-28 h-28 text-xs",
    lg: "w-36 h-36 text-sm",
  };

  return (
    <div className="stamp-animate inline-flex flex-col items-center gap-2" suppressHydrationWarning>
      <div
        className={`
          ${sizeClasses[size]}
          rounded-full border-2 border-primary
          flex flex-col items-center justify-center
          bg-primary/5 relative
          rotate-[-8deg]
        `}
      >
        {/* Double border effect */}
        <div className="absolute inset-1 rounded-full border border-primary/40" />

        {/* Content */}
        <div className="relative z-10 text-center" suppressHydrationWarning>
          <p className="font-mono font-semibold text-primary leading-none" suppressHydrationWarning>
            {formatPKR(pkrAmount)}
          </p>
          <p className="text-[8px] uppercase tracking-wider text-primary mt-1 opacity-70" suppressHydrationWarning>
            @ {exchangeRate.toFixed(2)}
          </p>
        </div>
      </div>

      {showLabel && (
        <div className="text-center" suppressHydrationWarning>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground" suppressHydrationWarning>
            Converted from {formatUSD(usdAmount)}
          </p>
        </div>
      )}
    </div>
  );
}
