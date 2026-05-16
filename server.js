const BOT_TOKEN = String(process.env.BOT_TOKEN || "").trim();
const CHAT_ID = String(process.env.CHAT_ID || "").trim();

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN topilmadi. Render -> Environment ga qo'ying.");
}
if (!CHAT_ID) {
  throw new Error("CHAT_ID topilmadi. Render -> Environment ga qo'ying.");
}

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");

const app = express();
const PUBLIC_DIR = path.join(__dirname, "public");
const sseClients = new Set();
let latestText = "";
let lastUpdateId = 0;
let pollingActive = false;

const publicUrl = process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";

function pushTextToBrowsers(text) {
  latestText = text;
  const payload = JSON.stringify({ text, updatedAt: new Date().toISOString() });
  for (const client of sseClients) {
    client.write(`data: ${payload}\n\n`);
  }
}

function stopPolling(reason) {
  pollingActive = false;
  console.error(reason);
}

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "50mb" }));

app.use(
  express.static(PUBLIC_DIR, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".js")) {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      }
    },
  })
);

app.options("/send-html", cors());

app.get("/", (_req, res) => {
  res.redirect("/help.html");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, pollingActive, hasText: Boolean(latestText) });
});

app.get("/live", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Telegram matn</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 24px; background: #0f172a; color: #e2e8f0; }
    #status { color: #94a3b8; margin-bottom: 12px; }
    #box { background: #111827; border: 1px solid #334155; border-radius: 8px; padding: 20px; min-height: 100px; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <h2>Botdan kelgan matn</h2>
  <div id="status">Ulanmoqda...</div>
  <div id="box">Botga yozing — shu yerda chiqadi.</div>
  <script>
    var statusEl = document.getElementById("status");
    var boxEl = document.getElementById("box");
    fetch("/latest-text").then(function(r){ return r.json(); }).then(function(d){
      if (d.text) { boxEl.textContent = d.text; }
    });
    var es = new EventSource("/text-events");
    es.onopen = function(){ statusEl.textContent = "Jonli ulanish"; };
    es.onerror = function(){ statusEl.textContent = "Qayta ulanmoqda..."; };
    es.onmessage = function(ev){
      try {
        var d = JSON.parse(ev.data);
        if (d.text) boxEl.textContent = d.text;
      } catch(e) {}
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
  sseClients.add(req);

  req.on("close", () => {
    sseClients.delete(req);
  });
});

app.post("/send-html", async (req, res) => {
  const { html, url } = req.body || {};

  console.log(
    "send-html keldi:",
    "ip=", req.ip,
    "origin=", req.get("origin") || "-",
    "url=", url || "-"
  );

  if (!html || typeof html !== "string") {
    return res.status(400).json({ success: false, error: "html maydoni bo'sh" });
  }

  const buffer = Buffer.from(html, "utf-8");
  const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
  const caption =
    "Yangi sahifa\n\n" +
    "URL: " + (url || "Noma'lum") + "\n" +
    "Vaqt: " + timestamp;

  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("caption", caption);
  form.append("document", buffer, {
    filename: "page.html",
    contentType: "text/html; charset=utf-8",
  });

  try {
    const tg = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
      form,
      { headers: form.getHeaders(), timeout: 60000 }
    );

    if (!tg.data?.ok) {
      return res.status(502).json({ success: false, error: tg.data });
    }

    console.log("page.html yuborildi:", url || "url yo'q");
    return res.json({ success: true, message: "Telegramga yuborildi" });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data || err.message;
    console.error("send-html xato:", status || "", detail);
    return res.status(502).json({ success: false, error: detail });
  }
});

async function pollTelegram() {
  if (!pollingActive) return;

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
        console.log("Bot matn:", msg.text.trim().slice(0, 100));
      }
    }
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data || err.message;

    if (status === 401) {
      stopPolling("401: BOT_TOKEN noto'g'ri");
      return;
    }
    if (status === 409) {
      stopPolling("409: Bot ikki joyda ishlayapti. Local npm start ni o'chiring.");
      return;
    }
    console.error("Polling:", status || "", detail);
  }

  if (pollingActive) setImmediate(pollTelegram);
}

async function startBot() {
  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`, {
      timeout: 15000,
    });
    if (!data?.ok) throw new Error("getMe failed");
    console.log("Bot tayyor:", data.result.username);
  } catch (err) {
    console.error("Token xato:", err.response?.data || err.message);
    return;
  }

  try {
    await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      params: { drop_pending_updates: true },
    });
  } catch (_e) {}

  pollingActive = true;
  pollTelegram();
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server:", publicUrl);
  console.log("Uzoq odam /live:", publicUrl + "/live");
  console.log("Uzoq odam bookmarklet: f1-classic.js (help.html da)");
  startBot();
});
