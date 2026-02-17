const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const detailEl = $("detail");
const btnGeo = $("btnGeo");
const btnAR = $("btnAR");
const btnContinue = $("btnContinue");

const dot = $("dot");
const badgeText = $("badgeText");

function setBadge(state) {
  if (state === "ok") {
    dot.className = "dot ok";
    badgeText.textContent = "Sigillo attivo";
  } else if (state === "bad") {
    dot.className = "dot bad";
    badgeText.textContent = "Sigillo chiuso";
  } else {
    dot.className = "dot";
    badgeText.textContent = "In attesa";
  }
}

function getStageId() {
  const u = new URL(location.href);
  return u.searchParams.get("stageId") || "1";
}

function toRad(deg){ return deg*Math.PI/180; }
function distanceMeters(lat1, lon1, lat2, lon2){
  const R=6371000;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getPosition() {
  if (!("geolocation" in navigator)) throw new Error("Geolocalizzazione non supportata.");
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    });
  });
}

async function loadProgress() {
  const r = await fetch("/api/progress", { credentials: "include" });
  return r.json();
}

const stageId = getStageId();
let stage = null;

(async () => {
  try {
    const j = await loadProgress();
    if (!j.ok) {
      statusEl.textContent = "Non sei registrato.";
      detailEl.textContent = "Apri /start.html dal QR oppure ripristina il codice.";
      setBadge("bad");
      return;
    }

    const unlocked = j.progress.unlocked || {};
    const it = unlocked[stageId];

    if (!it) {
      statusEl.textContent = "Tappa non sbloccata.";
      detailEl.textContent = "Torna alla home e sblocca questa tappa.";
      setBadge("bad");
      return;
    }

    stage = {
      lat: it.lat,
      lon: it.lon,
      radiusMeters: it.radiusMeters,
      arModel: it.arModel || "/pergamena.usdz"
    };

    btnAR.href = stage.arModel;
    btnContinue.href = `./pergamena.html?stageId=${encodeURIComponent(stageId)}`;

    statusEl.textContent = "Tappa sbloccata. Ora verifica GPS.";
    detailEl.textContent = `Raggio: ${stage.radiusMeters ?? "?"}m`;
    setBadge("idle");
  } catch (e) {
    statusEl.textContent = "Errore caricamento.";
    detailEl.textContent = e?.message || String(e);
    setBadge("bad");
  }
})();

btnGeo.addEventListener("click", async () => {
  try {
    if (!stage || typeof stage.lat !== "number" || typeof stage.lon !== "number") {
      statusEl.textContent = "Coordinate mancanti.";
      detailEl.textContent = "Inserisci lat/lon/radiusMeters in api/unlock.js e ridistribuisci.";
      setBadge("bad");
      return;
    }

    statusEl.textContent = "Verifico posizione…";
    const pos = await getPosition();
    const { latitude, longitude, accuracy } = pos.coords;

    const d = distanceMeters(latitude, longitude, stage.lat, stage.lon);
    const acc = Math.round(accuracy);

    if (d <= stage.radiusMeters) {
      statusEl.textContent = `GPS OK ✅ (accuratezza ~${acc}m)`;
      detailEl.textContent = "Ora puoi aprire l’AR e poi continuare.";
      btnAR.classList.remove("disabled");
      btnContinue.classList.remove("disabled");
      setBadge("ok");
    } else {
      statusEl.textContent = "Fuori area.";
      detailEl.textContent = `Distanza ~${Math.round(d)}m (acc ~${acc}m). Avvicinati e riprova.`;
      btnAR.classList.add("disabled");
      btnContinue.classList.add("disabled");
      setBadge("bad");
    }
  } catch (e) {
    statusEl.textContent = "Errore GPS.";
    detailEl.textContent = e?.message || String(e);
    setBadge("bad");
  }
});
