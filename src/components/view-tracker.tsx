"use client";
import { useEffect, useRef } from "react";
export function ViewTracker({ listingId }: { listingId: string }) {
  const sent = useRef("");
  useEffect(() => {
    if (sent.current === listingId) return;
    sent.current = listingId;
    const source = new URLSearchParams(location.search).get("utm_source") ?? "directo";
    void fetch("/api/visitas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId, source }), keepalive: true }).catch(() => {});
  }, [listingId]);
  return null;
}
