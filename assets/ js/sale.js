const saleEnabled = SALE_CONFIG.enabled;
  const saleStart = new Date(SALE_CONFIG.start);
  const now = new Date();
  
document.addEventListener("DOMContentLoaded", () => {
  const saleMain = document.getElementById("sale-main");
  const template = document.getElementById("sale-products");

  if (saleEnabled || now >= saleStart) {
    // SALE ON → inject products
    saleMain.appendChild(template.content.cloneNode(true));
    initScrollAnimations();
  } else {
    // SALE OFF → message only
    const liveDate = saleStart.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    });

    saleMain.innerHTML = `
    <div class="sale-off"
         style="text-align:center;padding:20px">
          <p>Sale will be live on<br><strong>${liveDate}</strong></p>
        </div>  
    `;
  }
});
