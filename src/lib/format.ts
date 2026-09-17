export function fmtKcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

export function fmtNum(value: number, decimals = 0): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtSigned(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}

export function fmtDateLong(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function fmtDateShort(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  });
}
