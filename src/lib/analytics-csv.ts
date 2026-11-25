import "server-only";
import { getUser } from "./auth";
import { getAnalytics } from "./analytics";
import { analyticsFilter, contactState, lifecycleSnapshot, type AnalyticsParams } from "./analytics-math";
import { toCsv } from "./csv";

export const datasets = [
  ["resumen", "Resumen de indicadores"], ["embudo", "Embudo por sesiones"], ["anuncios", "Rendimiento por anuncio"],
  ["contactos", "Contactos y estado al corte"], ["eventos", "Historial de contactos"], ["vistas", "Vistas de fichas"],
  ["diario", "Serie diaria"], ["anfitriones", "Anfitriones y planes"], ["planes", "Historial de planes"], ["cohortes", "Retención por cohortes"],
] as const;
export async function exportAnalytics(request: Request, dataset: string, hostOnly = false) {
  const user = await getUser();
  if (!user) return new Response("Inicia sesión para descargar los datos.", { status: 401 });
  if (user.role === "GUEST") return new Response("Acceso restringido.", { status: 403 });
  if (!hostOnly && user.role !== "ADMIN") return new Response("Acceso exclusivo de administración.", { status: 403 });
  if (!datasets.some(([key]) => key === dataset) || (hostOnly && !["resumen", "anuncios", "contactos", "eventos", "diario"].includes(dataset))) return new Response("Exportación no disponible.", { status: 404 });
  const params: AnalyticsParams = Object.fromEntries(new URL(request.url).searchParams);
  if (hostOnly) params.datos = user.isTest ? "prueba" : "reales";
  const filter = analyticsFilter(params, user.isTest);
  if (filter.error) return new Response(filter.error, { status: 400 });
  const report = await getAnalytics(filter, hostOnly ? user.id : undefined);
  const scope = filter.isTest ? "PRUEBA / SIMULADO" : "REAL";
  const decimal = (value: number | null) => value === null ? "" : new Intl.NumberFormat("es-CO", { useGrouping: false, maximumFractionDigits: 6 }).format(value);
  let headers: string[] = [];
  let rows: unknown[][] = [];
  if (dataset === "resumen") {
    headers = ["datos", "desde_bogota", "hasta_bogota_inclusive", "corte_utc", "indicador", "valor", "unidad", "definicion"];
    const metrics = [
      ["vistas_fichas", report.views.length, "eventos", "Vistas registradas en el período; una por sesión y anuncio"],
      ["sesiones_con_ficha", report.funnel[0].count, "sesiones", "Sesiones identificadas con al menos una ficha vista"],
      ["contactos_iniciados", report.contacts.length, "clics", "Aperturas del contacto; no implica mensaje ni reserva"],
      ["conversion_ficha_contacto", decimal(report.funnel[1].overall), "%", "Sesiones con ficha y contacto / sesiones con ficha en el período"],
      ["conversion_ficha_estadia_reportada", decimal(report.funnel[3].overall), "%", "Sesiones con estadía reportada vigente al corte / sesiones con ficha"],
      ["activos_inicio", report.lifecycle.activeStart, "anfitriones", "Plan activo inmediatamente antes del inicio"],
      ["bajas_base_inicial", report.lifecycle.canceled, "anfitriones", "Anfitriones de la base activa inicial con cancelación en el período"],
      ["churn_anfitriones", decimal(report.lifecycle.churn), "%", "Bajas de la base inicial / anfitriones activos al inicio; vacío sin base"],
      ["activos_corte", report.lifecycle.activeEnd, "anfitriones", "Último estado del plan ACTIVE al corte"],
      ["mrr_contratado_manual", report.lifecycle.mrr, "COP/mes", "Suma de tarifas mensuales de planes activos registrados; no es recaudo"],
      ["conversion_prueba_activo", decimal(report.lifecycle.activationRate), "%", "Primeras pruebas iniciadas en el período que se activaron antes del corte / primeras pruebas del período"],
    ];
    rows = metrics.map(metric => [scope, filter.from, filter.to, filter.cutoff, ...metric]);
  } else if (dataset === "embudo") {
    headers = ["datos", "desde_bogota", "hasta_bogota", "etapa", "sesiones", "porcentaje_base", "porcentaje_etapa_anterior"];
    rows = report.funnel.map(stage => [scope, filter.from, filter.to, stage.label, stage.count, decimal(stage.overall), decimal(stage.step)]);
  } else if (dataset === "anuncios") {
    headers = ["datos", "anuncio_id", "titulo", "anfitrion_id", "barrio", "tipo", "estado_actual", "tarifa_noche_cop", "vistas_periodo", "sesiones_ficha", "contactos_periodo", "sesiones_contacto", "conversion_ficha_contacto_pct", "estadias_reportadas", "actualizado_utc"];
    rows = report.rows.map(row => [scope, row.listing.id, row.listing.title, row.listing.hostId, row.listing.district, row.listing.type, row.listing.status, row.listing.priceNight, row.views, row.sessions, row.contacts, row.contactedSessions, decimal(row.conversion), row.confirmed, row.listing.updatedAt]);
  } else if (dataset === "contactos") {
    headers = ["datos", "contacto_id", "anuncio_id", "titulo", "anfitrion_id", "sesion_id", "origen", "iniciado_utc", "estado_al_corte", "ultimo_motivo", "ultima_nota"];
    rows = report.contacts.map(contact => [scope, contact.id, contact.listingId, contact.listing.title, contact.listing.hostId, contact.visitId, contact.visit?.source ?? "sin atribución", contact.createdAt, contactState(contact, filter.cutoff), contact.events.at(-1)?.lossReason, contact.events.at(-1)?.note]);
  } else if (dataset === "eventos") {
    headers = ["datos", "contacto_id", "anuncio_id", "evento_id", "estado", "motivo", "nota", "registrado_utc", "actor_id"];
    rows = report.contacts.flatMap(contact => contact.events.map(event => [scope, contact.id, contact.listingId, event.id, event.status, event.lossReason, event.note, event.createdAt, event.actorId]));
  } else if (dataset === "vistas") {
    headers = ["datos", "vista_id", "anuncio_id", "sesion_id", "origen", "registrada_utc"];
    rows = report.views.map(view => [scope, view.id, view.listingId, view.visitId, view.visit?.source ?? "sin atribución", view.createdAt]);
  } else if (dataset === "diario") {
    headers = ["datos", "dia_bogota", "vistas", "sesiones_ficha", "contactos_iniciados"];
    rows = report.daily.map(day => [scope, day.day, day.views, day.sessions, day.contacts]);
  } else if (dataset === "anfitriones") {
    headers = ["datos", "anfitrion_id", "nombre", "correo", "alta_utc", "estado_plan_al_corte", "plan_al_corte", "tarifa_mensual_cop"];
    const snapshot = lifecycleSnapshot(report.memberships, filter.cutoff);
    rows = report.hosts.map(host => { const plan = snapshot.get(host.id); return [scope, host.id, host.name, host.email, host.createdAt, plan?.status ?? "SIN PLAN", report.memberships.filter(event => event.hostId === host.id).at(-1)?.plan ?? "", plan?.monthlyPrice ?? ""]; });
  } else if (dataset === "planes") {
    headers = ["datos", "evento_id", "anfitrion_id", "estado", "plan", "tarifa_mensual_cop", "efecto_utc", "registrado_utc", "nota", "actor_id"];
    rows = report.memberships.map(event => [scope, event.id, event.hostId, event.status, event.plan, event.monthlyPrice, event.effectiveAt, event.createdAt, event.note, event.actorId]);
  } else if (dataset === "cohortes") {
    headers = ["datos", "mes_primera_activacion", "anfitriones_cohorte", "M0_pct", "M1_pct", "M2_pct", "M3_pct", "M4_pct", "M5_pct", "corte_utc"];
    rows = report.cohorts.map(cohort => [scope, cohort.month, cohort.size, ...cohort.months.map(decimal), filter.cutoff]);
  }
  return new Response(toCsv(headers, rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="quedo-${dataset}-${filter.scope}-${filter.from}-${filter.to}.csv"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
