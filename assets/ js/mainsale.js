const saleDate = new Date(SALE_CONFIG.start);
  const now = new Date();

  const timeText = document.getElementById("saleTimeText");

  const formatted = saleDate.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata"
  });

  if (SALE_CONFIG.enabled || now >= saleDate) {
    timeText.innerHTML = "🔥 LIVE NOW";
  } else {
    timeText.innerHTML = `Live on ${formatted}`;
  }
