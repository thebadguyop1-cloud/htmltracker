const o = new URL(import.meta.url).origin;

function initMouse() {
  if (window.__htmltrackerMouse) return;
  window.__htmltrackerMouse = true;

  let latestText = "";
  let visible = false;
  let bar = null;

  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "htmltracker-text-bar";
    bar.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;" +
      "background:#111827;color:#f9fafb;padding:14px 18px;" +
      "font:16px/1.45 Segoe UI,Arial,sans-serif;" +
      "box-shadow:0 -4px 24px rgba(0,0,0,.4);display:none;" +
      "max-height:40vh;overflow:auto;white-space:pre-wrap;word-break:break-word;";
    document.documentElement.appendChild(bar);
    return bar;
  }

  function showBar() {
    visible = true;
    const el = ensureBar();
    el.textContent = latestText || "(Hozircha matn yo'q)";
    el.style.display = "block";
  }

  function hideBar() {
    visible = false;
    if (bar) bar.style.display = "none";
  }

  function toggleBar() {
    if (visible) hideBar();
    else showBar();
  }

  fetch(o + "/latest-text")
    .then((r) => r.json())
    .then((d) => {
      if (d.text) latestText = d.text;
    })
    .catch(() => {});

  const es = new EventSource(o + "/text-events");
  es.onmessage = (ev) => {
    try {
      const d = JSON.parse(ev.data);
      if (d.text) {
        latestText = d.text;
        if (visible && bar) bar.textContent = latestText;
      }
    } catch (_e) {}
  };

  let holdTimer = null;
  let isHolding = false;

  document.addEventListener(
    "mousedown",
    (e) => {
      if (e.button !== 0) return;
      isHolding = true;
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = setTimeout(() => {
        if (isHolding) showBar();
      }, 5000);
    },
    true
  );

  document.addEventListener(
    "mouseup",
    (e) => {
      if (e.button !== 0) return;
      isHolding = false;
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    },
    true
  );

  let clickTimes = [];
  document.addEventListener(
    "click",
    (e) => {
      if (e.button !== 0) return;
      const now = Date.now();
      clickTimes = clickTimes.filter((t) => now - t < 800);
      clickTimes.push(now);
      if (clickTimes.length >= 3) {
        clickTimes = [];
        toggleBar();
      }
    },
    true
  );
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function wakeServer() {
  for (let i = 0; i < 15; i++) {
    try {
      const r = await fetch(o + "/health", { mode: "cors", cache: "no-store" });
      if (r.ok) return true;
    } catch (_e) {}
    await sleep(2000);
  }
  return false;
}

async function sendPage() {
  const payload = {
    html: document.documentElement.outerHTML,
    url: location.href,
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(o + "/send-html", {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));

      if (r.ok && d.success) {
        alert("Telegramga page.html yuborildi");
        return;
      }

      if (attempt < 4) {
        await sleep(2500);
        continue;
      }

      const err =
        (d && d.error && d.error.description) ||
        (typeof d.error === "string" ? d.error : null) ||
        JSON.stringify(d.error || d) ||
        "HTTP " + r.status;
      alert("Yuborilmadi: " + err);
      return;
    } catch (e) {
      if (attempt < 4) {
        await sleep(2500);
        continue;
      }
      alert("Ulanish xatosi: " + (e.message || e));
    }
  }
}

initMouse();

(async () => {
  const ready = await wakeServer();
  if (!ready) {
    alert("Server hali uyg'onmadi. 30 soniya kutib, kodni qayta ishlating.");
    return;
  }
  await sendPage();
})();
