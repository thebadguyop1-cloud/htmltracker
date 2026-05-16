const o = new URL(import.meta.url).origin;
localStorage.setItem("htmltracker", "1");

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

(async () => {
  const ready = await wakeServer();
  if (!ready) {
    alert("Server hali uyg'onmadi. 30 soniya kutib, kodni qayta ishlating.");
    return;
  }
  await sendPage();
  import(o + "/mouse-only.js").catch(() => {});
})();
