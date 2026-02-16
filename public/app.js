const $ = (id) => document.getElementById(id);

const stageIdEl = $("stageId");
const passEl = $("passphrase");
const btnUnlock = $("btnUnlock");
const btnAR = $("btnAR");
const statusEl = $("status");
const mapEl = $("map");
const coordsEl = $("coords");

const STORAGE_KEY = "navarro_unlock_v1";

function saveUnlocked(stageId, token, stage) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  all[stageId] = { token, stage };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function loadUnlocked(stageId) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return all[stageId] || null;
}

function renderUnlocked(stageId) {
  const u = loadUnlocked(stageId);
  if (!u) {
    statusEl.textContent = "Nessuna tappa sbloccata.";
    mapEl.hidden = true;
    coordsEl.hidden = true;
    btnAR.classList.add("disabled");
    return;
  }

  const { lat, lon, radiusMeters } = u.stage;
  statusEl.textContent = `Tappa ${stageId} sbloccata. Vai al punto e apri la modalità AR.`;

  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}`;
  mapEl.innerHTML = `
    <div style="padding:12px;">
      <a href="${osmLink}" target="_blank" rel="noopener" style="color:#8fb3ff; font-weight:800;">
        Apri mappa
      </a>
      <div style="margin-top:8px; color:#b8c4d8; font-size:13px;">
        Il segno apparirà entro ~${radiusMeters}m dal punto.
      </div>
    </div>
  `;
  mapEl.hidden = false;

  coordsEl.textContent = `Coordinate: ${lat.toFixed(6)}, ${lon.toFixed(6)} · Raggio: ${radiusMeters}m`;
  coordsEl.hidden = false;

  btnAR.href = `./ar-ios.html?stageId=${encodeURIComponent(stageId)}`;
  btnAR.classList.remove("disabled");
}

btnUnlock.addEventListener("click", async () => {
  const stageId = stageIdEl.value;
  const passphrase = passEl.value;

  statusEl.textContent = "Verifico...";
  try {
    const r = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageId, passphrase })
    });
    const data = await r.json();
    if (!data.ok) {
      statusEl.textContent = `Errore: ${data.error || "sblocco fallito"}`;
      return;
    }
    saveUnlocked(stageId, data.token, data.stage);
    renderUnlocked(stageId);
  } catch (e) {
    statusEl.textContent = `Errore rete: ${e?.message || e}`;
  }
});

renderUnlocked(stageIdEl.value);
