"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { contactHost } from "@/app/actions";
import { money } from "@/lib/format";
import { stayQuote } from "@/lib/stay-quote";

type Props = { slug: string; arrival: string; departure: string; people: string; today: string; capacity: number; priceNight: number; extraCosts: string; enabled: boolean; demo: boolean };
export function StayConsultation(props: Props) {
  const [arrival, setArrival] = useState(props.arrival);
  const [departure, setDeparture] = useState(props.departure);
  const [people, setPeople] = useState(props.people || "1");
  const quote = stayQuote(arrival, departure, people, props.capacity, props.priceNight, props.today);
  return <form action={contactHost} className="stay-form">
    <input type="hidden" name="slug" value={props.slug}/>
    <h3>Consulta tu estadía</h3><p>Disponibilidad sin confirmar. El anfitrión debe comprobar las fechas.</p>
    <div className="stay-dates"><label>Entrada<input type="date" name="arrival" min={props.today} value={arrival} onChange={e => setArrival(e.target.value)}/></label>
    <label>Salida<input type="date" name="departure" min={arrival || props.today} value={departure} onChange={e => setDeparture(e.target.value)}/></label></div>
    <label>Huéspedes<input type="number" name="people" required min="1" max={props.capacity} value={people} onChange={e => setPeople(e.target.value)}/></label>
    <div aria-live="polite">{quote.error ? <p className="form-error">{quote.error}</p> : quote.nights > 0 && <div className="stay-estimate">
      <span>{quote.nights} {quote.nights === 1 ? "noche" : "noches"}{quote.subtotal !== null && <> × {money(props.priceNight)} COP</>}</span>
      <strong>Subtotal estimado del alojamiento<br/>{quote.subtotal === null ? "Por confirmar" : money(quote.subtotal) + " COP"}</strong>
      <p>Cargos informados por el anfitrión: {props.extraCosts}</p><p>Confirma los cargos adicionales, descuentos y precio final con el anfitrión.</p></div>}</div>
    {props.enabled ? <button disabled={!!quote.error} className="button button-primary whatsapp-button"><MessageCircle size={20}/>Consultar por WhatsApp</button> :
      <p className="demo-contact">{props.demo ? "El contacto está deshabilitado en los espacios de ejemplo." : "El contacto se habilitará cuando el anuncio esté publicado."}</p>}
  </form>;
}