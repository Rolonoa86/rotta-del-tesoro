import { kv } from "@vercel/kv";

function cookie(name, value, days = 365) {
  const maxAge = days * 24 * 60 * 60;
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
      return;
    }

    const { playerId } = req.body || {};
    if (!playerId || typeof playerId !== "string") {
      res.status(400).json({ ok: false, error: "MISSING_PLAYER_ID" });
      return;
    }

    const normalized = playerId.trim().toUpperCase();
    const key = `progress:${normalized}`;
    const progress = await kv.get(key);

    if (!progress) {
      res.status(404).json({ ok: false, error: "CODE_NOT_FOUND" });
      return;
    }

    res.setHeader("Set-Cookie", cookie("playerId", normalized));
    res.status(200).json({ ok: true, playerId: normalized });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
