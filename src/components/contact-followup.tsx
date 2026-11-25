"use client";
import { useActionState, useState } from "react";
import { updateContactStatus } from "@/app/portal-actions";
import { leadLabels, lossReasons } from "@/lib/analytics-math";
export function ContactFollowup({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(updateContactStatus, {});
  const [selected, setSelected] = useState(status);
  return <form action={action} className="followup-form"><input type="hidden" name="id" value={id}/><div className="form-columns"><label>Estado actual<select name="status" value={selected} onChange={event => setSelected(event.target.value)}>{Object.entries(leadLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>Motivo si no se concretó<select name="lossReason" required={selected === "LOST"} defaultValue=""><option value="">Seleccionar motivo</option>{lossReasons.map(reason => <option key={reason}>{reason}</option>)}</select></label></div><label>Nota de seguimiento<textarea name="note" maxLength={500} rows={2} placeholder="Describe el seguimiento sin datos sensibles del huésped."/></label><p className="analytics-note">“Estadía reportada” es una confirmación manual del anfitrión; Quedo no verifica el pago.</p>{state.error && <p className="form-message form-error" role="alert">{state.error}</p>}{state.success && <p className="form-message" role="status">{state.success}</p>}<button className="button button-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar seguimiento"}</button></form>;
}
