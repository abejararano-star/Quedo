import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { analyticsFilter, filterQuery, type AnalyticsParams } from "@/lib/analytics-math";
import { getAnalytics } from "@/lib/analytics";
import { PortalNav } from "@/components/portal-nav";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { logout } from "@/app/actions";
export const metadata: Metadata = { title: "Métricas y administración" };
export default async function Admin({ searchParams }: { searchParams: Promise<AnalyticsParams> }) {
  const user = await requireAdmin();
  const filter = analyticsFilter(await searchParams, user.isTest);
  const report = await getAnalytics(filter);
  return <div className="container page-space"><div className="workspace-header"><div><p className="eyebrow">ADMINISTRACIÓN DE QUEDO</p><h1>Entiende qué mueve Quedo.</h1><p>Actividad, conversión y permanencia con datos que puedes revisar.</p></div><form action={logout}><button className="button button-secondary">Cerrar sesión</button></form></div><PortalNav admin active="/admin" query={filterQuery(filter)}/><AnalyticsPanel report={report}/></div>;
}
