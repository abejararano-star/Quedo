"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getVisit } from "@/lib/visit";
import { allowRequest } from "@/lib/rate-limit";
import { dateKey, lossReasons, startOfDay } from "@/lib/analytics-math";
import type { ActionState } from "./actions";

export async function updateContactStatus(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({ id: z.string().max(100), status: z.enum(["INITIATED", "RESPONDED", "CONFIRMED", "LOST"]), note: z.string().trim().max(500), lossReason: z.string().max(100) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Revisa el estado y la nota de seguimiento." };
  const { id, status, note, lossReason } = parsed.data;
  if (status === "LOST" && !lossReasons.includes(lossReason)) return { error: "Elige el motivo por el que no se concretó." };
  const contact = await db.contact.findUnique({ where: { id }, include: { listing: { select: { hostId: true } } } });
  if (!contact || (user.role !== "ADMIN" && contact.listing.hostId !== user.id)) return { error: "No tienes permiso para gestionar este contacto." };
  if (!await allowRequest("contact-update", 100, 60, user.id)) return { error: "Has alcanzado el límite de cambios de esta hora." };
  await db.$transaction([
    db.contact.update({ where: { id }, data: { status, events: { create: { status, note: note || null, lossReason: status === "LOST" ? lossReason : null, actorId: user.id } } } }),
    db.auditLog.create({ data: { actorId: user.id, entityId: id, action: `CONTACT_${status}`, note: note || null } }),
  ]);
  ["/admin", "/admin/contactos", "/anfitrion", "/anfitrion/contactos", "/anfitrion/metricas"].forEach(route => revalidatePath(route));
  return { success: "Seguimiento guardado. La confirmación es un reporte manual, no un pago verificado." };
}

export async function updateMembership(_state: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  const parsed = z.object({ hostId: z.string().max(100), status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELED"]), plan: z.string().trim().min(2).max(80), monthlyPrice: z.coerce.number().int().min(0).max(10000000), note: z.string().trim().min(10).max(500), effectiveDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Completa plan, tarifa, fecha y una nota de al menos diez caracteres." };
  const { hostId, status, plan, monthlyPrice, note, effectiveDay } = parsed.data;
  const effectiveAt = startOfDay(effectiveDay);
  if (Number.isNaN(effectiveAt.getTime()) || dateKey(effectiveAt) !== effectiveDay || effectiveAt > new Date()) return { error: "La fecha de efecto debe ser válida y no puede ser futura." };
  if (status === "ACTIVE" && monthlyPrice < 1) return { error: "Un plan de pago activo debe tener una tarifa mensual mayor que cero." };
  const host = await db.user.findFirst({ where: { id: hostId, role: "HOST" } });
  if (!host) return { error: "No encontramos ese anfitrión." };
  if (!await allowRequest("membership-update", 60, 60, user.id)) return { error: "Has alcanzado el límite de cambios de esta hora." };
  await db.$transaction([
    db.membershipEvent.create({ data: { hostId, status, plan, monthlyPrice, note, effectiveAt, actorId: user.id } }),
    db.auditLog.create({ data: { actorId: user.id, entityId: hostId, action: `MEMBERSHIP_${status}`, note } }),
  ]);
  revalidatePath("/admin"); revalidatePath("/admin/anfitriones");
  return { success: "Estado registrado en el historial. Esta operación no realiza cobros." };
}

export async function simulateContact(form: FormData) {
  const user = await requireUser();
  if (!user.isTest) return;
  const listing = await db.listing.findFirst({ where: { id: String(form.get("listingId")), isDemo: true, status: "PUBLISHED", ...(user.role !== "ADMIN" ? { hostId: user.id } : {}) } });
  if (!listing || !await allowRequest("simulate-contact", 30, 60, user.id)) return;
  const visit = await getVisit("simulador local");
  await db.pageView.createMany({ data: [{ listingId: listing.id, visitId: visit.id, isSimulated: true }], skipDuplicates: true });
  await db.contact.create({ data: { listingId: listing.id, visitId: visit.id, isSimulated: true, events: { create: { status: "INITIATED", actorId: user.id, note: "Consulta simulada desde una cuenta de prueba." } } } });
  revalidatePath("/admin"); revalidatePath("/anfitrion"); revalidatePath("/anfitrion/contactos"); revalidatePath("/anfitrion/metricas");
  redirect("/anfitrion/contactos");
}
