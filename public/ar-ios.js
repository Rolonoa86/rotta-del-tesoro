const $ = (id) => document.getElementById(id);

const statusEl = $("status");
const detailEl = $("detail");
const btnGeo = $("btnGeo");
const btnAR = $("btnAR");

const STORAGE_KEY = "navarro_unlock_v1";

function getStageId() {
  const u = new URL(location.href);
  return u.searchParams.get("stageId") || "1";
}

function loadUnlocked(stageId) {
  const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  return all[stageId] || null;
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

const stageId = getStageId();
const unlocked = loadUnlocked(stageId);

if (!unlocked?.token || !unlocked?.stage) {
  statusEl.textContent = "Questa tappa non è sbloccata.";
  detailEl.textContent = "Torna alla Bussola e inserisci la frase segreta.";
} else {
  statusEl.textContent = `Tappa ${stageId} sbloccata. Ora verifica il GPS.`;
  detailEl.textContent = `Raggio: ${unlocked.stage.radiusMeters}m`;
}

btnGeo.addEventListener("click", async () => {
  try {
    statusEl.textContent = "Verifico posizione…";
    const pos = await getPosition();
    const { latitude, longitude, accuracy } = pos.coords;

    const d = distanceMeters(latitude, longitude, unlocked.stage.lat, unlocked.stage.lon);
    const acc = Math.round(accuracy);

    if (d <= unlocked.stage.radiusMeters) {
      statusEl.textContent = `GPS OK ✅ (accuratezza ~${acc}m)`;
      detailEl.textContent = "Ora puoi aprire l’AR.";
      btnAR.classList.remove("disabled");
    } else {
      statusEl.textContent = "Fuori area.";
      detailEl.textContent = `Distanza ~${Math.round(d)}m (acc ~${acc}m). Avvicinati e riprova.`;
      btnAR.classList.add("disabled");
    }
  } catch (e) {
    statusEl.textContent = "Errore GPS.";
    detailEl.textContent = e?.message || String(e);
  }
});
