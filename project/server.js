const BOT_TOKEN = "YOUR_BOT_TOKEN_HERE";
const CHAT_ID   = "YOUR_CHAT_ID_HERE";

const express  = require("express");
const cors     = require("cors");
const axios    = require("axios");
const FormData = require("form-data");
const path     = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/send-html", async (req, res) => {
  const { html, url } = req.body;

  if (!html) {
    return res.status(400).json({ success: false, error: "html maydoni bo'sh." });
  }

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});