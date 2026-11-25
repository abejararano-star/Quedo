"use client";
import { Share2 } from "lucide-react";
import { useState } from "react";
export function ShareButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");
  return <button className="share-button" onClick={async () => { try { if (navigator.share) await navigator.share({ title, url: location.href }); else { await navigator.clipboard.writeText(location.href); setMessage("Enlace copiado"); } } catch { setMessage("Puedes copiar el enlace de la barra del navegador."); } }}><Share2 size={18}/><span aria-live="polite">{message || "Compartir"}</span></button>;
}
