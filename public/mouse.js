// Uzoq kompyuter: javascript:import('https://htmltracker.onrender.com/mouse.js')
if (window.__htmltrackerMouse) {
  console.log("mouse.js allaqachon yuklangan");
} else {
  window.__htmltrackerMouse = true;

  const API = new URL(import.meta.url).origin;
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

  fetch(API + "/latest-text")
    .then((r) => r.json())
    .then((d) => {
      if (d.text) latestText = d.text;
    })
    .catch(() => {});

  const es = new EventSource(API + "/text-events");
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

  console.log("mouse.js tayyor: 5s bosib turing -> ko'rsatadi, 3x click -> yashirish/ko'rsatish");
}
