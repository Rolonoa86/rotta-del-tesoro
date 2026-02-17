// public/app.js
const $ = (id) => document.getElementById(id);

/* ---------------------------
   START PAGE (start.html)
   Usa window.__UI definito in start.html
---------------------------- */
async function initStartPage() {
  if (!window.__UI) return false;

  const { capCodeEl, msgEl, btnEnter, btnRestore } = window.__UI;

  const showMsg = (text, kind = "note") => {
    msgEl.style.display = "block";
    msgEl.className = `note ${kind === "bad" ? "error" : kind === "ok" ? "ok" : ""}`.trim();
    msgEl.textContent = text;
  };

  async function startPlayer() {
    // Crea/assicura player cookie server-side
    const r = await fetch("/api/start", { method: "POST", credentials: "include" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) throw new Error(j?.error || "START_FAILED");
    // /api/start nel tuo backend di solito restituisce progress/playerId
    // Se non lo fa, va bene lo stesso: capCode resta “—”.
    const playerId = j?.playerId || j?.progress?.playerId || j?.progress?.player || j?.id;
    if (playerId) capCodeEl.textContent = playerId;
  }

  // Avvio: registra e mostra codice
  try {
    await startPlayer();
  } catch (e) {
    showMsg("Errore avvio: controlla KV_REST_API_URL/TOKEN e redeploy.", "bad");
  }

  // Entra nella rotta
  btnEnter.addEventListener("click", () => {
    window.location.href = "/index.html";
  });

  // Ripristina: chiede un codice e prova a “impostarlo”
  // Nota: per un ripristino vero serve una rotta API (es. /api/restore) che imposti cookie/player
  btnRestore.addEventListener("click", async () => {
    const code = prompt("Inserisci il Codice Capitano:");
    if (!code) return;

    try {
      const r = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playerId: code.trim() })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        showMsg("Ripristino non disponibile (manca /api/restore) oppure codice errato.", "bad");
        return;
      }
      capCodeEl.textContent = code.trim();
      showMsg("Ripristinato ✅ Ora puoi entrare nella rotta.", "ok");
    } catch {
      showMsg("Ripristino fallito (rete o API non presente).", "bad");
    }
  });

  return true;
}

/* ---------------------------
   REGISTRO PAGE (index.html)
   La tua logica originale, resa “safe”
---------------------------- */
async function initRegisterPage() {
  const stageIdEl = $("stageId");
  const passEl = $("passphrase");
  const btnUnlock = $("btnUnlock");
  const btnAR = $("btnAR");
  const statusEl = $("status");
  const hintEl = $("hint");
  const listEl = $("unlockedList");
  const captainSmall = $("captainSmall");
  const dot = $("dot");
  const badgeText = $("badgeText");

  // Se questi elementi non ci sono, non è la pagina registro
  if (!stageIdEl || !passEl || !btnUnlock || !btnAR || !statusEl || !hintEl || !listEl || !captainSmall || !dot || !badgeText) {
    return false;
  }

  const MAX_STAGES = 10;

  function setBadge(state) {
    if (state === "ok") {
      dot.className = "dot ok";
      badgeText.textContent = "Sigillo aperto";
    } else if (state === "bad") {
      dot.className = "dot bad";
      badgeText.textContent = "Sigillo respinto";
    } else {
      dot.className = "dot";
      badgeText.textContent = "Sigillo chiuso";
    }
  }

  function fillStages() {
    stageIdEl.innerHTML = "";
    for (let i = 1; i <= MAX_STAGES; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Tappa ${i}`;
      stageIdEl.appendChild(opt);
    }
  }

  async function ensurePlayer() {
    await fetch("/api/start", { method: "POST", credentials: "include" });
  }

  async function loadProgress() {
    const r = await fetch("/api/progress", { credentials: "include" });
    return r.json();
  }

  function renderProgress(progress) {
    captainSmall.textContent = `Capitano: ${progress.playerId}`;

    const unlocked = progress.unlocked || {};
    const keys = Object.keys(unlocked).sort((a,b) => Number(a)-Number(b));

    listEl.innerHTML = "";

    if (!keys.length) {
      statusEl.textContent = "Nessuna tappa sbloccata.";
      hintEl.textContent = "Inserisci la soluzione di una tappa per sbloccare i contenuti.";
      btnAR.classList.add("disabled");
      setBadge("idle");
      return;
    }

    statusEl.textContent = `Tappe sbloccate: ${keys.length} · Ultima: ${progress.lastStage || keys[keys.length-1]}`;
    hintEl.textContent = "Qui trovi tutti i capitoli sbloccati (romanzo/diario in PDF).";

    keys.forEach((k) => {
      const it = unlocked[k];
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <b>Tappa ${k}: ${it.title || ""}</b>
        <div style="margin-top:6px;">
          <a href="${it.pdf}" target="_blank" rel="noopener">Apri PDF sbloccato</a>
        </div>
        <div class="muted" style="margin-top:6px;">
          Sbloccata: ${new Date(it.at).toLocaleString()}
        </div>
      `;
      listEl.appendChild(div);
    });

    const selected = stageIdEl.value;
    if (unlocked[selected]) {
      btnAR.href = `./ar-ios.html?stageId=${encodeURIComponent(selected)}`;
      btnAR.classList.remove("disabled");
    } else {
      btnAR.classList.add("disabled");
    }
  }

  stageIdEl.addEventListener("change", async () => {
    try {
      const j = await loadProgress();
      if (j.ok) renderProgress(j.progress);
    } catch {}
  });

  btnUnlock.addEventListener("click", async () => {
    setBadge("idle");
    const stageId = stageIdEl.value;
    const passphrase = passEl.value;

    statusEl.textContent = "Controllo la soluzione…";
    hintEl.textContent = "";

    try {
      const r = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ stageId, passphrase })
      });
      const j = await r.json();

      if (!j.ok) {
        setBadge("bad");
        statusEl.textContent = "Soluzione respinta.";
        hintEl.textContent = j.error === "WRONG_PASSPHRASE"
          ? "La frase non è corretta. Rileggi gli indizi."
          : `Errore: ${j.error}`;
        return;
      }

      setBadge("ok");
      statusEl.textContent = `Tappa ${stageId} sbloccata ✅`;
      hintEl.textContent = "Aggiorno il registro…";

      const p = await loadProgress();
      if (p.ok) renderProgress(p.progress);
    } catch (e) {
      setBadge("bad");
      statusEl.textContent = "Errore di rete.";
      hintEl.textContent = e?.message || String(e);
    }
  });

  fillStages();

  (async () => {
    await ensurePlayer();
    const j = await loadProgress();
    if (!j.ok) {
      statusEl.textContent = "Non sei registrato.";
      hintEl.innerHTML = `Apri <b>/start.html</b> dal QR oppure usa Ripristina.`;
      return;
    }
    renderProgress(j.progress);
  })();

  return true;
}

/* ---------------------------
   BOOT
---------------------------- */
(async () => {
  // Prova prima start, poi registro
  const isStart = await initStartPage();
  if (isStart) return;

  await initRegisterPage();
})();
