import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "CHANGE_ME_IN_VERCEL_ENV";

// Tappe (soluzioni SOLO qui)
const STAGES_SECRET = {
  "1": {
    passphrase: "VELA NERA",
    lat: 41.918021,
    lon: 12.567118,
    radiusMeters: 25
  }
};

function normalize(s) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Use POST" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const stageId = String(body.stageId || "");
  const passphrase = normalize(body.passphrase);

  const stage = STAGES_SECRET[stageId];
  if (!stage) return res.status(404).json({ ok: false, error: "Stage not found" });

  if (passphrase !== normalize(stage.passphrase)) {
    return res.status(401).json({ ok: false, error: "Wrong passphrase" });
  }

  const token = jwt.sign(
    { stageId, scope: "stage_access" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return res.status(200).json({
    ok: true,
    token,
    stage: {
      stageId,
      lat: stage.lat,
      lon: stage.lon,
      radiusMeters: stage.radiusMeters
    }
  });
}
