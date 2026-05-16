const BOT_TOKEN = String(process.env.BOT_TOKEN || "").trim();
const CHAT_ID = String(process.env.CHAT_ID || "").trim();

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN topilmadi. Render Environment ga BOT_TOKEN qo'ying.");
}
if (!CHAT_ID) {
  throw new Error("CHAT_ID topilmadi. Render Environment ga CHAT_ID qo'ying.");
}

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

const app = express();
const sseClients = new Set();
let latestText = "";
let lastUpdateId = 0;

function pushTextToBrowsers(text) {
  latestText = text;
  const payload = JSON.stringify({ text, updatedAt: new Date().toISOString() });
  for (const client of sseClients) {
    client.write(`data: ${payload}\n\n`);
  }
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/live", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Telegram Live Text</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 20px; background: #0f172a; color: #e2e8f0; }
    h2 { margin-bottom: 12px; }
    #status { color: #94a3b8; margin-bottom: 10px; }
    #box { background: #111827; border: 1px solid #334155; border-radius: 8px; padding: 16px; min-height: 120px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h2>Telegramdan kelgan matn</h2>
  <div id="status">Ulanmoqda...</div>
  <div id="box">Hozircha matn yo'q</div>
  <script>
    const statusEl = document.getElementById("status");
    const boxEl = document.getElementById("box");
    fetch("/latest-text").then(r => r.json()).then(d => {
      if (d.text) boxEl.textContent = d.text;
    }).catch(() => {});
    const es = new EventSource("/text-events");
    es.onopen = () => statusEl.textContent = "Jonli ulanish";
    es.onerror = () => statusEl.textContent = "Ulanish uzildi, qayta urinmoqda...";
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.text) boxEl.textContent = data.text;
      } catch (e) {}
    };
  </script>
</body>
</html>`);
});

app.get("/latest-text", (_req, res) => {
  res.json({ text: latestText });
});

app.get("/text-events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ text: latestText })}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

// Bu endpointni ozgartirmadik: brauzerdan kelgan HTML Telegramga page.html bo'lib boradi.
app.post("/send-html", async (req, res) => {
  const { html, url } = req.body;
  if (!html) {
    return res.status(400).json({ success: false, error: "html maydoni bosh." });
  }

  const buffer = Buffer.from(html, "utf-8");
  const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
  const caption =
    `Yangi HTML fayl qabul qilindi\n\n` +
    `URL: ${url || "Nomalum"}\n` +
    `Vaqt: ${timestamp}`;

  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("caption", caption);
  form.append("document", buffer, {
    filename: "page.html",
    contentType: "text/html",
  });

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, form, {
      headers: form.getHeaders(),
    });
    return res.json({ success: true, message: "Fayl Telegramga yuborildi." });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error("Telegramga yuborish xatosi:", detail);
    return res.status(502).json({ success: false, error: detail });
  }
});

async function pollTelegram() {
  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`, {
      params: { offset: lastUpdateId + 1, timeout: 25 },
      timeout: 35000,
    });

    for (const update of data.result || []) {
      lastUpdateId = update.update_id;
      const msg = update.message;
      if (!msg || String(msg.chat?.id) !== String(CHAT_ID)) continue;
      if (msg.text && msg.text.trim()) {
        pushTextToBrowsers(msg.text.trim());
        console.log("Telegram text:", msg.text.trim().slice(0, 80));
      }
    }
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data || err.message;
    console.error("Telegram polling xatosi:", status || "", detail);
  }

  setImmediate(pollTelegram);
}

async function startPolling() {
  try {
    await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
  } catch (_err) {}
  pollTelegram();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`2-kompyuter uchun URL: /live`);
  startPolling();
});
