import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, type Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { dateKey, startOfDay, DAY } from "../src/lib/analytics-math";

const db = new PrismaClient();
const localHosts = ["localhost", "127.0.0.1", "[::1]"];
if (!localHosts.includes(new URL(process.env.DATABASE_URL!).hostname) || !localHosts.includes(new URL(process.env.APP_URL!).hostname)) throw new Error("Las cuentas y datos de prueba solo se preparan en el entorno local.");
async function main() {
  const now = new Date();
  const today = startOfDay(dateKey(now));
  const month = Number(dateKey(now).slice(5, 7)) - 1;
  const year = Number(dateKey(now).slice(0, 4));
  const monthDate = (offset: number, day: number) => new Date(Date.UTC(year, month + offset, day, 5));
  const credentials: { email: string; role: Role; password: string | null }[] = [];
  async function account(email: string, name: string, role: Role, createdAt: Date) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.isTest || existing.role !== role) throw new Error("Ya existe una cuenta ajena a este escenario con ese correo. No se ha modificado.");
      credentials.push({ email, role, password: null });
      return existing;
    }
    const password = `Quedo-${randomBytes(12).toString("base64url")}`;
    const user = await db.user.create({ data: { name, email, role, isTest: true, passwordHash: await hashPassword(password), createdAt } });
    credentials.push({ email, role, password });
    return user;
  }
  const admin = await account("admin@quedo.test", "Administrador de prueba", "ADMIN", now);
  const host = await account("anfitrion@quedo.test", "María de prueba", "HOST", monthDate(-3, 1));
  const second = await account("anfitrion2@quedo.test", "Diego de prueba", "HOST", monthDate(-2, 1));
  await db.user.updateMany({ where: { id: "quedo-demo-host", role: "HOST", email: "demo@quedo.invalid" }, data: { isTest: true } });
  const examples = [
    { id: "playground-live", slug: "prueba-apartaestudio-para-editar", title: "[Prueba] Apartaestudio para editar", status: "PUBLISHED" as const, hostId: host.id, image: 1, district: "Centro", reviewNote: "Ejemplo aprobado para explorar la edición. Al guardar cambios volverá a revisión." },
    { id: "playground-pending", slug: "prueba-espacio-en-revision", title: "[Prueba] Espacio en revisión", status: "PENDING" as const, hostId: host.id, image: 4, district: "Medrano", reviewNote: null },
    { id: "playground-changes", slug: "prueba-anuncio-con-cambios", title: "[Prueba] Anuncio con cambios", status: "REJECTED" as const, hostId: host.id, image: 3, district: "César Conto", reviewNote: "Ejemplo de corrección: amplía las condiciones de entrada, salida y cancelación antes de reenviar." },
    { id: "playground-second", slug: "prueba-espacio-segundo-anfitrion", title: "[Prueba] Espacio de Diego", status: "PUBLISHED" as const, hostId: second.id, image: 2, district: "La Yesquita", reviewNote: "Ejemplo de otro propietario para comprobar la separación entre cuentas." },
  ];
  for (const { image, ...example } of examples) {
    if (await db.listing.findUnique({ where: { id: example.id } })) continue;
    await db.listing.create({ data: { ...example, isDemo: true, city: "Quibdó", type: "Apartaestudio", capacity: 2, bedrooms: 1, beds: 1, bathrooms: 1, priceNight: 120000, priceWeek: 720000, amenities: ["WiFi", "Cocina", "Zona de trabajo"], photos: [`/images/apartment-${image}.jpg`, `/images/apartment-${image % 6 + 1}.jpg`], summary: "Alojamiento ficticio para practicar la edición y la revisión de publicaciones.", description: "Este espacio forma parte de la zona de pruebas de Quedo. Puedes editar su información, enviar los cambios a revisión y aprobarlos desde la cuenta de administración. No corresponde a un alojamiento real ni admite contratación.", extraCosts: "Sin cargos reales: ejemplo para pruebas.", houseRules: "Condiciones de ejemplo. Edita aquí las reglas de entrada, salida y cancelación para practicar.", whatsapp: null, rnt: null, reviewedAt: example.status === "PENDING" ? null : new Date(today.getTime() - 3 * DAY), createdAt: new Date(today.getTime() - 45 * DAY) } });
  }
  const histories = [
    { id: "playground-plan-maria-trial", hostId: host.id, status: "TRIAL" as const, monthlyPrice: 0, effectiveAt: monthDate(-3, 1) },
    { id: "playground-plan-maria-active", hostId: host.id, status: "ACTIVE" as const, monthlyPrice: 89000, effectiveAt: monthDate(-3, 3) },
    { id: "playground-plan-diego-trial", hostId: second.id, status: "TRIAL" as const, monthlyPrice: 0, effectiveAt: monthDate(-2, 1) },
    { id: "playground-plan-diego-active", hostId: second.id, status: "ACTIVE" as const, monthlyPrice: 45000, effectiveAt: monthDate(-2, 7) },
    { id: "playground-plan-diego-canceled", hostId: second.id, status: "CANCELED" as const, monthlyPrice: 45000, effectiveAt: new Date(today.getTime() - 7 * DAY) },
  ];
  for (const history of histories) await db.membershipEvent.upsert({ where: { id: history.id }, update: {}, create: { ...history, plan: history.hostId === host.id ? "Plus de prueba" : "Básico de prueba", note: "Historia simulada para explorar churn, MRR y retención. No representa cobros.", actorId: admin.id } });
  for (let index = 0; index < 120; index++) {
    const listingId = index % 4 === 0 ? "playground-second" : "playground-live";
    const createdAt = new Date(today.getTime() - (index % 28 + 1) * DAY + 12 * 60 * 60_000 + index * 1000);
    const visitId = `playground-visit-${index}`;
    await db.visitSession.upsert({ where: { id: visitId }, update: {}, create: { id: visitId, tokenHash: createHash("sha256").update(visitId).digest("hex"), source: ["directo", "instagram (simulado)", "google (simulado)"][Math.floor(index / 7) % 3], createdAt, expiresAt: new Date(createdAt.getTime() + 30 * 60_000) } });
    await db.pageView.upsert({ where: { id: `playground-view-${index}` }, update: {}, create: { id: `playground-view-${index}`, listingId, visitId, isSimulated: true, createdAt } });
    if (index % 3 !== 0) continue;
    const contactId = `playground-contact-${index}`;
    if (await db.contact.findUnique({ where: { id: contactId } })) continue;
    const status = (["INITIATED", "RESPONDED", "CONFIRMED", "LOST"] as const)[Math.floor(index / 3) % 4];
    const contactTime = new Date(createdAt.getTime() + 5 * 60_000);
    const events = [{ status: "INITIATED" as "INITIATED" | "RESPONDED" | "CONFIRMED" | "LOST", createdAt: contactTime, note: "Contacto simulado de demostración.", actorId: admin.id, lossReason: null as string | null }];
    if (status !== "INITIATED") events.push({ status: "RESPONDED", createdAt: new Date(contactTime.getTime() + 15 * 60_000), note: "Respuesta simulada.", actorId: listingId === "playground-second" ? second.id : host.id, lossReason: null });
    if (status === "CONFIRMED" || status === "LOST") events.push({ status, createdAt: new Date(contactTime.getTime() + 45 * 60_000), note: "Resultado simulado; no es una reserva real.", actorId: admin.id, lossReason: status === "LOST" ? ["Precio", "Sin disponibilidad", "No respondió"][Math.floor(index / 12) % 3] : null });
    await db.contact.create({ data: { id: contactId, listingId, visitId, isSimulated: true, status, createdAt: contactTime, updatedAt: contactTime, events: { create: events } } });
  }
  console.log(JSON.stringify({ accounts: credentials, scenario: "4 anuncios de prueba, 120 sesiones simuladas, 40 contactos simulados e historial de planes. Los registros existentes se conservan." }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
