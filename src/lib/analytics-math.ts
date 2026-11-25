export const DAY = 86_400_000;
export const leadLabels: Record<string, string> = { INITIATED: "Sin seguimiento", RESPONDED: "Respondida", CONFIRMED: "Estadía reportada", LOST: "No concretada" };
export const membershipLabels: Record<string, string> = { TRIAL: "En prueba", ACTIVE: "Activo", PAST_DUE: "En mora", CANCELED: "Cancelado" };
export const lossReasons = ["Precio", "Sin disponibilidad", "No respondió", "No se ajusta a lo buscado", "Otro"];
export type AnalyticsParams = Record<string, string | string[] | undefined>;
const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" });
export function dateKey(date: Date) {
  const parts = dayFormatter.formatToParts(date);
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}-${parts.find(p => p.type === "day")!.value}`;
}
export function startOfDay(day: string) { return new Date(`${day}T00:00:00-05:00`); }
function validDay(day: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(startOfDay(day).getTime()) && dateKey(startOfDay(day)) === day;
}
export function analyticsFilter(params: AnalyticsParams, testDefault = false, now = new Date()) {
  const today = dateKey(now);
  const defaultFrom = dateKey(new Date(startOfDay(today).getTime() - 29 * DAY));
  const scalar = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  let from = scalar("desde") || defaultFrom;
  let to = scalar("hasta") || today;
  let error = "";
  if (!validDay(from) || !validDay(to) || from > to || to > today || startOfDay(to).getTime() - startOfDay(from).getTime() >= 366 * DAY) {
    error = "Elige un período válido de hasta 366 días, sin fechas futuras.";
    from = defaultFrom; to = today;
  }
  const scope = scalar("datos") === "prueba" ? "prueba" : scalar("datos") === "reales" ? "reales" : testDefault ? "prueba" : "reales";
  const start = startOfDay(from);
  const end = new Date(startOfDay(to).getTime() + DAY);
  const cutoff = new Date(Math.min(end.getTime(), now.getTime()));
  return { from, to, start, end, cutoff, scope, isTest: scope === "prueba", error };
}
export type AnalyticsFilter = ReturnType<typeof analyticsFilter>;
export function filterQuery(filter: AnalyticsFilter) {
  return new URLSearchParams({ desde: filter.from, hasta: filter.to, datos: filter.scope }).toString();
}
export function percentage(part: number, total: number) { return total > 0 ? part / total * 100 : null; }
export function showPercent(value: number | null) { return value === null ? "N/D" : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)} %`; }
export type FunnelView = { id: string; visitId: string | null };
export type FunnelContact = { id: string; visitId: string | null; status: string; events: { status: string; createdAt: Date }[] };
export function contactState(contact: Pick<FunnelContact, "status" | "events">, cutoff: Date) {
  const events = contact.events.filter(event => event.createdAt < cutoff).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return events.at(-1)?.status ?? "INITIATED";
}
export function funnelMetrics(views: FunnelView[], contacts: FunnelContact[], cutoff: Date) {
  const viewed = new Set(views.flatMap(view => view.visitId ? [view.visitId] : []));
  const contacted = new Set<string>(); const responded = new Set<string>(); const confirmed = new Set<string>();
  for (const contact of contacts) {
    if (!contact.visitId || !viewed.has(contact.visitId)) continue;
    contacted.add(contact.visitId);
    const history = contact.events.filter(event => event.createdAt < cutoff);
    if (history.some(event => ["RESPONDED", "CONFIRMED"].includes(event.status))) responded.add(contact.visitId);
    if (contactState(contact, cutoff) === "CONFIRMED") confirmed.add(contact.visitId);
  }
  const counts = [viewed.size, contacted.size, responded.size, confirmed.size];
  const labels = ["Sesiones con ficha vista", "Sesiones con contacto iniciado", "Sesiones con respuesta registrada", "Sesiones con estadía reportada"];
  return counts.map((count, index) => ({ label: labels[index], count, overall: percentage(count, counts[0]), step: index ? percentage(count, counts[index - 1]) : null }));
}
export type LifecycleEvent = { hostId: string; status: string; monthlyPrice: number; effectiveAt: Date };
export function lifecycleSnapshot(events: LifecycleEvent[], cutoff: Date) {
  const state = new Map<string, LifecycleEvent>();
  [...events].sort((a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()).forEach(event => { if (event.effectiveAt < cutoff) state.set(event.hostId, event); });
  return state;
}
export function lifecycleMetrics(events: LifecycleEvent[], start: Date, cutoff: Date) {
  const before = lifecycleSnapshot(events, start);
  const after = lifecycleSnapshot(events, cutoff);
  const activeStart = [...before.values()].filter(event => event.status === "ACTIVE");
  const baseline = new Set(activeStart.map(event => event.hostId));
  const lost = new Set(events.filter(event => baseline.has(event.hostId) && event.status === "CANCELED" && event.effectiveAt >= start && event.effectiveAt < cutoff).map(event => event.hostId));
  const activeEnd = [...after.values()].filter(event => event.status === "ACTIVE");
  const firstTrial = new Map<string, Date>(); const firstActive = new Map<string, Date>();
  [...events].sort((a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()).forEach(event => {
    if (event.status === "TRIAL" && !firstTrial.has(event.hostId)) firstTrial.set(event.hostId, event.effectiveAt);
    if (event.status === "ACTIVE" && !firstActive.has(event.hostId)) firstActive.set(event.hostId, event.effectiveAt);
  });
  const trials = [...firstTrial].filter(([, date]) => date >= start && date < cutoff);
  const converted = trials.filter(([id, date]) => { const activation = firstActive.get(id); return activation && activation >= date && activation < cutoff; }).length;
  return { activeStart: activeStart.length, canceled: lost.size, churn: percentage(lost.size, activeStart.length), activeEnd: activeEnd.length,
    mrr: activeEnd.reduce((sum, event) => sum + event.monthlyPrice, 0), trials: trials.length, converted,
    activationRate: percentage(converted, trials.length), newActivations: [...firstActive.values()].filter(date => date >= start && date < cutoff).length };
}
function monthStart(year: number, month: number) { return new Date(Date.UTC(year, month, 1, 5)); }
export function retentionCohorts(events: LifecycleEvent[], cutoff: Date) {
  const first = new Map<string, Date>();
  [...events].sort((a, b) => a.effectiveAt.getTime() - b.effectiveAt.getTime()).forEach(event => { if (event.status === "ACTIVE" && event.effectiveAt < cutoff && !first.has(event.hostId)) first.set(event.hostId, event.effectiveAt); });
  const cohorts = [...new Set([...first.values()].map(date => dateKey(date).slice(0, 7)))].sort().slice(-6);
  return cohorts.map(month => {
    const [year, number] = month.split("-").map(Number);
    const ids = [...first].filter(([, date]) => dateKey(date).startsWith(month)).map(([id]) => id);
    return { month, size: ids.length, months: Array.from({ length: 6 }, (_, index) => {
      const start = monthStart(year, number - 1 + index);
      if (start >= cutoff) return null;
      const end = new Date(Math.min(monthStart(year, number + index).getTime(), cutoff.getTime()));
      const snapshot = lifecycleSnapshot(events, end);
      return percentage(ids.filter(id => snapshot.get(id)?.status === "ACTIVE").length, ids.length);
    }) };
  });
}
