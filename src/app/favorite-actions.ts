"use server";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowRequest } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

export async function setFavorite(_state: string, form: FormData) {
  const expectedUser = String(form.get("account"));
  const listingId = String(form.get("listing"));
  const saved = form.get("saved") === "yes";
  const user = await getUser();
  if (!user || user.id !== expectedUser) return "Tu sesión cambió. Recarga la página para continuar.";
  if (listingId.length > 191 || !await allowRequest("favorites", 120, 60, user.id)) return "No se pudo actualizar el favorito. Inténtalo más tarde.";
  if (saved) {
    const listing = await db.listing.findFirst({ where: { id: listingId, status: "PUBLISHED" }, select: { id: true } });
    if (!listing) return "Este alojamiento ya no está publicado.";
    await db.favorite.createMany({ data: [{ userId: user.id, listingId }], skipDuplicates: true });
  } else {
    await db.favorite.deleteMany({ where: { userId: user.id, listingId } });
  }
  revalidatePath("/", "layout");
  return "";
}
