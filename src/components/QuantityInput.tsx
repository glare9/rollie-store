"use client";

export function QuantityInput({
  value,
  max,
  onChange,
  label = "Quantity",
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label?: string;
}) {
  const clamp = (n: number) => Math.max(1, Math.min(max, Number.isFinite(n) ? n : 1));
  const btn = "w-9 h-9 rounded-full border border-black/15 text-lg leading-none disabled:opacity-30";
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1))} disabled={value <= 1} aria-label="One less">
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
        className="w-12 text-center rounded-md border border-black/15 py-1 bg-white"
        aria-label={label}
      />
      <button type="button" className={btn} onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="One more">
        +
      </button>
    </div>
  );
}
