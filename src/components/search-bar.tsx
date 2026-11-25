"use client";
import { useState } from "react";
import { stayQuote, todayInBogota } from "@/lib/stay-quote";
import { MapPin, CalendarDays, UsersRound, Search } from "lucide-react";
export function SearchBar({ compact = false, q = "", people = "", date = "", departure = "" }: { compact?: boolean; q?: string; people?: string; date?: string; departure?: string }) {
  const [error, setError] = useState("");
  return <form onChange={() => setError("")} onSubmit={event => {
    const form = new FormData(event.currentTarget);
    const quote = stayQuote(String(form.get("llegada") || ""), String(form.get("salida") || ""), String(form.get("personas") || "1"), 30, null, todayInBogota());
    if (quote.error) { event.preventDefault(); setError(quote.error); }
  }} action="/estadias" className={`search-bar ${compact ? "search-compact" : ""}`} role="search"><label className="search-field"><MapPin size={20}/><span><span className="search-label">¿Dónde te quedas?</span><input name="q" placeholder="Explora Quibdó" defaultValue={q} maxLength={100} aria-label="Ciudad, barrio o alojamiento"/></span></label><label className="search-field"><CalendarDays size={20}/><span><span className="search-label">Entrada</span><input aria-label="Fecha para consultar al anfitrión" type="date" name="llegada" defaultValue={date}/></span></label><label className="search-field"><CalendarDays size={20}/><span><span className="search-label">Salida</span><input aria-label="Fecha de salida" type="date" name="salida" defaultValue={departure}/></span></label><label className="search-field"><UsersRound size={20}/><span><span className="search-label">¿Quiénes vienen?</span><select name="personas" defaultValue={people} aria-label="Número de huéspedes"><option value="">Agrega huéspedes</option>{Array.from({ length: 30 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? "huésped" : "huéspedes"}</option>)}</select></span></label><button className="button button-primary search-submit"><Search size={19}/><span>Buscar estadías</span></button>{error && <p style={{ gridColumn: "1/-1" }} role="alert">{error}</p>}</form>;
}
