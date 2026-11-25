export function todayInBogota(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const stamp = Date.parse(value + "T00:00:00Z");
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : NaN;
}

export function stayQuote(arrival: string, departure: string, people: string, capacity: number, priceNight: number | null, today: string) {
  const empty = { nights: 0, subtotal: null };
  if (!/^\d+$/.test(people) || Number(people) < 1 || Number(people) > capacity) return { ...empty, error: `Selecciona entre 1 y ${capacity} huéspedes.` };
  if (!arrival && !departure) return { ...empty, error: "" };
  const start = day(arrival);
  const end = day(departure);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { ...empty, error: "Selecciona las fechas de entrada y salida." };
  if (arrival < today) return { ...empty, error: "La entrada debe ser hoy o una fecha futura." };
  if (end <= start) return { ...empty, error: "La salida debe ser posterior a la entrada." };
  const nights = (end - start) / 86400000;
  const subtotal = priceNight !== null && Number.isSafeInteger(priceNight) && priceNight > 0 ? nights * priceNight : null;
  return { nights, subtotal, error: "" };
}