import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient();
async function main() {
  const host = await db.user.upsert({ where: { email: "demo@quedo.invalid" }, update: {}, create: { id: "quedo-demo-host", name: "Anfitrión de ejemplo", email: "demo@quedo.invalid", passwordHash: await hashPassword(randomBytes(48).toString("hex")), role: "HOST", isTest: true } });
  if (host.id !== "quedo-demo-host" || host.role !== "HOST") throw new Error("El correo de demostración pertenece a otra cuenta.");
  const examples = [
    { slug: "luz-y-calma-en-el-centro", title: "Luz y calma en el Centro", district: "Centro", type: "Apartaestudio", capacity: 2, beds: 1, bedrooms: 1, priceNight: 125000, priceWeek: 780000, amenities: ["WiFi", "Cocina", "Aire acondicionado", "Zona de trabajo"], photo: 1, featured: true },
    { slug: "un-espacio-para-compartir", title: "Un espacio para compartir", district: "La Yesquita", type: "Apartamento", capacity: 4, beds: 3, bedrooms: 2, priceNight: 185000, priceWeek: 1150000, amenities: ["WiFi", "Cocina", "Lavadora", "Aire acondicionado"], photo: 2, featured: true },
    { slug: "tu-rincon-para-desconectar", title: "Tu rincón para desconectar", district: "César Conto", type: "Habitación", capacity: 2, beds: 1, bedrooms: 1, priceNight: 85000, priceWeek: 510000, amenities: ["WiFi", "Zona de trabajo", "Aire acondicionado"], photo: 3, featured: true },
    { slug: "dias-a-tu-ritmo", title: "Días a tu ritmo", district: "Medrano", type: "Apartaestudio", capacity: 2, beds: 1, bedrooms: 1, priceNight: 110000, priceWeek: 680000, amenities: ["WiFi", "Cocina", "Zona de trabajo", "Agua de reserva"], photo: 4, featured: true },
    { slug: "la-casa-de-los-buenos-dias", title: "La casa de los buenos días", district: "Aeropuerto", type: "Casa", capacity: 6, beds: 4, bedrooms: 3, priceNight: 230000, priceWeek: 1400000, amenities: ["WiFi", "Cocina", "Lavadora", "Admite mascotas", "Agua de reserva"], photo: 5, featured: false },
    { slug: "un-nuevo-punto-de-partida", title: "Un nuevo punto de partida", district: "Centro", type: "Apartamento", capacity: 3, beds: 2, bedrooms: 2, priceNight: 155000, priceWeek: 950000, amenities: ["WiFi", "Cocina", "Zona de trabajo", "Respaldo de energía"], photo: 6, featured: false },
  ];
  for (const { photo, ...example } of examples) {
    const exists = await db.listing.findUnique({ where: { slug: example.slug } });
    if (exists) continue; // Never overwrite an existing record on a subsequent seed.
    await db.listing.create({ data: { ...example, id: `demo-${example.slug}`, city: "Quibdó", bathrooms: 1, hostId: host.id, status: "PUBLISHED", isDemo: true, whatsapp: null, rnt: null,
      summary: "Espacio ilustrativo para explorar el diseño de Quedo. Sus condiciones y ubicación son ejemplos, no una oferta real.",
      description: "Este anuncio forma parte del catálogo de demostración. Permite conocer cómo se presentan los ambientes, los servicios y las condiciones de una estadía.\n\nLas fotografías son imágenes de referencia de interiores; no corresponden a una propiedad identificada en Quibdó. Los valores y servicios son ficticios y sirven únicamente para probar la navegación y los filtros.",
      photos: [`/images/apartment-${photo}.jpg`, `/images/apartment-${photo % 6 + 1}.jpg`, `/images/apartment-${(photo + 1) % 6 + 1}.jpg`],
      extraCosts: "Ejemplo: sin cargos adicionales. Debe confirmarse el precio total en una oferta real.",
      houseRules: "Condiciones ilustrativas.\nEntrada y salida por acordar con el anfitrión.\nReglas de convivencia y cancelación pendientes de una oferta real.\nEste anuncio no acepta contactos ni reservas.",
    } });
  }
  console.log("Catálogo de demostración preparado: 6 ejemplos sin contacto comercial.");
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
