import { test } from "node:test";
import assert from "node:assert/strict";
import { canContactListing, canEditListing } from "../src/lib/policy";
import { registrationSchema, listingSchema, validatePhoto, normalizeSlug, parseConsultation } from "../src/lib/validation";
import { hashPassword, verifyPassword } from "../src/lib/password";

test("un anfitrión no edita anuncios ajenos y los ejemplos exigen modo de prueba", () => {
  assert.equal(canEditListing({ id: "a", role: "HOST" }, { hostId: "b", isDemo: false }), false);
  assert.equal(canEditListing({ id: "a", role: "HOST" }, { hostId: "a", isDemo: false }), true);
  assert.equal(canEditListing({ id: "a", role: "ADMIN" }, { hostId: "b", isDemo: false }), true);
  assert.equal(canEditListing({ id: "a", role: "ADMIN" }, { hostId: "b", isDemo: true }), false);
});
test("contacto comercial exige anuncio real, publicado y teléfono válido", () => {
  assert.equal(canContactListing({ status: "PUBLISHED", isDemo: false, whatsapp: "573001234567" }), true);
  for (const state of ["PENDING", "PAUSED", "REJECTED", "DRAFT"]) assert.equal(canContactListing({ status: state, isDemo: false, whatsapp: "573001234567" }), false);
  assert.equal(canContactListing({ status: "PUBLISHED", isDemo: true, whatsapp: "573001234567" }), false);
  assert.equal(canContactListing({ status: "PUBLISHED", isDemo: false, whatsapp: null }), false);
  assert.equal(canContactListing({ status: "PUBLISHED", isDemo: false, whatsapp: "javascript:alert(1)" }), false);
});
test("registro ignora intentos de elevar el rol y exige consentimiento", () => {
  const data = { name: "Prueba", email: "PRUEBA@example.invalid", password: "a-long-test-password", consent: "on", role: "ADMIN" };
  const parsed = registrationSchema.parse(data);
  assert.equal("role" in parsed, false);
  assert.equal(parsed.email, "prueba@example.invalid");
  assert.equal(registrationSchema.safeParse({ ...data, consent: undefined }).success, false);
});
test("contraseñas usan sal independiente y rechazan contraseña incorrecta", async () => {
  const first = await hashPassword("a-long-test-password");
  const second = await hashPassword("a-long-test-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("a-long-test-password", first), true);
  assert.equal(await verifyPassword("incorrect-password", first), false);
});
test("validación rechaza contenido activo disfrazado de fotografía", () => {
  assert.equal(validatePhoto(new TextEncoder().encode('<svg onload="alert(1)"></svg>')), null);
  assert.equal(validatePhoto(new Uint8Array(5 * 1024 * 1024 + 1)), null);
  assert.equal(validatePhoto(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]))?.mime, "image/png");
});
test("anuncios validan servicios, importes enteros y campos públicos privilegiados se descartan", () => {
  const listing = { title: "Apartamento de prueba", summary: "Resumen de un alojamiento de prueba", description: "Una descripción suficientemente detallada del alojamiento para las pruebas de validación.", district: "Centro", type: "Apartamento", capacity: "2", bedrooms: "1", beds: "1", bathrooms: "1", priceNight: "120000", priceWeek: "", extraCosts: "No hay cargos adicionales", houseRules: "Condiciones de prueba sin reservas", whatsapp: "573001234567", rnt: "123456", amenities: ["WiFi"], status: "PUBLISHED", hostId: "otro" };
  const parsed = listingSchema.parse(listing);
  assert.equal(parsed.priceWeek, undefined);
  assert.equal("status" in parsed, false);
  assert.equal("hostId" in parsed, false);
  assert.equal(listingSchema.safeParse({ ...listing, priceNight: "1.25" }).success, false);
  assert.equal(listingSchema.safeParse({ ...listing, amenities: ["Servicio inventado"] }).success, false);
  assert.equal(normalizeSlug("Un lugar en Quibdó!"), "un-lugar-en-quibdo");
});
test("las fechas de consulta son reales y el número de viajeros es acotado", () => {
  assert.deepEqual(parseConsultation("2026-12-01", "2"), { arrival: "2026-12-01", people: "2" });
  assert.deepEqual(parseConsultation("2026-02-30", "999"), { arrival: "", people: "" });
  assert.deepEqual(parseConsultation("javascript:alert(1)", "1.5"), { arrival: "", people: "" });
});
