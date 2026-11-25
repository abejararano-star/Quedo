"use client";
import { useActionState } from "react";
import { reportListing } from "@/app/actions";
export function ReportForm({ listingId }: { listingId: string }) {
  const [state, action, pending] = useActionState(reportListing, {});
  return <details className="report-form"><summary>Reportar un problema con este anuncio</summary><form action={action}><input type="hidden" name="listingId" value={listingId}/><label htmlFor="report-reason">Cuéntanos qué debemos revisar</label><textarea id="report-reason" name="reason" required minLength={15} maxLength={500} rows={3} placeholder="No incluyas datos personales sensibles."/>{state.error && <p role="status" className="form-message">{state.error}</p>}<button disabled={pending} className="button button-secondary">{pending ? "Enviando…" : "Enviar reporte"}</button></form></details>;
}
