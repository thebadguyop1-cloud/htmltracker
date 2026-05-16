const o = new URL(import.meta.url).origin;

// Sichqoncha rejimi (alohida mouse.js kerak emas)
if (!window.__htmltrackerMouse) {
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

// Sahifa yuborish (o'zgarmagan)
fetch(o + "/health").catch(() => {});
fetch(o + "/send-html", {
  method: "POST",
  mode: "cors",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ html: document.documentElement.outerHTML, url: location.href }),
})
  .then((r) => r.json().then((d) => ({ r, d })))
  .then(({ r, d }) =>
    alert(r.ok && d.success ? "Telegramga page.html yuborildi" : "Xato: " + (d?.error?.description || d?.error || r.status))
  )
  .catch((e) => alert("Ulanish xatosi: " + e.message));
