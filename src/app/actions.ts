"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { accountPath, createSession, destroySession, requireAdmin, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { allowRequest } from "@/lib/rate-limit";
import { registrationSchema, loginSchema, getListingSchema, normalizeSlug, validatePhoto } from "@/lib/validation";
import { canContactListing, canEditListing } from "@/lib/policy";
import { strings } from "@/lib/format";
import { stayQuote, todayInBogota } from "@/lib/stay-quote";
import { money } from "@/lib/format";
import { getVisit } from "@/lib/visit";
import { mayUseTestAccount } from "@/lib/security-config";

export type ActionState = { error?: string; success?: string };
export async function register(_state: ActionState, form: FormData): Promise<ActionState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!await allowRequest("register", 5, 60)) return { error: "Has alcanzado el límite de intentos. Prueba dentro de una hora." };
  const { name, email, password } = parsed.data;
  const role = form.get("accountType") === "guest" ? "GUEST" : "HOST";
  try {
    const user = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password), role } });
    await createSession(user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "No pudimos crear la cuenta. Si ya tienes una, inicia sesión." };
    throw error;
  }
  redirect(accountPath(role));
}
export async function login(_state: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Revisa el correo y la contraseña." };
  const { email, password } = parsed.data;
  if (!await allowRequest("login-peer", 30, 15) || !await allowRequest("login-email", 10, 15, email)) return { error: "Demasiados intentos. Espera 15 minutos antes de volver a probar." };
  const user = await db.user.findUnique({ where: { email } });
  // Run scrypt even for unknown accounts to avoid a fast account-enumeration path.
  const fallback = "scrypt:0123456789abcdef0123456789abcdef:" + "0".repeat(128);
  const valid = await verifyPassword(password, user?.passwordHash ?? fallback);
  if (!user || !valid || (user.isTest && !mayUseTestAccount(process.env.APP_URL, process.env.NODE_ENV))) return { error: "El correo o la contraseña no coinciden." };
  await createSession(user.id);
  redirect(accountPath(user.role));
}
export async function logout() {
  await destroySession();
  redirect("/");
}
export async function saveListing(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const existing = id ? await db.listing.findUnique({ where: { id } }) : null;
  const testMode = existing ? existing.isDemo : user.isTest;
  if (id && (!existing || !canEditListing(user, existing))) return { error: "No tienes permiso para modificar este anuncio." };
  if (!await allowRequest("save", 30, 60, user.id)) return { error: "Has alcanzado el límite de cambios de esta hora." };
  const parsed = getListingSchema(testMode).safeParse({ ...Object.fromEntries(form), amenities: form.getAll("amenities") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const files = form.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  const selectedPhotos = form.getAll("keepPhotos").filter((value): value is string => typeof value === "string");
  const keepPhotos = existing ? strings(existing.photos).filter(photo => selectedPhotos.includes(photo)) : [];
  const cover = String(form.get("cover") ?? "");
  if (keepPhotos.includes(cover)) keepPhotos.splice(0, keepPhotos.length, cover, ...keepPhotos.filter(photo => photo !== cover));
  if (files.length > 6) return { error: "Puedes subir hasta seis fotografías por envío." };
  if (!keepPhotos.length && !files.length) return { error: "Añade al menos una fotografía del alojamiento." };
  if (keepPhotos.length + files.length > 12) return { error: "El anuncio admite hasta doce fotografías." };
  const uploads: { key: string; mime: string; bytes: Uint8Array }[] = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) return { error: "Cada fotografía debe pesar menos de 5 MB." };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = validatePhoto(bytes);
    if (!kind) return { error: "Usa fotografías JPG, PNG o WebP válidas, de menos de 5 MB." };
    // Re-encode uploads to reject malformed files and remove embedded metadata.
    const sharp = (await import("sharp")).default;
    try {
      const cleaned = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      uploads.push({ key: `${randomUUID()}.webp`, mime: "image/webp", bytes: cleaned });
    } catch { return { error: "No pudimos procesar una fotografía. Comprueba que sea una imagen válida." }; }
  }
  const directory = path.join(process.cwd(), "storage", "media");
  await mkdir(directory, { recursive: true });
  let listingId: string;
  const removedKeys: string[] = [];
  try {
    for (const upload of uploads) await writeFile(path.join(directory, upload.key), upload.bytes, { flag: "wx" });
    listingId = await db.$transaction(async tx => {
      const data = { ...parsed.data, whatsapp: testMode ? null : parsed.data.whatsapp, rnt: testMode ? null : parsed.data.rnt, priceWeek: parsed.data.priceWeek ?? null, status: "PENDING" as const, reviewedAt: null, reviewNote: null,
        photos: [...keepPhotos, ...uploads.map(upload => `/media/${upload.key}`)] };
      const listing = existing
        ? await tx.listing.update({ where: { id: existing.id }, data })
        : await tx.listing.create({ data: { ...data, isDemo: user.isTest, slug: `${normalizeSlug(parsed.data.title)}-${randomUUID().slice(0, 8)}`, hostId: user.id } });
      if (existing) {
        const previousMedia = await tx.media.findMany({ where: { listingId: existing.id } });
        const removed = previousMedia.filter(media => !keepPhotos.includes(`/media/${media.key}`));
        if (removed.length) {
          await tx.media.deleteMany({ where: { id: { in: removed.map(media => media.id) } } });
          removedKeys.push(...removed.map(media => media.key));
        }
      }
      if (uploads.length) await tx.media.createMany({ data: uploads.map(upload => ({ key: upload.key, mime: upload.mime, listingId: listing.id })) });
      await tx.auditLog.create({ data: { actorId: user.id, entityId: listing.id, action: existing ? "LISTING_UPDATED_PENDING" : "LISTING_CREATED_PENDING" } });
      return listing.id;
    });
  } catch (error) {
    await Promise.allSettled(uploads.map(upload => unlink(path.join(directory, upload.key))));
    throw error;
  }
  await Promise.allSettled(removedKeys.filter(key => /^[a-f0-9-]{36}\.webp$/.test(key)).map(key => unlink(path.join(directory, key))));
  revalidatePath("/"); revalidatePath("/estadias"); revalidatePath("/anfitrion");
  revalidatePath("/admin/anuncios"); revalidatePath("/anfitrion/metricas");
  if (existing) revalidatePath(`/estadias/${existing.slug}`);
  if (user.role === "ADMIN") redirect(`/admin/anuncios?datos=${testMode ? "prueba" : "reales"}&guardado=${listingId}`);
  redirect(`/anfitrion?guardado=${listingId}`);
}
export async function pauseListing(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing || !canEditListing(user, listing)) return;
  await db.$transaction([
    db.listing.update({ where: { id }, data: { status: "PAUSED" } }),
    db.auditLog.create({ data: { actorId: user.id, entityId: id, action: "LISTING_PAUSED" } }),
  ]);
  revalidatePath("/"); revalidatePath("/estadias"); revalidatePath(`/estadias/${listing.slug}`); revalidatePath("/anfitrion");
  revalidatePath("/admin/anuncios"); revalidatePath("/anfitrion/metricas");
}
export async function moderateListing(form: FormData) {
  const user = await requireAdmin();
  const id = String(form.get("id"));
  const status = String(form.get("status"));
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  if (!["PUBLISHED", "REJECTED", "PAUSED"].includes(status) || note.length < 10 || form.get("reviewed") !== "on") return;
  const listing = await db.listing.findUnique({ where: { id } });
  if (!listing) return;
  await db.$transaction([
    db.listing.update({ where: { id }, data: { status: status as "PUBLISHED" | "REJECTED" | "PAUSED", reviewedAt: new Date(), reviewNote: note } }),
    db.auditLog.create({ data: { actorId: user.id, entityId: id, action: `MODERATION_${status}`, note } }),
  ]);
  revalidatePath("/"); revalidatePath("/estadias"); revalidatePath(`/estadias/${listing.slug}`); revalidatePath("/admin"); revalidatePath("/anfitrion");
  revalidatePath("/admin/anuncios"); revalidatePath("/anfitrion/metricas");
}
export async function contactHost(form: FormData) {
  const slug = String(form.get("slug"));
  const listing = await db.listing.findUnique({ where: { slug } });
  if (!listing || !canContactListing(listing)) redirect("/estadias");
  const arrival = String(form.get("arrival") ?? "");
  const departure = String(form.get("departure") ?? "");
  const people = String(form.get("people") ?? "1");
  const quote = stayQuote(arrival, departure, people, listing.capacity, listing.priceNight, todayInBogota());
  if (quote.error) redirect(`/estadias/${slug}?contacto=invalido`);
  if (!await allowRequest("contact", 20, 60)) redirect(`/estadias/${slug}?contacto=limite`);
  const visit = await getVisit();
  const contact = await db.contact.create({ data: { listingId: listing.id, visitId: visit.id, events: { create: { status: "INITIATED" } } } });
  const dates = arrival ? ` Llegada a consultar: ${arrival}. Salida: ${departure}.` : "";
  const estimate = quote.subtotal === null ? "" : ` Subtotal estimado del alojamiento por ${quote.nights} noches: ${money(quote.subtotal)} COP, antes de cargos adicionales.`;
  const details = `${dates} Huéspedes: ${people}.${estimate}`;
  const message = `Hola, vi «${listing.title}» en Quedo. Quisiera consultar disponibilidad, precio total y condiciones para mi estadía.${details} Referencia: ${contact.id}.`;
  redirect(`https://wa.me/${listing.whatsapp}?text=${encodeURIComponent(message)}`);
}
export async function reportListing(_state: ActionState, form: FormData): Promise<ActionState> {
  const listingId = String(form.get("listingId"));
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 15 || reason.length > 500) return { error: "Describe el problema entre 15 y 500 caracteres." };
  if (!await allowRequest("report", 5, 60)) return { error: "Has alcanzado el límite de reportes de esta hora." };
  const listing = await db.listing.findFirst({ where: { id: listingId, status: "PUBLISHED" } });
  if (!listing) return { error: "Este anuncio ya no está publicado." };
  await db.report.create({ data: { listingId, reason } });
  return { error: "Recibimos tu reporte. El equipo lo revisará." };
}
export async function resolveReport(form: FormData) {
  const user = await requireAdmin();
  const id = String(form.get("id"));
  await db.$transaction([
    db.report.update({ where: { id }, data: { resolved: true } }),
    db.auditLog.create({ data: { actorId: user.id, entityId: id, action: "REPORT_RESOLVED" } }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/admin/anuncios");
}
