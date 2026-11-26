export const dynamic = "force-static";

export default function manifest() {
  return {
    name: "MindBloom",
    short_name: "MindBloom",
    description: "Bilingual letters and numbers for children aged 3 to 6",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff7e6",
    theme_color: "#ff7a59",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
