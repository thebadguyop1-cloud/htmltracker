(function () {
  const SERVER_URL = "http://localhost:3000/send-html";

  const payload = {
    html: document.documentElement.outerHTML,
    url: window.location.href,
  };

  fetch(SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((r) => r.json())
    .then((data) => console.log("Yuborildi:", data))
    .catch((err) => console.error("Xato:", err));
})();