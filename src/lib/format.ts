export function money(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
}
export function shortDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" }).format(new Date(value));
}
export const types = ["Apartaestudio", "Apartamento", "Habitación", "Casa"];
export const amenities = ["WiFi", "Cocina", "Aire acondicionado", "Zona de trabajo", "Lavadora", "Agua de reserva", "Respaldo de energía", "Admite mascotas"];
export const districts = ["Centro", "La Yesquita", "César Conto", "Medrano", "Aeropuerto"];
export function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
export const statusLabels: Record<string, string> = { DRAFT: "Borrador", PENDING: "En revisión", PUBLISHED: "Publicado", REJECTED: "Requiere cambios", PAUSED: "Pausado" };
