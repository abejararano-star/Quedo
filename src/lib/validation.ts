import { z } from "zod";
import { amenities, types, districts } from "./format";

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(100),
  email: z.email("Escribe un correo válido.").max(190).transform(value => value.toLowerCase()),
  password: z.string().min(12, "Usa una contraseña de al menos 12 caracteres.").max(128),
  consent: z.literal("on", { error: "Debes aceptar las condiciones para crear tu cuenta." }),
});
export const loginSchema = z.object({ email: z.email().max(190).transform(value => value.toLowerCase()), password: z.string().min(1).max(128) });
export const listingSchema = z.object({
  title: z.string().trim().min(8, "El título debe tener al menos 8 caracteres.").max(100),
  summary: z.string().trim().min(20, "Añade un resumen de al menos 20 caracteres.").max(250),
  description: z.string().trim().min(60, "Describe tu alojamiento en al menos 60 caracteres.").max(6000),
  district: z.enum(districts as [string, ...string[]]),
  type: z.enum(types as [string, ...string[]]),
  capacity: z.coerce.number().int().min(1).max(30),
  bedrooms: z.coerce.number().int().min(0).max(20),
  beds: z.coerce.number().int().min(1).max(30),
  bathrooms: z.coerce.number().int().min(1).max(20),
  priceNight: z.coerce.number().int().min(10000, "La tarifa mínima es $10.000 COP.").max(20000000),
  priceWeek: z.preprocess(value => value === "" || value === null ? undefined : value, z.coerce.number().int().min(10000).max(140000000).optional()),
  extraCosts: z.string().trim().min(5, "Indica los cargos adicionales, o escribe que no hay.").max(500),
  houseRules: z.string().trim().min(10, "Añade las reglas y condiciones de cancelación.").max(3000),
  whatsapp: z.string().trim().regex(/^57[0-9]{10}$/, "Usa el formato 573001234567, sin espacios."),
  rnt: z.string().trim().regex(/^[0-9]{3,20}$/, "Indica el número de RNT para revisión."),
  amenities: z.array(z.enum(amenities as [string, ...string[]])).max(amenities.length),
});
export function validatePhoto(bytes: Uint8Array) {
  if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: "jpg", mime: "image/jpeg" };
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return { extension: "png", mime: "image/png" };
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { extension: "webp", mime: "image/webp" };
  return null;
}
export function getListingSchema(testMode: boolean) {
  return testMode ? listingSchema.extend({ whatsapp: z.string().max(20).default(""), rnt: z.string().max(30).default("") }) : listingSchema;
}
export function normalizeSlug(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}
export function parseConsultation(arrival: unknown, people: unknown) {
  const date = typeof arrival === "string" && /^\d{4}-\d{2}-\d{2}$/.test(arrival) ? new Date(`${arrival}T12:00:00Z`) : null;
  const validArrival = date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === arrival ? arrival as string : "";
  const count = Number(people);
  return { arrival: validArrival, people: Number.isInteger(count) && count >= 1 && count <= 30 ? String(count) : "" };
}
