"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="container not-found"><h1>No pudimos cargar este espacio.</h1><p>Inténtalo otra vez en unos momentos.</p><button className="button button-primary" onClick={reset}>Volver a intentar</button></div>;
}
