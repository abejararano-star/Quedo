import "dotenv/config";
import { strict as assert } from "node:assert";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { isLoopbackUrl } from "../src/lib/security-config";

const db = new PrismaClient();
const base = process.env.APP_URL ?? "http://127.0.0.1:3000";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) throw new Error("Esta prueba solo admite un servidor local.");
if (!isLoopbackUrl(process.env.DATABASE_URL)) throw new Error("La base de pruebas debe ser local.");
const run = randomUUID();
const testPeer = `fd00:${run.replace(/-/g, "").slice(0, 4)}:${run.replace(/-/g, "").slice(4, 8)}::1`;
const users: string[] = [];
let checks = 0;
function passed(label: string) { checks++; console.log(`OK ${checks}: ${label}`); }
function decode(value: string) { return value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }
async function get(url: string, cookie?: string) { return fetch(base + url, { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} }); }
async function submit(url: string, marker: string, fields: Record<string, string | Blob | string[]>, cookie?: string) {
  const page = await get(url, cookie);
  assert.equal(page.status, 200, `No se cargó ${url}`);
  const html = await page.text();
  const forms = html.match(/<form\b[\s\S]*?<\/form>/g) ?? [];
  const form = forms.find(item => decode(item).includes(marker));
  assert.ok(form, `No se encontró formulario ${marker}`);
  const data = new FormData();
  for (const input of form.match(/<input\b[^>]*>/g) ?? []) {
    if (!/type="hidden"/.test(input) && !(/type="(?:checkbox|radio)"/.test(input) && /\bchecked(?:=""|(?=[\s>]))/.test(input))) continue;
    const name = /\bname="([^"]*)"/.exec(input)?.[1];
    const value = /\bvalue="([^"]*)"/.exec(input)?.[1] ?? "";
    if (name) data.append(decode(name), decode(value));
  }
  for (const [key, value] of Object.entries(fields)) {
    data.delete(key);
    if (Array.isArray(value)) value.forEach(item => data.append(key, item));
    else if (value instanceof Blob) data.append(key, value, "test.jpg");
    else data.append(key, value);
  }
  return fetch(base + url, { method: "POST", body: data, redirect: "manual", headers: { Origin: base, "X-Forwarded-For": testPeer, ...(cookie ? { Cookie: cookie } : {}) } });
}
async function fixture(role: "HOST" | "ADMIN") {
  const user = await db.user.create({ data: { name: "Prueba temporal", email: `${role}-${run}-${users.length}@example.invalid`, passwordHash: await hashPassword(randomBytes(32).toString("hex")), role } });
  users.push(user.id);
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 600_000) } });
  return { user, cookie: `quedo-session=${token}` };
}
async function main() {
  const home = await get("/"); assert.equal(home.status, 200); assert.match(await home.text(), /Sentirte en casa/); passed("portada y conexión con MariaDB");
  const filtered = await (await get("/estadias?servicio=WiFi&precio=100000")).text();
  assert.equal((filtered.match(/<article class="listing-card"/g) ?? []).length, 1); passed("filtros JSON y presupuesto en MariaDB");
  const empty = await (await get("/estadias?q=inexistente-" + run)).text(); assert.match(empty, /No encontramos espacios/); passed("búsqueda sin resultados");
  const demo = await (await get("/estadias/luz-y-calma-en-el-centro")).text(); assert.ok(!demo.includes(">Consultar por WhatsApp<")); passed("contacto deshabilitado en ejemplos");
  const unauthorized = await get("/anfitrion"); assert.equal(unauthorized.status, 307); assert.equal(unauthorized.headers.get("location"), "/acceso"); passed("panel protegido sin sesión");
  const email = `register-${run}@example.invalid`;
  const password = randomBytes(24).toString("base64url");
  const registered = await submit("/registro", "Crear mi cuenta", { name: "Registro de prueba", email, password, consent: "on", role: "ADMIN" });
  assert.equal(registered.status, 303);
  const registeredUser = await db.user.findUniqueOrThrow({ where: { email } }); users.push(registeredUser.id);
  assert.equal(registeredUser.role, "HOST"); assert.notEqual(registeredUser.passwordHash, password); passed("registro real sin elevación de rol");
  const signedIn = await submit("/acceso", "Iniciar sesión", { email, password });
  assert.equal(signedIn.status, 303); assert.match(signedIn.headers.get("set-cookie") ?? "", /HttpOnly/i); passed("inicio de sesión y cookie HttpOnly");
  const guestEmail = `guest-${run}@example.invalid`;
  const guestRegistration = await submit("/registro?perfil=huesped", "Crear mi cuenta", { name: "Huésped de prueba", email: guestEmail, password, consent: "on" });
  const guest = await db.user.findUniqueOrThrow({ where: { email: guestEmail } }); users.push(guest.id);
  assert.equal(guest.role, "GUEST"); assert.equal(guestRegistration.headers.get("location"), "/huesped");
  const guestCookie = guestRegistration.headers.get("set-cookie")!.split(";")[0];
  assert.match(await (await get("/huesped", guestCookie)).text(), new RegExp(guestEmail));
  assert.equal((await get("/anfitrion/nuevo", guestCookie)).headers.get("location"), "/huesped");
  assert.equal((await get("/anfitrion/exportar/resumen", guestCookie)).status, 403);
  passed("registro y perfil privado de huésped, panel y CSV de anfitrión restringidos");
  const sample = await db.listing.findFirstOrThrow({ where: { status: "PUBLISHED", isDemo: true } });
  const detail = "/estadias/" + sample.slug;
  await submit(detail, "Guardar estadía", {}, guestCookie);
  assert.equal(await db.favorite.count({ where: { userId: guest.id, listingId: sample.id } }), 1);
  const secondSession = await submit("/acceso", "Iniciar sesión", { email: guestEmail, password });
  const secondCookie = secondSession.headers.get("set-cookie")!.split(";")[0];
  assert.match(await (await get("/guardados", secondCookie)).text(), /<article class="listing-card"/);
  const stranger = await fixture("HOST");
  assert.doesNotMatch(await (await get("/guardados", stranger.cookie)).text(), /<article class="listing-card"/);
  await submit(detail, "Guardar estadía", { account: guest.id, saved: "no" }, stranger.cookie);
  assert.equal(await db.favorite.count({ where: { userId: guest.id } }), 1);
  await submit(detail, "Quitar de guardados", {}, secondCookie);
  assert.equal(await db.favorite.count({ where: { userId: guest.id } }), 0);
  passed("favoritos entre sesiones, eliminación y aislamiento por cuenta");
  const owner = await fixture("HOST"); const other = await fixture("HOST"); const admin = await fixture("ADMIN");
  const deniedAdmin = await get("/admin", owner.cookie); assert.equal(deniedAdmin.status, 307); passed("anfitrión sin acceso a administración");
  const title = `Prueba temporal ${run.slice(0, 8)}`;
  const fields = { title, summary: "Anuncio temporal para probar el flujo local de Quedo.", description: "Esta ficha es una prueba técnica temporal y se eliminará al terminar. No representa oferta comercial ni alojamiento real.", district: "Centro", type: "Apartamento", capacity: "2", bedrooms: "1", beds: "1", bathrooms: "1", priceNight: "120000", priceWeek: "", extraCosts: "Ninguno, solo prueba técnica", houseRules: "No disponible para contratación. Prueba temporal.", whatsapp: "573000000000", rnt: "123456", amenities: ["WiFi", "Cocina"], status: "PUBLISHED", hostId: other.user.id, isDemo: "true" };
  const image = new Blob([new Uint8Array(await readFile(path.join(process.cwd(), "public/images/apartment-1.jpg")))], { type: "image/jpeg" });
  const created = await submit("/anfitrion/nuevo", "Guardar y enviar a revisión", { ...fields, photos: image }, owner.cookie);
  assert.equal(created.status, 303, await created.text());
  let listing = await db.listing.findFirstOrThrow({ where: { hostId: owner.user.id, title } });
  assert.equal(listing.status, "PENDING"); assert.equal(listing.isDemo, false); assert.equal(listing.hostId, owner.user.id);
  const media = await db.media.findFirstOrThrow({ where: { listingId: listing.id } });
  passed("alta con fotografía recodificada, estado y propietario controlados por servidor");
  assert.equal((await get(`/estadias/${listing.slug}`)).status, 404);
  assert.equal((await get(`/media/${media.key}`)).status, 404);
  assert.equal((await get(`/media/${media.key}`, other.cookie)).status, 404);
  assert.equal((await get(`/media/${media.key}`, owner.cookie)).status, 200);
  assert.equal((await get(`/anfitrion/${listing.id}/editar`, other.cookie)).status, 404);
  passed("ficha y fotografías privadas por propietario");
  const forged = await submit("/anfitrion/nuevo", "Guardar y enviar a revisión", { ...fields, id: listing.id, title: "Intento de cambio ajeno" }, other.cookie);
  assert.equal(forged.status, 200); assert.equal((await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).title, title); passed("mutación ajena rechazada por servidor");
  const decision = await submit("/admin/anuncios?datos=reales", "Guardar decisión", { id: listing.id, status: "PUBLISHED", note: "Prueba administrativa temporal de publicación.", reviewed: "on" }, admin.cookie);
  assert.equal(decision.status, 200);
  assert.equal((await get(`/estadias/${listing.slug}`)).status, 200);
  assert.equal((await get(`/media/${media.key}`)).status, 200); passed("publicación administrativa y acceso público posterior");
  const arrival = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
  const departure = new Date(Date.now() + 86400000 * 6).toISOString().slice(0, 10);
  const preview = await (await get(`/estadias/${listing.slug}?llegada=${arrival}&salida=${departure}&personas=2`)).text();
  assert.match(preview, /Subtotal estimado del alojamiento/);
  assert.match(preview, /360\.000/);
  assert.match(preview, /Disponibilidad sin confirmar/);
  const invalid = await submit(`/estadias/${listing.slug}`, "Consultar por WhatsApp", { slug: listing.slug, arrival: departure, departure: arrival, people: "2" });
  assert.match(invalid.headers.get("location") ?? "", /contacto=invalido/);
  assert.equal(await db.contact.count({ where: { listingId: listing.id } }), 0);
  const contacted = await submit(`/estadias/${listing.slug}`, "Consultar por WhatsApp", { slug: listing.slug, arrival, departure, people: "2" });
  assert.equal(contacted.status, 303); assert.match(contacted.headers.get("location") ?? "", /^https:\/\/wa\.me\//);
  assert.match(decodeURIComponent(contacted.headers.get("location") ?? ""), new RegExp(`Llegada a consultar: ${arrival}.*Salida: ${departure}.*Huéspedes: 2.*360.000`));
  assert.equal(await db.contact.count({ where: { listingId: listing.id } }), 1); passed("contacto registrado sin seguir el enlace ni enviar mensajes");
  const tracked = await fetch(`${base}/api/visitas`, { method: "POST", headers: { Origin: base, "Content-Type": "application/json" }, body: JSON.stringify({ listingId: listing.id }) });
  assert.equal(tracked.status, 204); assert.equal(await db.pageView.count({ where: { listingId: listing.id } }), 1);
  const crossOrigin = await fetch(`${base}/api/visitas`, { method: "POST", headers: { Origin: "https://example.invalid", "Content-Type": "application/json" }, body: JSON.stringify({ listingId: listing.id }) });
  assert.equal(crossOrigin.status, 403); passed("medición separada y comprobación de origen");
  const updated = await submit(`/anfitrion/${listing.id}/editar`, "Guardar y enviar a revisión", { ...fields, id: listing.id, title: title + " editado" }, owner.cookie);
  assert.equal(updated.status, 303);
  listing = await db.listing.findUniqueOrThrow({ where: { id: listing.id } });
  assert.equal(listing.status, "PENDING"); assert.equal(listing.reviewedAt, null);
  assert.equal((await get(`/estadias/${listing.slug}`)).status, 404);
  assert.equal((await get(`/media/${media.key}`)).status, 404); passed("editar retira anuncio y fotos del acceso público");
  assert.ok(await db.auditLog.count({ where: { entityId: listing.id } }) >= 3); passed("auditoría del ciclo de publicación");
  console.log(`Resultado: ${checks} comprobaciones de integración correctas.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (users.length) {
    const media = await db.media.findMany({ where: { listing: { hostId: { in: users } } } });
    const visits = await db.visitSession.findMany({ where: { OR: [{ views: { some: { listing: { hostId: { in: users } } } } }, { contacts: { some: { listing: { hostId: { in: users } } } } }] }, select: { id: true } });
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await db.listing.deleteMany({ where: { hostId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.visitSession.deleteMany({ where: { id: { in: visits.map(visit => visit.id) }, views: { none: {} }, contacts: { none: {} } } });
    for (const item of media) if (/^[a-f0-9-]{36}\.webp$/.test(item.key)) await unlink(path.join(process.cwd(), "storage/media", item.key)).catch(() => {});
    console.log("Datos temporales de esta prueba eliminados.");
  }
  await db.$disconnect();
});
