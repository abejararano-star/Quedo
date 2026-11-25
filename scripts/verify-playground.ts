import "dotenv/config";
import { isLoopbackUrl } from "../src/lib/security-config";
if (!isLoopbackUrl(process.env.DATABASE_URL)) throw new Error("La base de pruebas debe ser local.");
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { dateKey } from "../src/lib/analytics-math";

const db = new PrismaClient();
const base = process.env.APP_URL!;
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error("Solo se permite un servidor local.");
const run = randomUUID();
const listingId = `qa-portal-${run}`;
const hostId = `qa-member-${run}`;
const sessionHashes = new Set<string>();
const visitHashes = new Set<string>();
let checks = 0;
const passed = (message: string) => { checks++; console.log(`OK ${checks}: ${message}`); };
const decode = (value: string) => value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
class Client {
  jar = new Map<string, string>();
  async request(url: string, options: RequestInit = {}) {
    const response = await fetch(base + url, { ...options, redirect: "manual", headers: { Cookie: [...this.jar].map(([key, value]) => `${key}=${value}`).join("; "), ...options.headers } });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";"); const equal = pair.indexOf("=");
      const key = pair.slice(0, equal); const value = pair.slice(equal + 1);
      this.jar.set(key, value);
      if (key === "quedo-session" && value) sessionHashes.add(createHash("sha256").update(value).digest("hex"));
      if (key === "quedo-visit" && value) visitHashes.add(createHash("sha256").update(value).digest("hex"));
    }
    return response;
  }
  async submit(url: string, marker: string, fields: Record<string, string | string[]>) {
    const page = await this.request(url); assert.equal(page.status, 200, url);
    const forms = (await page.text()).match(/<form\b[\s\S]*?<\/form>/g) ?? [];
    const form = forms.find(item => decode(item).includes(marker)); assert.ok(form, marker);
    const data = new FormData();
    for (const input of form.match(/<input\b[^>]*>/g) ?? []) {
      if (!/type="hidden"/.test(input) && !(/type="(?:checkbox|radio)"/.test(input) && /\bchecked(?:=""|(?=[\s>]))/.test(input))) continue;
      const name = /\bname="([^"]*)"/.exec(input)?.[1]; const value = /\bvalue="([^"]*)"/.exec(input)?.[1] ?? "";
      if (name) data.append(decode(name), decode(value));
    }
    for (const [key, value] of Object.entries(fields)) { data.delete(key); if (Array.isArray(value)) value.forEach(item => data.append(key, item)); else data.append(key, value); }
    return this.request(url, { method: "POST", body: data, headers: { Origin: base, "X-Forwarded-For": `fd00:${run.slice(0,4)}::2` } });
  }
}
async function main() {
  console.log("Esperando credenciales por entrada estándar.");
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  const reader = createInterface({ input: process.stdin, terminal: false });
  const input = await new Promise<string>(resolve => reader.once("line", resolve)); reader.close();
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  const { accounts } = JSON.parse(input) as { accounts: { email: string; role: string; password: string }[] };
  const admin = new Client(); const owner = new Client(); const other = new Client(); const anonymous = new Client();
  for (const [client, email] of [[admin,"admin@quedo.test"],[owner,"anfitrion@quedo.test"],[other,"anfitrion2@quedo.test"]] as const) {
    const credential = accounts.find(item => item.email === email); assert.ok(credential?.password);
    const response = await client.submit("/acceso", "Iniciar sesión", { email, password: credential.password });
    assert.equal(response.status, 303); assert.equal(response.headers.get("location"), credential.role === "ADMIN" ? "/admin" : "/anfitrion");
  }
  passed("las tres cuentas solicitadas pueden iniciar sesión con su rol");
  for (const url of ["/admin", "/admin/anuncios", "/admin/contactos", "/admin/anfitriones"]) assert.equal((await admin.request(url)).status, 200, url);
  for (const url of ["/anfitrion", "/anfitrion/contactos", "/anfitrion/metricas"]) assert.equal((await owner.request(url)).status, 200, url);
  passed("paneles de administración y anfitrión disponibles");
  assert.equal((await anonymous.request("/admin/exportar/resumen")).status, 401);
  assert.equal((await owner.request("/admin/exportar/contactos")).status, 403);
  assert.equal((await owner.request("/anfitrion/exportar/anfitriones")).status, 404);
  passed("CSV protegido por sesión, rol y conjunto autorizado");
  const ownerRecord = await db.user.findUniqueOrThrow({ where: { email: "anfitrion@quedo.test" } });
  const otherRecord = await db.user.findUniqueOrThrow({ where: { email: "anfitrion2@quedo.test" } });
  const otherListing = await db.listing.findFirstOrThrow({ where: { hostId: otherRecord.id } });
  assert.equal((await owner.request(`/anfitrion/${otherListing.id}/editar`)).status, 404);
  const ownerCsv = await (await owner.request("/anfitrion/exportar/contactos?datos=reales")).text();
  assert.ok(ownerCsv.includes("PRUEBA / SIMULADO")); assert.ok(!ownerCsv.includes(otherListing.id));
  passed("cada anfitrión solo lee y exporta sus propios contactos");
  const fields = { title: "Anuncio temporal del recorrido", summary: "Ejemplo desechable para revisar edición y publicación.", description: "Este anuncio es una prueba técnica temporal del nuevo panel. Se elimina al finalizar el recorrido y no representa un espacio disponible.", district: "Centro", type: "Apartaestudio", capacity: "2", bedrooms: "1", beds: "1", bathrooms: "1", priceNight: "120000", priceWeek: "", extraCosts: "Sin cargos de prueba.", houseRules: "Condiciones temporales para comprobar el ciclo de revisión.", amenities: ["WiFi"], keepPhotos: ["/images/apartment-2.jpg"], cover: "/images/apartment-2.jpg" };
  await db.listing.create({ data: { id: listingId, slug: listingId, hostId: ownerRecord.id, title: fields.title, summary: fields.summary, description: fields.description, district: fields.district, type: fields.type, capacity: 2, bedrooms: 1, beds: 1, bathrooms: 1, priceNight: 120000, extraCosts: fields.extraCosts, houseRules: fields.houseRules, amenities: ["WiFi"], photos: ["/images/apartment-1.jpg", "/images/apartment-2.jpg"], isDemo: true, status: "PUBLISHED" } });
  const edited = await owner.submit(`/anfitrion/${listingId}/editar`, "Guardar y enviar a revisión", { ...fields, id: listingId }); assert.equal(edited.status, 303);
  let listing = await db.listing.findUniqueOrThrow({ where: { id: listingId } });
  assert.equal(listing.status, "PENDING"); assert.deepEqual(listing.photos, ["/images/apartment-2.jpg"]); assert.equal(listing.whatsapp, null);
  assert.equal((await anonymous.request(`/estadias/${listing.slug}`)).status, 404); passed("editar un ejemplo conserva su modo de prueba, permite retirar fotos y vuelve a revisión");
  const moderated = await admin.submit("/admin/anuncios?datos=prueba", listingId, { id: listingId, status: "PUBLISHED", reviewed: "on", note: "Aprobación temporal para comprobar publicación del ejemplo." }); assert.equal(moderated.status, 200);
  listing = await db.listing.findUniqueOrThrow({ where: { id: listingId } }); assert.equal(listing.status, "PUBLISHED");
  const detail = await (await anonymous.request(`/estadias/${listing.slug}`)).text(); assert.ok(!detail.includes(">Consultar por WhatsApp<")); passed("el administrador publica el ejemplo sin habilitar contacto comercial");
  const simulated = await owner.submit("/anfitrion", "Simular consulta", { listingId }); assert.equal(simulated.status, 303);
  const contact = await db.contact.findFirstOrThrow({ where: { listingId } }); assert.equal(contact.isSimulated, true); assert.ok(contact.visitId);
  passed("el simulador crea una visita y un contacto enlazados sin abrir WhatsApp");
  const attempted = await other.submit("/anfitrion/contactos", "Guardar seguimiento", { id: contact.id, status: "CONFIRMED", note: "No debe aceptar cambios de otra cuenta.", lossReason: "" }); assert.equal(attempted.status, 200);
  assert.equal((await db.contact.findUniqueOrThrow({ where: { id: contact.id } })).status, "INITIATED"); passed("un anfitrión no cambia el seguimiento de contactos ajenos");
  const followed = await owner.submit("/anfitrion/contactos", contact.id, { id: contact.id, status: "CONFIRMED", note: "=1+1", lossReason: "" }); assert.equal(followed.status, 200);
  assert.equal((await db.contact.findUniqueOrThrow({ where: { id: contact.id } })).status, "CONFIRMED");
  const eventCsv = await (await admin.request("/admin/exportar/eventos?datos=prueba")).text(); assert.ok(eventCsv.includes('"\'=1+1"')); passed("seguimiento manual auditado y texto peligroso neutralizado en CSV");
  const kinds = ["resumen", "embudo", "anuncios", "contactos", "eventos", "vistas", "diario", "anfitriones", "planes", "cohortes"];
  for (const kind of kinds) {
    const response = await admin.request(`/admin/exportar/${kind}?datos=prueba`); assert.equal(response.status, 200, kind);
    assert.match(response.headers.get("content-disposition") ?? "", /attachment/); assert.equal(response.headers.get("cache-control"), "private, no-store");
    const bytes = new Uint8Array(await response.arrayBuffer()); assert.deepEqual([...bytes.slice(0, 3)], [239,187,191]);
    assert.ok(Buffer.from(bytes).toString("utf8").includes("PRUEBA / SIMULADO"));
  }
  passed("las diez exportaciones CSV descargan UTF-8 con marca de datos de prueba");
  for (const kind of ["anuncios", "contactos", "vistas"]) {
    const content = await (await admin.request(`/admin/exportar/${kind}?datos=reales`)).text(); assert.ok(!content.includes("playground-") && !content.includes(listingId));
  }
  assert.equal((await admin.request("/admin/exportar/resumen?desde=2026-02-30")).status, 400); passed("datos reales separados y fechas inválidas rechazadas");
  await db.user.create({ data: { id: hostId, name: "Anfitrión temporal de validación", email: `${hostId}@example.invalid`, passwordHash: await hashPassword(randomUUID()), role: "HOST", isTest: true } });
  const plan = await admin.submit("/admin/anfitriones?datos=prueba", hostId, { hostId, status: "ACTIVE", plan: "Plan de validación", monthlyPrice: "45000", effectiveDay: dateKey(new Date()), note: "Alta temporal para probar el historial sin realizar cobros." }); assert.equal(plan.status, 200);
  assert.equal(await db.membershipEvent.count({ where: { hostId, status: "ACTIVE" } }), 1); passed("cambio de plan registrado con historial y sin cobros");
  console.log(`Resultado: ${checks} comprobaciones nuevas correctas.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  const contacts = await db.contact.findMany({ where: { listingId }, select: { id: true } });
  await db.auditLog.deleteMany({ where: { entityId: { in: [listingId, hostId, ...contacts.map(contact => contact.id)] } } });
  await db.listing.deleteMany({ where: { id: listingId } });
  await db.membershipEvent.deleteMany({ where: { hostId } }); await db.user.deleteMany({ where: { id: hostId } });
  await db.session.deleteMany({ where: { tokenHash: { in: [...sessionHashes] } } });
  await db.visitSession.deleteMany({ where: { tokenHash: { in: [...visitHashes] }, views: { none: {} }, contacts: { none: {} } } });
  await db.$disconnect(); console.log("Retirados solo los datos y sesiones temporales de esta verificación.");
});
