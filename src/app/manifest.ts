import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Pegel – Alkohol-Tagebuch",
    short_name: "Pegel",
    description: "Alkoholkonsum erfassen, Statistiken und transparente Modellschätzung.",
    lang: "de",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1014",
    theme_color: "#0d1014",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Getränk erfassen", short_name: "Erfassen", url: "/erfassen", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Kalender", url: "/kalender", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
