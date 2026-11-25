import { test } from "node:test";
import assert from "node:assert/strict";
import { analyticsFilter, contactState, dateKey, funnelMetrics, lifecycleMetrics, retentionCohorts, startOfDay } from "../src/lib/analytics-math";
import { csvCell, toCsv } from "../src/lib/csv";
import { canEditListing } from "../src/lib/policy";
const day = startOfDay;
test("el embudo deduplica sesiones, excluye contactos sin ficha y no supera la base", () => {
  const views = [{ id: "1", visitId: "a" }, { id: "2", visitId: "a" }, { id: "3", visitId: "b" }, { id: "4", visitId: null }];
  const contacts = [
    { id: "1", visitId: "a", status: "CONFIRMED", events: [{ status: "CONFIRMED", createdAt: day("2026-11-10") }] },
    { id: "2", visitId: "a", status: "INITIATED", events: [] },
    { id: "3", visitId: "unseen", status: "CONFIRMED", events: [{ status: "CONFIRMED", createdAt: day("2026-11-10") }] },
  ];
  const funnel = funnelMetrics(views, contacts, day("2026-11-22"));
  assert.deepEqual(funnel.map(stage => stage.count), [2, 1, 1, 1]);
  assert.equal(funnel[1].overall, 50);
  assert.equal(funnelMetrics([], [], day("2026-11-22"))[0].overall, null);
});
test("los estados históricos usan eventos anteriores al corte, no el estado de hoy", () => {
  const contact = { status: "LOST", events: [{ status: "RESPONDED", createdAt: day("2026-11-01") }, { status: "CONFIRMED", createdAt: day("2026-11-10") }, { status: "LOST", createdAt: day("2026-11-20") }] };
  assert.equal(contactState(contact, day("2026-11-05")), "RESPONDED");
  assert.equal(contactState(contact, day("2026-11-15")), "CONFIRMED");
  assert.equal(contactState(contact, day("2026-11-22")), "LOST");
});
test("churn usa la base inicial, excluye nuevas altas y deduplica cancelaciones", () => {
  const events = [
    { hostId: "a", status: "ACTIVE", monthlyPrice: 100, effectiveAt: day("2026-10-01") },
    { hostId: "b", status: "ACTIVE", monthlyPrice: 200, effectiveAt: day("2026-10-01") },
    { hostId: "a", status: "CANCELED", monthlyPrice: 100, effectiveAt: day("2026-11-03") },
    { hostId: "a", status: "CANCELED", monthlyPrice: 100, effectiveAt: day("2026-11-04") },
    { hostId: "new", status: "ACTIVE", monthlyPrice: 90, effectiveAt: day("2026-11-05") },
    { hostId: "new", status: "CANCELED", monthlyPrice: 90, effectiveAt: day("2026-11-06") },
    { hostId: "a", status: "ACTIVE", monthlyPrice: 150, effectiveAt: day("2026-11-07") },
  ];
  const metrics = lifecycleMetrics(events, day("2026-11-01"), day("2026-11-22"));
  assert.equal(metrics.activeStart, 2); assert.equal(metrics.canceled, 1); assert.equal(metrics.churn, 50);
  assert.equal(metrics.activeEnd, 2); assert.equal(metrics.mrr, 350);
  assert.equal(lifecycleMetrics([], day("2026-11-01"), day("2026-11-22")).churn, null);
});
test("la activación de una prueba no cuenta un alta posterior al corte", () => {
  const events = [{ hostId: "a", status: "TRIAL", monthlyPrice: 0, effectiveAt: day("2026-11-02") }, { hostId: "a", status: "ACTIVE", monthlyPrice: 45, effectiveAt: day("2026-11-20") }];
  assert.equal(lifecycleMetrics(events, day("2026-11-01"), day("2026-11-15")).activationRate, 0);
  assert.equal(lifecycleMetrics(events, day("2026-11-01"), day("2026-11-22")).activationRate, 100);
});
test("cohortes muestran pérdida al cierre y meses futuros como N/D", () => {
  const events = [{ hostId: "a", status: "ACTIVE", monthlyPrice: 89, effectiveAt: day("2026-08-03") }, { hostId: "b", status: "ACTIVE", monthlyPrice: 45, effectiveAt: day("2026-09-07") }, { hostId: "b", status: "CANCELED", monthlyPrice: 45, effectiveAt: day("2026-11-15") }];
  const cohorts = retentionCohorts(events, day("2026-11-22"));
  assert.deepEqual(cohorts[0].months, [100, 100, 100, 100, null, null]);
  assert.deepEqual(cohorts[1].months, [100, 100, 0, null, null, null]);
});
test("filtros respetan días de Bogotá y rechazan fechas inválidas o futuras", () => {
  const now = new Date("2026-11-22T18:00:00Z");
  const filter = analyticsFilter({ desde: "2026-11-01", hasta: "2026-11-01", datos: "reales" }, true, now);
  assert.equal(filter.start.toISOString(), "2026-11-01T05:00:00.000Z");
  assert.equal(filter.end.toISOString(), "2026-11-02T05:00:00.000Z");
  assert.equal(filter.isTest, false);
  assert.ok(analyticsFilter({ desde: "2026-02-30", hasta: "2026-11-22" }, false, now).error);
  assert.ok(analyticsFilter({ hasta: "2026-12-01" }, false, now).error);
  assert.equal(dateKey(new Date("2026-11-22T03:00:00Z")), "2026-11-21");
});
test("CSV neutraliza fórmulas, conserva números y escapa separadores y comillas", () => {
  for (const text of ["=SUM(A1)", "+cmd", "-cmd", "@SUM(A1)", "  =cmd", "\t=cmd", "\uFEFF=cmd"]) assert.ok(csvCell(text).startsWith('"\''));
  assert.equal(csvCell(-12), '"-12"');
  assert.equal(csvCell('Un "nombre"; y\notra línea'), '"Un ""nombre""; y\notra línea"');
  const csv = toCsv(["nombre", "valor"], [["Quibdó", 20]]);
  assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes('"Quibdó";"20"\r\n'));
});
test("cuentas de prueba editan sus ejemplos sin acceder a los ajenos", () => {
  const listing = { hostId: "a", isDemo: true };
  assert.equal(canEditListing({ id: "a", role: "HOST", isTest: true }, listing), true);
  assert.equal(canEditListing({ id: "b", role: "HOST", isTest: true }, listing), false);
  assert.equal(canEditListing({ id: "b", role: "ADMIN", isTest: true }, listing), true);
  assert.equal(canEditListing({ id: "a", role: "HOST" }, listing), false);
});
