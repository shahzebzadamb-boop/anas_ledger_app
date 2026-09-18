import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Anas Ledger",
    short_name: "Anas Ledger",
    description: "Client money management and accounting",
    start_url: "/",
    display: "standalone",
    background_color: "#111214",
    theme_color: "#111214",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
