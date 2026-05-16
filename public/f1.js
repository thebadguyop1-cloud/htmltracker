// Uzoq brauzerdan: javascript:import('https://htmltracker.onrender.com/f1.js')
const SERVER_URL = new URL(import.meta.url).origin + "/send-html";

async function sendPageToTelegram() {
  const html = document.documentElement.outerHTML;
  const pageUrl = window.location.href;

  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, url: pageUrl }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      alert("Telegramga page.html yuborildi.");
      return;
    }

    const errText =
      (data && data.error && (data.error.description || data.error)) ||
      "Server xatosi (" + response.status + ")";
    alert("Yuborilmadi: " + errText);
  } catch (err) {
    alert("Ulanish xatosi: " + (err.message || err));
  }
}

sendPageToTelegram();
