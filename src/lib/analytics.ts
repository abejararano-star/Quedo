import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { contactState, dateKey, DAY, funnelMetrics, lifecycleMetrics, retentionCohorts, type AnalyticsFilter } from "./analytics-math";

export function listingScope(filter: AnalyticsFilter): Prisma.ListingWhereInput {
  return filter.isTest ? { isDemo: true } : { isDemo: false, host: { isTest: false } };
}
export async function getAnalytics(filter: AnalyticsFilter, hostId?: string) {
  const where: Prisma.ListingWhereInput = { ...listingScope(filter), ...(hostId ? { hostId } : {}) };
  const period = { gte: filter.start, lt: filter.end };
  const [listings, views, contacts, hosts, memberships] = await Promise.all([
    db.listing.findMany({ where, include: { host: { select: { id: true, name: true, email: true, isTest: true } } }, orderBy: { createdAt: "desc" } }),
    db.pageView.findMany({ where: { listing: where, isSimulated: filter.isTest, createdAt: period }, include: { visit: { select: { source: true } } }, orderBy: { createdAt: "asc" } }),
    db.contact.findMany({ where: { listing: where, isSimulated: filter.isTest, createdAt: period }, include: { events: { where: { createdAt: { lt: filter.cutoff } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }, visit: { select: { source: true } }, listing: { select: { id: true, title: true, hostId: true, district: true, type: true } } }, orderBy: { createdAt: "desc" } }),
    db.user.findMany({ where: { role: "HOST", isTest: filter.isTest, ...(hostId ? { id: hostId } : {}), createdAt: { lt: filter.cutoff } }, select: { id: true, name: true, email: true, createdAt: true, isTest: true }, orderBy: { createdAt: "asc" } }),
    db.membershipEvent.findMany({ where: { host: { isTest: filter.isTest, ...(hostId ? { id: hostId } : {}) }, effectiveAt: { lt: filter.cutoff } }, orderBy: [{ effectiveAt: "asc" }, { createdAt: "asc" }, { id: "asc" }] }),
  ]);
  const funnel = funnelMetrics(views, contacts, filter.cutoff);
  const lifecycle = lifecycleMetrics(memberships, filter.start, filter.cutoff);
  const rows = listings.map(listing => {
    const listingViews = views.filter(view => view.listingId === listing.id);
    const listingContacts = contacts.filter(contact => contact.listingId === listing.id);
    const steps = funnelMetrics(listingViews, listingContacts, filter.cutoff);
    return { listing, views: listingViews.length, contacts: listingContacts.length, sessions: steps[0].count, contactedSessions: steps[1].count, conversion: steps[1].overall,
      confirmed: listingContacts.filter(contact => contactState(contact, filter.cutoff) === "CONFIRMED").length };
  });
  const daily = [];
  for (let time = filter.start.getTime(); time < filter.end.getTime(); time += DAY) {
    const day = dateKey(new Date(time));
    const seen = views.filter(view => dateKey(view.createdAt) === day);
    daily.push({ day, views: seen.length, sessions: new Set(seen.flatMap(view => view.visitId ? [view.visitId] : [])).size, contacts: contacts.filter(contact => dateKey(contact.createdAt) === day).length });
  }
  const sources = [...new Set(views.map(view => view.visit?.source ?? "sin atribución"))].map(source => {
    const sourceViews = views.filter(view => (view.visit?.source ?? "sin atribución") === source);
    const sourceContacts = contacts.filter(contact => (contact.visit?.source ?? "sin atribución") === source);
    const steps = funnelMetrics(sourceViews, sourceContacts, filter.cutoff);
    return { source, sessions: steps[0].count, contacts: steps[1].count, conversion: steps[1].overall };
  });
  const losses = contacts.filter(contact => contactState(contact, filter.cutoff) === "LOST");
  const lossBreakdown = [...new Set(losses.map(contact => contact.events.at(-1)?.lossReason ?? "Sin especificar"))].map(reason => ({ reason, count: losses.filter(contact => (contact.events.at(-1)?.lossReason ?? "Sin especificar") === reason).length }));
  return { filter, listings, views, contacts, hosts, memberships, funnel, lifecycle, rows, daily, sources, lossBreakdown, cohorts: retentionCohorts(memberships, filter.cutoff),
    unlinkedContacts: contacts.filter(contact => !contact.visitId).length, unlinkedViews: views.filter(view => !view.visitId).length };
}
export type AnalyticsReport = Awaited<ReturnType<typeof getAnalytics>>;
