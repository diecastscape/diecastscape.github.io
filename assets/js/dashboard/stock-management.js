import { db } from "../firebase-init.js";

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/*
  Diecast.scape — Accessories Order Reader + Stock Updater

  Orders:
    bookedOrders   = public order/progress data
    orderCustomers = private customer and delivery details

  Stock is managed in accessoriesProducts.
*/

const PRODUCTS_COLLECTION = "accessoriesProducts";
const ORDERS_COLLECTION = "bookedOrders";
const CUSTOMERS_COLLECTION = "orderCustomers";
const COUNTERS_COLLECTION = "bookedOrderCounters";
const COUNTER_DOCUMENT = "accessoryOrderIdSequence";
const ORDER_PREFIX = "DS-A";
const FIRST_ORDER_NUMBER = 1000;

const $ = (id) => document.getElementById(id);

let parsedOrder = null;
let previewToken = 0;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2
  })}`;
}

function setMessage(element, message, type = "") {
  if (!element) return;
  element.className = `sm-message${type ? ` ${type}` : ""}`;
  element.textContent = message;
}

function getLines(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function extractAmount(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(
    new RegExp(`${escaped}\\s*:\\s*₹?\\s*([\\d,]+(?:\\.\\d{1,2})?)`, "i")
  );

  return match ? Number(match[1].replace(/,/g, "")) : null;
}

function parseCustomerDetails(text) {
  const find = (label) => {
    const match = text.match(
      new RegExp(`^\\s*${label}\\s*:\\s*(.*?)\\s*$`, "im")
    );

    return match ? match[1].trim() : "";
  };

  const getValue = (value) => {
    return !value || /^not provided$/i.test(value.trim())
      ? "Not provided"
      : value.trim();
  };

  const details = {
    name: getValue(find("Name")),
    address: getValue(find("Address")),
    postOffice: getValue(find("Post Office Name")),
    pincode: getValue(find("Pincode")),
    phone: getValue(find("Phone"))
  };

  const warnings = [];

  const deliveryDetailsMissing = [
    details.name,
    details.address,
    details.postOffice,
    details.pincode,
    details.phone
  ].some(value => value === "Not provided");

  if (deliveryDetailsMissing) {
    warnings.push(
      "⚠️ DELIVERY DETAILS INCOMPLETE: Collect the missing delivery details before dispatch."
    );
  }

  return {
    details,
    missing: [],
    warnings
  };
}

function parseOrderMessage(rawText) {
  const text = String(rawText || "").trim();

  if (!text) {
    throw new Error("Paste the complete WhatsApp order message first.");
  }

  const lines = getLines(text);
  const codeLineIndexes = [];

  lines.forEach((line, index) => {
    if (/#([A-Z]{2})(\d{2})(\d{2})\b/i.test(line)) {
      codeLineIndexes.push(index);
    }
  });

  if (!codeLineIndexes.length) {
    throw new Error(
      "No valid checkout product codes found. Expected a code such as #BR0412."
    );
  }

  const items = [];
  const warnings = [];
  const seenProductCodes = new Set();

  for (const lineIndex of codeLineIndexes) {
    const line = lines[lineIndex];
    const codeMatch = line.match(/#([A-Z]{2})(\d{2})(\d{2})\b/i);

    if (!codeMatch) continue;

    const letters = codeMatch[1].toUpperCase();
    const setSize = Number(codeMatch[2]);
    const multiplier = Number(codeMatch[3]);

    const fullCode =
      `#${letters}${String(setSize).padStart(2, "0")}${String(multiplier).padStart(2, "0")}`;

    const baseProductCode =
      `#${letters}${String(setSize).padStart(2, "0")}`;

    if (seenProductCodes.has(baseProductCode)) {
      throw new Error(
        `Product ${baseProductCode} appears more than once. Combine its quantities into one line.`
      );
    }

    seenProductCodes.add(baseProductCode);

    if (setSize < 1 || multiplier < 1) {
      throw new Error(
        `Invalid stock code ${fullCode}. Set size and multiplier must both be at least 01.`
      );
    }

    let name = "";

    for (let i = lineIndex - 1; i >= 0; i--) {
      if (/^[•●*-]\s*/.test(lines[i])) {
        name = lines[i].replace(/^[•●*-]\s*/, "").trim();
        break;
      }

      if (/^🛒|^Product Total|^Shipping|^Order Total|^Delivery Details/i.test(lines[i])) {
        break;
      }
    }

    if (!name) {
      throw new Error(`Could not identify the product name above ${fullCode}.`);
    }

    const qtyMatch = line.match(/[×x]\s*(\d+)\s*qty/i);

    if (qtyMatch && Number(qtyMatch[1]) !== multiplier) {
      throw new Error(
        `${fullCode}: checkout quantity does not match the quantity encoded in the code.`
      );
    }

    const packMatch =
      line.match(/(?:set\s+of\s+(?:mix\s+)?|set\s+of\s+mix\s+)(\d+)/i) ||
      line.match(/(\d+)\s*(?:pieces?|pices?)/i);

    if (packMatch && Number(packMatch[1]) !== setSize) {
      warnings.push(
        `${name}: message says ${packMatch[1]} pieces per set, but ${fullCode} encodes ${setSize}. Stock calculation follows the code.`
      );
    }

    let priceLine = "";

    for (let i = lineIndex + 1; i < lines.length; i++) {
      if (/#([A-Z]{2})(\d{2})(\d{2})\b/i.test(lines[i])) break;

      if (/₹\s*[\d,]+/.test(lines[i]) && /[×x]\s*\d+\s*=/.test(lines[i])) {
        priceLine = lines[i];
        break;
      }
    }

    if (!priceLine) {
      throw new Error(
        `Could not read the unit price and line total for ${name} (${fullCode}).`
      );
    }

    const priceMatch = priceLine.match(
      /₹\s*([\d,]+(?:\.\d{1,2})?)\s*[×x]\s*(\d+)\s*=\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/i
    );

    if (!priceMatch) {
      throw new Error(`Invalid price line for ${name}: "${priceLine}"`);
    }

    const unitPrice = Number(priceMatch[1].replace(/,/g, ""));
    const priceQuantity = Number(priceMatch[2]);
    const lineTotal = Number(priceMatch[3].replace(/,/g, ""));

    if (priceQuantity !== multiplier) {
      throw new Error(
        `${name}: price quantity does not match the quantity encoded in the code.`
      );
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0 || !Number.isFinite(lineTotal)) {
      throw new Error(`Invalid price for ${name}.`);
    }

    if (Math.round(unitPrice * multiplier * 100) !== Math.round(lineTotal * 100)) {
      throw new Error(`${name}: unit price × quantity does not equal the line total.`);
    }

    items.push({
      name,
      fullCode,
      productCode: baseProductCode,
      piecesPerSet: setSize,
      quantity: multiplier,
      piecesRequired: setSize * multiplier,
      unitPrice,
      lineTotal
    });
  }

  const productTotal = extractAmount(text, "Product Total");
  const shipping = extractAmount(text, "Shipping");
  const orderTotal = extractAmount(text, "Order Total");

  if (productTotal === null || shipping === null || orderTotal === null) {
    throw new Error(
      "Could not read Product Total, Shipping and Order Total from the message."
    );
  }

  const calculatedProducts = items.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  if (Math.round(calculatedProducts * 100) !== Math.round(productTotal * 100)) {
    throw new Error(
      `Product Total mismatch: line items add up to ${money(calculatedProducts)}, but message says ${money(productTotal)}.`
    );
  }

  if (Math.round((productTotal + shipping) * 100) !== Math.round(orderTotal * 100)) {
    throw new Error("Order Total does not equal Product Total + Shipping.");
  }

  const {
    details,
    missing,
    warnings: customerWarnings
  } = parseCustomerDetails(text);

  warnings.push(...customerWarnings);

  return {
    rawText: text,
    items,
    warnings,
    productTotal,
    shipping,
    orderTotal,
    customerDetails: details,
    missingCustomerFields: missing
  };
}

async function findProductsByCode(productCode) {
  const q = query(
    collection(db, PRODUCTS_COLLECTION),
    where("productCode", "==", productCode)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error(
      `No accessory found with product code ${productCode}. Check the code in Accessories admin.`
    );
  }

  if (snapshot.size > 1) {
    throw new Error(
      `More than one accessory uses ${productCode}. Make product codes unique before confirming.`
    );
  }

  const productDoc = snapshot.docs[0];
  const data = productDoc.data();

  if (data.active === false) {
    throw new Error(
      `Product ${productCode} is inactive. It cannot be used for a new order.`
    );
  }

  return {
    id: productDoc.id,
    ref: productDoc.ref,
    data
  };
}
async function refreshStockManagement() {
  const list = $("stockInventoryList");
  if (!list) return;

  list.innerHTML = `<div class="sm-empty">Loading current stock…</div>`;

  try {

    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));

    
const products = snapshot.docs
  .map(d => ({ id: d.id, ...d.data() }))
  .sort((a, b) => {
    const dateA = a.created?.toMillis?.() ?? 0;
    const dateB = b.created?.toMillis?.() ?? 0;
    return dateA - dateB;
  });
    if (!products.length) {
      list.innerHTML = `<div class="sm-empty">No accessory products found.</div>`;
      return;
    }

    list.innerHTML = products.map(p => `
      <div class="sm-inventory-row">
        <div>
          <strong>${escapeHTML(p.name || "Unnamed product")}</strong>
          <small>${escapeHTML(p.productCode || "No product code")} · ${escapeHTML(p.quantity || "Pack size not set")}</small>
        </div>
        <span class="sm-stock-number">${Number.isFinite(Number(p.stock)) ? Number(p.stock) : 0} pcs</span>
      </div>
    `).join("");

  } catch (error) {
    console.error("Stock inventory refresh failed:", error);
    list.innerHTML = `
      <div class="sm-error">
        Could not load stock. Check Firebase permissions and connection.
      </div>
    `;
  }
}

function renderOrderReview(order, liveProducts) {
  const review = $("stockOrderReview");
  const confirmButton = $("stockConfirmOrderBtn");

  if (!review || !confirmButton) return;

  const rows = order.items.map((item, index) => {
    const product = liveProducts[index];
    const currentStock = Number(product.data.stock);
    const validStock = Number.isInteger(currentStock) && currentStock >= 0;
    const enough = validStock && currentStock >= item.piecesRequired;
    const remaining = validStock ? currentStock - item.piecesRequired : NaN;

    item.productDocId = product.id;
    item.productNameInFirebase = product.data.name || "";

    return `
      <div class="sm-review-row">
        <div class="sm-review-title">
          <strong>${escapeHTML(item.name)}</strong>
          <span class="${enough ? "sm-pill-ok" : "sm-pill-bad"}">
            ${enough ? "Available" : (validStock ? "Insufficient stock" : "Invalid stock value")}
          </span>
        </div>

        <small>
          Code: ${escapeHTML(item.fullCode)} · Firebase product:
          ${escapeHTML(product.data.name || "Unnamed")}
        </small>

        <div class="sm-review-grid">
          <span>Current stock <b>${validStock ? currentStock : "Invalid"}</b></span>
          <span>Deduct <b>−${item.piecesRequired} pcs</b></span>
          <span>After order <b>${validStock ? remaining : "—"} pcs</b></span>
        </div>

        <small>
          ${item.piecesPerSet} pieces/set × ${item.quantity} sets =
          ${item.piecesRequired} pieces · ${money(item.unitPrice)} ×
          ${item.quantity} = ${money(item.lineTotal)}
        </small>
      </div>
    `;
  }).join("");

  const stockOkay = order.items.every((item, i) => {
    const stock = Number(liveProducts[i].data.stock);
    return Number.isInteger(stock) && stock >= item.piecesRequired;
  });

  const warningsHTML = order.warnings.length
    ? `
      <div class="sm-warning">
        <strong>Order warnings:</strong>
        <ul>
          ${order.warnings.map(w => `<li>${escapeHTML(w)}</li>`).join("")}
        </ul>
        <small>Review these warnings before dispatch. Stock calculations follow the encoded product code.</small>
      </div>
    `
    : "";

  const missingHTML = order.missingCustomerFields.length
    ? `
      <div class="sm-error">
        Missing required details:
        ${escapeHTML(order.missingCustomerFields.join(", "))}.
        Complete these details before confirming.
      </div>
    `
    : "";

  review.innerHTML = `
    <div class="sm-review-summary">
      <div><span>Products</span><strong>${money(order.productTotal)}</strong></div>
      <div><span>Shipping</span><strong>${money(order.shipping)}</strong></div>
      <div class="sm-total"><span>Order total</span><strong>${money(order.orderTotal)}</strong></div>
      <div>
        <span>Pieces to deduct</span>
        <strong>${order.items.reduce((sum, item) => sum + item.piecesRequired, 0)} pcs</strong>
      </div>
    </div>

    ${rows}
    ${warningsHTML}
    ${missingHTML}

    <p class="sm-safe-note">
      Nothing has been changed yet. Stock updates only after you confirm.
    </p>
  `;

  confirmButton.disabled = !stockOkay;
  confirmButton.title = stockOkay
    ? ""
    : "Resolve stock issues before confirming.";
}

async function checkAccessoryOrder() {
  const checkButton = $("stockCheckOrderBtn");
  const review = $("stockOrderReview");
  const confirmButton = $("stockConfirmOrderBtn");
  const message = $("stockOrderMessage");

  if (!message || !review || !confirmButton) return;

  const token = ++previewToken;

  parsedOrder = null;
  confirmButton.disabled = true;
  review.innerHTML = "";

  const success = $("stockOrderSuccess");

  if (success) {
    success.innerHTML = "";
    success.style.display = "";
  }

  setMessage($("stockOrderStatus"), "");

  const clearButton = $("stockClearOrderBtn");
  if (clearButton) clearButton.hidden = false;

  if (checkButton) {
    checkButton.disabled = true;
    checkButton.textContent = "Checking stock…";
  }

  try {
    const order = parseOrderMessage(message.value);
    const liveProducts = [];

    for (const item of order.items) {
      const product = await findProductsByCode(item.productCode);
      liveProducts.push(product);
    }

    if (token !== previewToken) return;

    parsedOrder = order;
    renderOrderReview(order, liveProducts);

    parsedOrder.liveProductIds = liveProducts.map(p => p.id);
    parsedOrder.previewAt = Date.now();

    setMessage(
      $("stockOrderStatus"),
      confirmButton.disabled
        ? "Order read, but fix the issues shown before confirming."
        : "Order read successfully. Review every stock deduction below.",
      confirmButton.disabled ? "warning" : "success"
    );

  } catch (error) {
    console.error("Accessory order check failed:", error);

    review.innerHTML = `
      <div class="sm-error">
        ${escapeHTML(error.message || "Could not read this order.")}
      </div>
    `;

    setMessage(
      $("stockOrderStatus"),
      "Order check failed. No stock has changed.",
      "error"
    );

  } finally {
    if (checkButton) {
      checkButton.disabled = false;
      checkButton.textContent = "Check Order & Stock";
    }
  }
}

/* =====================================================
   DATE HELPERS
===================================================== */

function toDisplayDate(date = new Date()) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function toISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  Weekly dispatch is every Thursday.

  Monday, Tuesday, Wednesday -> this week's Thursday.
  Thursday, Friday, Saturday, Sunday -> next week's Thursday.
*/
function getEstimatedDispatchDate(confirmedAt = new Date()) {
  const dispatchDate = new Date(
    confirmedAt.getFullYear(),
    confirmedAt.getMonth(),
    confirmedAt.getDate()
  );

  const day = dispatchDate.getDay();
  const daysUntilThursday = (4 - day + 7) % 7;

  // If confirmed on Thursday, use next week's Thursday.
  const daysToAdd = daysUntilThursday === 0
    ? 7
    : daysUntilThursday;

  dispatchDate.setDate(dispatchDate.getDate() + daysToAdd);

  return dispatchDate;
}

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getHighestAccessoryOrderNumber() {
  const snapshot = await getDocs(collection(db, ORDERS_COLLECTION));
  let highest = FIRST_ORDER_NUMBER;

  snapshot.forEach(orderDoc => {
    const orderId = String(orderDoc.data().orderId || "");
    const match = orderId.match(/^DS-A(\d+)$/);

    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  });

  return highest;
}
async function confirmAccessoryStockOrder() {
  const confirmButton = $("stockConfirmOrderBtn");
  const checkButton = $("stockCheckOrderBtn");

  if (!confirmButton || confirmButton.disabled || !parsedOrder) return;

  const order = parsedOrder;
  const currentText = $("stockOrderMessage")?.value.trim() || "";

  if (currentText !== order.rawText) {
    setMessage(
      $("stockOrderStatus"),
      "The pasted message changed. Check the order again.",
      "error"
    );

    confirmButton.disabled = true;
    return;
  }

  confirmButton.disabled = true;

  if (checkButton) checkButton.disabled = true;

  confirmButton.textContent = "Confirming order…";

  try {
    const fingerprint = await sha256Hex(
      order.rawText.replace(/\s+/g, " ").trim()
    );

    const counterRef = doc(
      db,
      COUNTERS_COLLECTION,
      COUNTER_DOCUMENT
    );

    const customerRefForId = (orderId) =>
      doc(db, CUSTOMERS_COLLECTION, orderId);

    const existingOrderRef = doc(
      db,
      ORDERS_COLLECTION,
      `accessory_${fingerprint}`
    );

    const highestExisting = await getHighestAccessoryOrderNumber();

    const productRefs = [];

    for (const item of order.items) {
      const matched = await findProductsByCode(item.productCode);
      productRefs.push(matched.ref);
    }

    
const customer = order.customerDetails || {};

const deliveryFields = {
  name: customer.name || "Not provided",
  address: customer.address || "Not provided",
  postOffice: customer.postOffice || "Not provided",
  postOfficeName: customer.postOffice || "Not provided",
  pincode: customer.pincode || "Not provided",
  phone: customer.phone || "Not provided"
};


    // Calculate the dispatch date once when the order is confirmed.
    const confirmedAt = new Date();
    const estimatedDispatchDate =
      getEstimatedDispatchDate(confirmedAt);

    const estimatedDispatchISO =
      toISODate(estimatedDispatchDate);

    const estimatedDispatchDisplay =
      toDisplayDate(estimatedDispatchDate);

    const result = await runTransaction(db, async transaction => {
      // All reads must happen before writes.
      const duplicateSnapshot =
        await transaction.get(existingOrderRef);

      if (duplicateSnapshot.exists()) {
        throw new Error(
          `This exact WhatsApp order was already processed as ${duplicateSnapshot.data().orderId}.`
        );
      }

      const counterSnapshot = await transaction.get(counterRef);
      const productSnapshots = [];

      for (const ref of productRefs) {
        productSnapshots.push(await transaction.get(ref));
      }

      const previousNumber = counterSnapshot.exists()
        ? Math.max(
            FIRST_ORDER_NUMBER,
            Number(counterSnapshot.data().lastNumber) || FIRST_ORDER_NUMBER
          )
        : highestExisting;

      const nextNumber = Math.max(
        previousNumber,
        highestExisting,
        FIRST_ORDER_NUMBER
      ) + 1;

      const orderId = `${ORDER_PREFIX}${nextNumber}`;
      const customerRef = customerRefForId(orderId);

      const customerSnapshot = await transaction.get(customerRef);

      if (customerSnapshot.exists()) {
        throw new Error(
          `Customer details for ${orderId} already exist. Refresh and try again.`
        );
      }

      const savedProducts = [];
      const deductions = [];

      productSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists()) {
          throw new Error(
            "A product was deleted after preview. Run Check Order & Stock again."
          );
        }

        const item = order.items[index];
        const data = snapshot.data();

        if (String(data.productCode || "").toUpperCase() !== item.productCode) {
          throw new Error(
            `Product code changed for ${item.name}. Run Check Order & Stock again.`
          );
        }

        const currentStock = Number(data.stock);

        if (!Number.isInteger(currentStock) || currentStock < item.piecesRequired) {
          throw new Error(
            `Insufficient live stock for ${data.name || item.name}. Required ${item.piecesRequired}; available ${currentStock}. No changes were made.`
          );
        }

        const remainingStock = currentStock - item.piecesRequired;

        savedProducts.push({
          name: data.name || item.name,
          quantity: item.quantity,
          productCode: item.productCode,
          checkoutCode: item.fullCode,
          piecesPerSet: item.piecesPerSet,
          piecesDeducted: item.piecesRequired,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        });

        deductions.push({
          productId: snapshot.id,
          productCode: item.productCode,
          productName: data.name || item.name,
          stockBefore: currentStock,
          piecesDeducted: item.piecesRequired,
          stockAfter: remainingStock
        });
      });

      // Apply stock deductions atomically.
      productSnapshots.forEach((snapshot, index) => {
        const item = order.items[index];
        const data = snapshot.data();

        transaction.update(productRefs[index], {
          stock: Number(data.stock) - item.piecesRequired,
          stockUpdatedAt: serverTimestamp()
        });
      });

      transaction.set(counterRef, {
        lastNumber: nextNumber,
        updatedAt: serverTimestamp()
      });

      const publicProducts = savedProducts.map(item => ({
        name: item.name,
        quantity: item.quantity
      }));

      // PUBLIC ORDER: bookedOrders
      transaction.set(existingOrderRef, {
        orderId,
        bookedDate: toDisplayDate(confirmedAt),
        confirmedAt: serverTimestamp(),
        design: "Accessories Order",
        products: publicProducts,

        // Estimated dispatch date for the public tracking card.
        shippingDate: estimatedDispatchDisplay,
        estimatedDispatchDate: estimatedDispatchISO,
        estimatedDispatchDay: "Thursday",

        status: "Ready to Pack",
        dispatchedDate: "",
        hidden: false
      });

      // PRIVATE ORDER: orderCustomers
      transaction.set(customerRef, {
        orderId,
        orderType: "Accessories",
        bookedDate: toDisplayDate(confirmedAt),
        confirmedAt: serverTimestamp(),

        estimatedDispatchDate: estimatedDispatchISO,
        estimatedDispatchDay: "Thursday",

        
        // Customer delivery information — separate Firestore fields.
        name: deliveryFields.name,
        address: deliveryFields.address,
        postOffice: deliveryFields.postOffice,
        postOfficeName: deliveryFields.postOfficeName,
        pincode: deliveryFields.pincode,
        phone: deliveryFields.phone,

        // Nested copy for future use.
        deliveryDetails: {
          name: deliveryFields.name,
          address: deliveryFields.address,
          postOffice: deliveryFields.postOffice,
          pincode: deliveryFields.pincode,
          phone: deliveryFields.phone
        },


        products: savedProducts,

        productTotal: order.productTotal,
        shipping: order.shipping,
        orderTotal: order.orderTotal,

        totalPiecesDeducted: deductions.reduce(
          (sum, item) => sum + item.piecesDeducted,
          0
        ),

        stockDeductions: deductions,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { orderId, deductions };
    });

    const confirmation =
      `Diecast.scape order confirmed! ✅\n\n` +
      `Order ID: ${result.orderId}\n` +
      `Estimated dispatch: Thursday, ${estimatedDispatchDisplay}\n\n` +
      `Track your order progress here:\n` +
      `${window.location.origin}/booked-orders/\n\n` +
      `Thank you for choosing Diecast.scape!`;

    const success = $("stockOrderSuccess");

    if (success) {
      success.style.display = "";

      success.innerHTML = `
        <div class="sm-success-card">
          <div class="sm-success-icon">✓</div>
          <h4>Order booked successfully</h4>
          <p>Stock has been updated and the order is saved in Firebase.</p>

          <p>
            <strong>Estimated dispatch:</strong>
            Thursday, ${escapeHTML(estimatedDispatchDisplay)}
          </p>

          <small>ORDER ID</small>
          <strong class="sm-generated-id">${escapeHTML(result.orderId)}</strong>

          <button
            type="button"
            id="copyAccessoryOrderIdBtn"
            class="sm-primary"
          >Copy order confirmation</button>

          <div class="sm-deduction-list">
            ${result.deductions.map(d => `
              <div>
                <span>${escapeHTML(d.productName)} (${escapeHTML(d.productCode)})</span>
                <b>−${d.piecesDeducted} · remaining ${d.stockAfter}</b>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    $("copyAccessoryOrderIdBtn")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(confirmation);

        setMessage(
          $("stockOrderStatus"),
          "Order confirmation copied.",
          "success"
        );
      } catch {
        window.prompt("Copy this order confirmation:", confirmation);
      }
    });

    setMessage(
      $("stockOrderStatus"),
      `Confirmed successfully: ${result.orderId}`,
      "success"
    );

    parsedOrder = null;
    $("stockConfirmOrderBtn").disabled = true;

    await refreshStockManagement();

    if (typeof window.loadBookedOrders === "function") {
      await window.loadBookedOrders();
    }

  } catch (error) {
    console.error("Accessory order confirmation failed:", error);

    setMessage(
      $("stockOrderStatus"),
      error.message || "Confirmation failed. No order was confirmed.",
      "error"
    );

    parsedOrder = null;
    $("stockConfirmOrderBtn").disabled = true;

  } finally {
    confirmButton.textContent = "Confirm Order & Update Stock";

    if (checkButton) checkButton.disabled = false;
  }
}
window.refreshStockManagement = refreshStockManagement;
window.checkAccessoryOrder = checkAccessoryOrder;
window.confirmAccessoryStockOrder = confirmAccessoryStockOrder;

function clearAccessoryOrderCheck() {
  previewToken++;
  parsedOrder = null;

  const message = $("stockOrderMessage");
  const review = $("stockOrderReview");
  const success = $("stockOrderSuccess");
  const status = $("stockOrderStatus");
  const confirmButton = $("stockConfirmOrderBtn");
  const checkButton = $("stockCheckOrderBtn");
  const clearButton = $("stockClearOrderBtn");

  if (message) message.value = "";
  if (review) review.innerHTML = "";

  if (success) {
    success.innerHTML = "";
    success.style.display = "none";
  }

  if (status) {
    status.textContent = "";
    status.className = "sm-message";
  }

  if (confirmButton) {
    confirmButton.disabled = true;
    confirmButton.textContent = "Confirm Order & Update Stock";
    confirmButton.title = "";
  }

  if (checkButton) {
    checkButton.disabled = false;
    checkButton.textContent = "Check Order & Stock";
  }

  if (clearButton) {
    clearButton.hidden = true;
  }
}

window.clearAccessoryOrderCheck = clearAccessoryOrderCheck;

window.addEventListener("DOMContentLoaded", () => {
  const checkButton = $("stockCheckOrderBtn");

  if (checkButton && !$("stockClearOrderBtn")) {
    const clearButton = document.createElement("button");

    clearButton.type = "button";
    clearButton.id = "stockClearOrderBtn";
    clearButton.textContent = "Clear";
    clearButton.className = checkButton.className;
    clearButton.hidden = true;
    clearButton.style.marginLeft = "8px";

    checkButton.insertAdjacentElement("afterend", clearButton);

    clearButton.addEventListener("click", clearAccessoryOrderCheck);
  }

  refreshStockManagement();
});
