export function canEditListing(user: { id: string; role: string; isTest?: boolean }, listing: { hostId: string; isDemo: boolean }) {
  return (!listing.isDemo || user.isTest === true) && (user.id === listing.hostId || user.role === "ADMIN");
}
export function canContactListing(listing: { status: string; isDemo: boolean; whatsapp: string | null }) {
  return listing.status === "PUBLISHED" && !listing.isDemo && /^57\d{10}$/.test(listing.whatsapp ?? "");
}
