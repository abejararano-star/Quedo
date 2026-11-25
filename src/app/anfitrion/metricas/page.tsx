import { requireUser } from "@/lib/auth";
import { analyticsFilter, filterQuery, type AnalyticsParams } from "@/lib/analytics-math";
import { getAnalytics } from "@/lib/analytics";
import { PortalNav } from "@/components/portal-nav";
import { AnalyticsPanel } from "@/components/analytics-panel";
export default async function HostMetrics({ searchParams }: { searchParams: Promise<AnalyticsParams> }) {
  const user = await requireUser();
  const filter = analyticsFilter({ ...await searchParams, datos: user.isTest ? "prueba" : "reales" }, user.isTest);
  const report = await getAnalytics(filter, user.id);
  return <div className="container page-space"><div className="workspace-header"><div><p className="eyebrow">TU PANEL DE ANFITRIÓN</p><h1>Cómo va tu espacio.</h1><p>Consulta el interés y los resultados reportados de tus anuncios.</p></div></div><PortalNav active="/anfitrion/metricas" query={filterQuery(filter)}/><AnalyticsPanel report={report} hostOnly/></div>;
}
