import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Quedo · Tu lugar en Quibdó", short_name: "Quedo", description: "Explora espacios para quedarte en Quibdó.", start_url: "/", display: "standalone", background_color: "#ffffff", theme_color: "#102c42", lang: "es-CO", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }] };
}
