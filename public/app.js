// public/app.js
const $ = (id) => document.getElementById(id);

// --- Rilevo pagina ---
const isStartPage = !!$("btnEnter") && !!$("capCode") && !$("stageId");
const isIndexPage = !!$("stageId") && !!$("btnUnlock");

const MAX_STAGES = 10;

// --- Helpers UI (generici) ---
function showMsg(text, kind = "ok") {
  const el = $("msg");
  if (!el) return;
  el.style.display = "block";
  el.className = `msg ${kind === "bad" ? "bad" : kind === "ok" ? "ok" : ""}`.trim();
  el.textContent = text;
}

function hideMsg() {
  const el = $("msg");
  if (!el) return;
  el.style.display = "none";
  el.textContent = "";
  el.className = "msg";
}

// --- API helpers ---
async function apiJSON(url, opts = {}) {
  const r = await fetch(url, { credentials: "include", ...opts });
  const j = await r.json().catch(() => ({}));
  return { r, j };
}

// ===== START PAGE LOGIC =====
async function ensurePlayerAndShowCode() {
  // 1) start (set cookie)
  const { r: r1, j: j1 } = await apiJSON("/api/start", { method: "POST" });
  if (!r1.ok || !j1?.ok) throw new Error(j1?.error || "START_FAILED");

  // 2) progress (source of truth for playerId)
  const { r: r2, j: j2 } = await apiJSON("/api/progress");
  if (!r2.ok || !j2?.ok) throw new Error(j2?.error || "PROGRESS_FAILED");

  const pid = j2?.progress?.playerId;
  const capEl = $("capCode");
  if (capEl) capEl.textContent = pid || "—";
}

async function restoreFlow() {
  // Provo a chiamare /api/restore se esiste.
  // Se nel tuo backend non c’è, ti mostra un messaggio e basta.
  const code = prompt("Inserisci il Codice Capitano (esatto):");
  if (!code) return;

  const { r, j } = await apiJSON("/api/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId: code.trim() })
  });

  if (r.status === 404) {
    showMsg("Ripristino non disponibile: manca /api/restore nel backend.", "bad");
    return;
  }

  if (!r.ok || !j?.ok) {
    showMsg("Codice non valido o errore di ripristino.", "bad");
    return;
  }

  showMsg("Ripristino riuscito. Ricarico…", "ok");
  setTimeout(() => location.reload(), 600);
}

async function bootStart() {
  hideMsg();

  const btnEnter = $("btnEnter");
  const btnRestore = $("btnRestore");

  btnEnter?.addEventListener("click", () => {
    location.href = "/index.html";
  });

  btnRestore?.addEventListener("click", async () => {
    hideMsg();
    try { await restoreFlow(); } catch (e) {
      showMsg(e?.message || String(e), "bad");
    }
  });

  try {
    await ensurePlayerAndShowCode();
  } catch (e) {
    showMsg("Errore avvio: " + (e?.message || String(e)), "bad");
  }
}

// ===== INDEX PAGE LOGIC =====
function fillStages() {
  const stageIdEl = $("stageId");
  stageIdEl.innerHTML = "";
  for (let i = 1; i <= MAX_STAGES; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = `Tappa ${i}`;
    stageIdEl.appendChild(opt);
  }
}

async function loadProgress() {
  const { r, j } = await apiJSON("/api/progress");
  if (!r.ok || !j?.ok) throw new Error(j?.error || "PROGRESS_FAILED");
  return j.progress;
}

function renderProgress(progress) {
  const statusEl = $("status");
  const hintEl = $("hint");
  const listEl = $("unlockedList");
  const captainSmall = $("captainSmall");
  const btnAR = $("btnAR");

  captainSmall.textContent = progress.playerId ? `Capitano: ${progress.playerId}` : "—";

  const unlocked = progress.unlocked || {};
  const keys = Object.keys(unlocked).sort((a,b) => Number(a)-Number(b));

  listEl.innerHTML = "";

  if (!keys.length) {
    statusEl.textContent = "Nessuna tappa sbloccata.";
    hintEl.textContent = "Inserisci la soluzione di una tappa per sbloccare i contenuti.";
    btnAR.classList.add("disabled");
    return;
  }

  statusEl.textContent = `Tappe sbloccate: ${keys.length} · Ultima: ${progress.lastStage || keys[keys.length-1]}`;
  hintEl.textContent = "Qui trovi tutti i capitoli sbloccati (PDF).";

  keys.forEach((k) => {
    const it = unlocked[k];
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <b>Tappa ${k}: ${it.title || ""}</b>
      <div style="margin-top:8px;">
        <a href="${it.pdf}" target="_blank" rel="noopener">Apri PDF sbloccato</a>
      </div>
      <div class="smallMuted" style="margin-top:8px;">
        Sbloccata: ${new Date(it.at).toLocaleString()}
      </div>
    `;
    listEl.appendChild(div);
  });

  const selected = $("stageId").value;
  if (unlocked[selected]) {
    btnAR.href = `./ar-ios.html?stageId=${encodeURIComponent(selected)}`;
    btnAR.classList.remove("disabled");
  } else {
    btnAR.classList.add("disabled");
  }
}

async function bootIndex() {
  hideMsg();

  $("btnGoStart")?.addEventListener("click", () => {
    location.href = "/start.html";
  });

  fillStages();

  $("stageId").addEventListener("change", async () => {
    try {
      const p = await loadProgress();
      renderProgress(p);
    } catch {}
  });

  $("btnUnlock").addEventListener("click", async () => {
    hideMsg();

    const stageId = $("stageId").value;
    const passphrase = $("passphrase").value;

    $("status").textContent = "Controllo la soluzione…";
    $("hint").textContent = "";

    try {
      const { r, j } = await apiJSON("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId, passphrase })
      });

      if (!r.ok || !j?.ok) {
        showMsg(
          j?.error === "WRONG_PASSPHRASE"
            ? "Soluzione respinta. Rileggi gli indizi."
            : `Errore: ${j?.error || "UNLOCK_FAILED"}`,
          "bad"
        );
        $("status").textContent = "Soluzione respinta.";
        return;
      }

      showMsg(`Tappa ${stageId} sbloccata ✅`, "ok");
      const p = await loadProgress();
      renderProgress(p);
    } catch (e) {
      showMsg(e?.message || String(e), "bad");
      $("status").textContent = "Errore di rete.";
    }
  });

  try {
    // assicura player cookie
    const { r, j } = await apiJSON("/api/start", { method: "POST" });
    if (!r.ok || !j?.ok) throw new Error(j?.error || "START_FAILED");

    const p = await loadProgress();
    renderProgress(p);
  } catch (e) {
    showMsg("Errore avvio registro: " + (e?.message || String(e)), "bad");
    $("status").textContent = "Non sei registrato.";
    $("hint").textContent = "Apri /start.html dal QR oppure usa Ripristina.";
  }
}

// ===== BOOT =====
(async () => {
  if (isStartPage) return bootStart();
  if (isIndexPage) return bootIndex();
})();
