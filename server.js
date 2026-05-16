const BOT_TOKEN = process.env.BOT_TOKEN || "8692327357:AAFQDRfZDaiuPwOFV7SOVXG0s73zUlKXICw";
const CHAT_ID   = process.env.CHAT_ID   || "2052073049";

const express  = require("express");
const cors     = require("cors");
const axios    = require("axios");
const FormData = require("form-data");
const path     = require("path");

const app = express();

let latestState = {
  text:      "",
  html:      "",
  url:       "",
  source:    "",
  updatedAt: null,
};

const sseClients = new Set();

function broadcast(state) {
  latestState = { ...latestState, ...state, updatedAt: new Date().toISOString() };
  const payload = JSON.stringify(latestState);
  for (const client of sseClients) {
    client.write(`data: ${payload}\n\n`);
  }
}

function isAllowedChat(chatId) {
  return String(chatId) === String(CHAT_ID);
}

async function downloadTelegramFile(fileId) {
  const { data: fileData } = await axios.get(
    `https://api.telegram.org/bot${BOT_TOKEN}/getFile`,
    { params: { file_id: fileId } }
  );
  const filePath = fileData.result?.file_path;
  if (!filePath) throw new Error("Fayl yo'li topilmadi.");
  const { data } = await axios.get(
    `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`,
    { responseType: "text" }
  );
  return data;
}

async function handleTelegramMessage(msg) {
  if (!msg || !isAllowedChat(msg.chat.id)) return;

  const patch = { source: "telegram", url: "telegram://" + (msg.from?.username || msg.chat.id) };

  if (msg.text) {
    const text = msg.text.trim();
    patch.text = text;
    if (text.startsWith("<") && text.includes(">")) {
      patch.html = text;
    } else {
      patch.html = "";
    }
    broadcast(patch);
    console.log("Telegram matn qabul qilindi:", text.slice(0, 80));
    return;
  }

  if (msg.document) {
    const name = (msg.document.file_name || "").toLowerCase();
    const mime = msg.document.mime_type || "";
    const isHtml =
      name.endsWith(".html") ||
      name.endsWith(".htm") ||
      mime.includes("html") ||
      mime.startsWith("text/");

    if (!isHtml) {
      patch.text = `📎 Fayl: ${msg.document.file_name || "hujjat"} (faqat HTML ko'rsatiladi)`;
      patch.html = "";
      broadcast(patch);
      return;
    }

    try {
      const content = await downloadTelegramFile(msg.document.file_id);
      patch.html = content;
      patch.text = msg.caption || `HTML fayl: ${msg.document.file_name || "page.html"}`;
      broadcast(patch);
      console.log("Telegram HTML fayl qabul qilindi:", msg.document.file_name);
    } catch (err) {
      console.error("Fayl yuklash xatosi:", err.message);
    }
  }
}

let lastUpdateId = 0;

async function pollTelegram() {
  try {
    const { data } = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
      { params: { offset: lastUpdateId + 1, timeout: 25 }, timeout: 35000 }
    );

    for (const update of data.result || []) {
      lastUpdateId = update.update_id;
      if (update.message) await handleTelegramMessage(update.message);
    }
  } catch (err) {
    console.error("Telegram polling xatosi:", err.message);
  }
  setImmediate(pollTelegram);
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.redirect("/viewer.html");
});

app.get("/api/latest", (_req, res) => {
  res.json(latestState);
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify(latestState)}\n\n`);
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

app.post("/send-html", async (req, res) => {
  const { html, url } = req.body;

  if (!html) {
    return res.status(400).json({ success: false, error: "html maydoni bo'sh." });
  }

  broadcast({
    html,
    text:   `Brauzerdan: ${url || "Noma'lum URL"}`,
    url:    url || "",
    source: "browser",
  });

  const buffer    = Buffer.from(html, "utf-8");
  const timestamp = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
  const caption   =
    `📄 Yangi HTML fayl qabul qilindi\n\n` +
    `🔗 URL: ${url || "Noma'lum"}\n` +
    `🕐 Vaqt: ${timestamp}`;

  const form = new FormData();
  form.append("chat_id", CHAT_ID);
  form.append("caption", caption);
  form.append("document", buffer, {
    filename:    "page.html",
    contentType: "text/html",
  });

  try {
    await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`,
      form,
      { headers: form.getHeaders() }
    );
    return res.json({ success: true, message: "Fayl Telegramga yuborildi." });
  } catch (err) {
    const detail = err.response?.data || err.message;
    console.error("Telegram xatosi:", detail);
    return res.status(502).json({ success: false, error: detail });
  }
});

async function startTelegramPolling() {
  try {
    await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
  } catch (_err) {
    /* webhook bo'lmasa ham davom etamiz */
  }
  pollTelegram();
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
  console.log(`Ko'ruvchi sahifa: http://localhost:${PORT}/viewer.html`);
  startTelegramPolling();
});
