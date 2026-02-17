import { kv } from "@vercel/kv";

const STAGES = {
  "1": {
    title: "Capitolo I · Il Nodo del Vento",
    passphrase: "VELA NERA",
    lat: 41.918021, lon: 12.567118, radiusMeters: 10,
    arModel: "/pergamena.usdz",
    pdf: "/rotta-parte-2.pdf"
  },
  "2": {
    title: "Capitolo II · L'Ossa del Porto",
    passphrase: "SALE E RUM",
    lat: 0, lon: 0, radiusMeters: 80,
    arModel: "/pergamena.usdz",
    pdf: "/rotta-parte-3.pdf"
  }
  // aggiungi quante tappe vuoi...
};

function norm(s) {
  return (s || "").toString().trim().toUpperCase();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
      return;
    }

    const { stageId, passphrase } = req.body || {};
    const id = String(stageId || "").trim();

    const stage = STAGES[id];
    if (!stage) {
      res.status(404).json({ ok: false, error: "STAGE_NOT_FOUND" });
      return;
    }

    const cookieHeader = req.headers.cookie || "";
    const playerId = cookieHeader.match(/playerId=([^;]+)/)?.[1];
    if (!playerId) {
      res.status(401).json({ ok: false, error: "NO_PLAYER" });
      return;
    }

    if (norm(passphrase) !== norm(stage.passphrase)) {
      res.status(200).json({ ok: false, error: "WRONG_PASSPHRASE" });
      return;
    }

    const key = `progress:${norm(playerId)}`;
    const progress = await kv.get(key);

    if (!progress) {
      res.status(404).json({ ok: false, error: "PLAYER_NOT_FOUND" });
      return;
    }

    // ✅ SALVATAGGIO COMPLETO: include coordinate per GPS
    progress.unlocked[id] = {
      at: new Date().toISOString(),
      stageId: id,
      title: stage.title,
      pdf: stage.pdf,
      arModel: stage.arModel,
      lat: stage.lat,
      lon: stage.lon,
      radiusMeters: stage.radiusMeters
    };
    progress.lastStage = id;

    await kv.set(key, progress);

    res.status(200).json({
      ok: true,
      stage: {
        stageId: id,
        title: stage.title,
        lat: stage.lat,
        lon: stage.lon,
        radiusMeters: stage.radiusMeters,
        arModel: stage.arModel,
        pdf: stage.pdf
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
