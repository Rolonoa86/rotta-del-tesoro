import { kv } from "@vercel/kv";

function makeId() {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NAV-${chunk()}-${chunk()}`;
}

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

    const cookieHeader = req.headers.cookie || "";
    const existing = cookieHeader.match(/playerId=([^;]+)/)?.[1];

    const playerId = (existing || makeId()).trim().toUpperCase();
    const key = `progress:${playerId}`;

    const exists = await kv.get(key);
    if (!exists) {
      const payload = {
        playerId,
        createdAt: new Date().toISOString(),
        unlocked: {},
        lastStage: null
      };
      await kv.set(key, payload);
    }

    res.setHeader("Set-Cookie", cookie("playerId", playerId));
    res.status(200).json({ ok: true, playerId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
