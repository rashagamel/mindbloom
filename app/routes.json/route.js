import { content, levels, library, vocab, sounds, owl } from "@/lib/content";

export const dynamic = "force-static";

// Every page the offline service worker should keep. Built from the same JSON the app uses,
// so adding a level, a video or a word category needs no change here.
export function GET() {
  const routes = ["/", "/about", "/garden", "/rewards", "/lab", "/library", "/match", "/parent", "/profiles", "/worksheets", "/report", "/start", "/safari", "/owl", "/superpower"];
  for (const g of sounds.games) routes.push(`/safari/${g.id}`);
  for (const g of owl.games) routes.push(`/owl/${g.id}`);
  for (const d of content.domains) {
    routes.push(`/play/${d.id}`, `/monster/${d.id}`, `/check/${d.id}`);
    if (d.memory) routes.push(`/memory/${d.id}`);
    (d.groups ?? []).forEach((_, i) => routes.push(`/twins/${d.id}/${i}`));
  }
  for (const w of levels.worlds) {
    routes.push(`/world/${w.domain}`);
    for (const l of w.levels) routes.push(`/level/${w.domain}/${l.id}`);
  }
  for (const c of vocab.categories) routes.push(`/match/${c.id}`);
  routes.push("/match/mix", "/match/shapes");
  for (const i of library.items) routes.push(`/library/${encodeURIComponent(i.id)}`);
  const files = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];
  return Response.json({ version: String(routes.length), routes, files });
}
