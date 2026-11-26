// Accepts a YouTube video id or any common YouTube link and returns the 11-character id (or null).
export function youtubeId(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (/^[\w-]{11}$/.test(v)) return v;
  try {
    const u = new URL(v);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] ?? null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
