import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  try {
    const cookieHeader = req.headers.cookie || "";
    const playerId = cookieHeader.match(/playerId=([^;]+)/)?.[1];

    if (!playerId) {
      res.status(401).json({ ok: false, error: "NO_PLAYER" });
      return;
    }

    const key = `progress:${playerId.toUpperCase()}`;
    const progress = await kv.get(key);

    if (!progress) {
      res.status(404).json({ ok: false, error: "NOT_FOUND" });
      return;
    }

    res.status(200).json({ ok: true, progress });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
