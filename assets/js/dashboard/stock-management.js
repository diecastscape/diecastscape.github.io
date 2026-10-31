
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

  Stock:
    accessoriesProducts

  Normal products:
    Stock is deducted directly.

  Combo products:
    Component stock is deducted.
    Combo stock is recalculated from remaining components.
*/

/* =====================================================
   COLLECTIONS
===================================================== */

const PRODUCTS_COLLECTION = "accessoriesProducts";
const ORDERS_COLLECTION = "bookedOrders";
const CUSTOMERS_COLLECTION = "orderCustomers";
const COUNTERS_COLLECTION = "bookedOrderCounters";
const COUNTER_DOCUMENT = "accessoryOrderIdSequence";

const ORDER_PREFIX = "DS-A";
const FIRST_ORDER_NUMBER = 1000;


/* =====================================================
   COMBO RECIPES

   One #CL00 set requires:
   #TR10 = 8 pieces
   #OB06 = 5 pieces
   #DN01 = 1 piece
   #LJ02 = 2 pieces
   #TC10 = 10 pieces
   #DE02 = 1 piece
   #FB01 = 1 piece
   #BR04 = 3 pieces

   Add future combo recipes in this object.
===================================================== */

const COMBO_RECIPES = {
  "#CL00": [
    { productCode: "#TR10", pieces: 8 },
    { productCode: "#OB06", pieces: 5 },
    { productCode: "#DN01", pieces: 1 },
    { productCode: "#LJ02", pieces: 2 },
    { productCode: "#TC10", pieces: 10 },
    { productCode: "#DE02", pieces: 1 },
    { productCode: "#FB01", pieces: 1 },
    { productCode: "#BR04", pieces: 3 }
  ]
};


/* =====================================================
   STATE
===================================================== */

const $ = (id) => document.getElementById(id);

let parsedOrder = null;
let previewToken = 0;


/* =====================================================
   BASIC HELPERS
===================================================== */

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

  return match
    ? Number(match[1].replace(/,/g, ""))
    : null;
}


/* =====================================================
   CUSTOMER DETAILS
===================================================== */

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


/* =====================================================
   ORDER MESSAGE PARSER
===================================================== */

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

    const codeMatch = line.match(
      /#([A-Z]{2})(\d{2})(\d{2})\b/i
    );

    if (!codeMatch) continue;

    const letters = codeMatch[1].toUpperCase();
    const setSize = Number(codeMatch[2]);
    const multiplier = Number(codeMatch[3]);

    const fullCode =
      `#${letters}${String(setSize).padStart(2, "0")}${String(multiplier).padStart(2, "0")}`;

    const baseProductCode =
      `#${letters}${String(setSize).padStart(2, "0")}`;

    const isCombo = Boolean(COMBO_RECIPES[baseProductCode]);

    if (seenProductCodes.has(baseProductCode)) {
      throw new Error(
        `Product ${baseProductCode} appears more than once. Combine its quantities into one line.`
      );
    }

    seenProductCodes.add(baseProductCode);

    if (multiplier < 1) {
      throw new Error(
        `Invalid stock code ${fullCode}. Quantity must be at least 01.`
      );
    }

    if (setSize < 1 && !isCombo) {
      throw new Error(
        `Invalid stock code ${fullCode}. Only configured combo products can use 00 as their set code.`
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
      throw new Error(
        `Could not identify the product name above ${fullCode}.`
      );
    }

    const qtyMatch = line.match(/[×x]\s*(\d+)\s*qty/i);

    if (qtyMatch && Number(qtyMatch[1]) !== multiplier) {
      throw new Error(
        `${fullCode}: checkout quantity does not match the quantity encoded in the code.`
      );
    }

    if (!isCombo) {
      const packMatch =
        line.match(/(?:set\s+of\s+(?:mix\s+)?|set\s+of\s+mix\s+)(\d+)/i) ||
        line.match(/(\d+)\s*(?:pieces?|pices?)/i);

      if (packMatch && Number(packMatch[1]) !== setSize) {
        warnings.push(
          `${name}: message says ${packMatch[1]} pieces per set, but ${fullCode} encodes ${setSize}. Stock calculation follows the code.`
        );
      }
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

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(lineTotal)
    ) {
      throw new Error(`Invalid price for ${name}.`);
    }

    if (
      Math.round(unitPrice * multiplier * 100) !==
      Math.round(lineTotal * 100)
    ) {
      throw new Error(
        `${name}: unit price × quantity does not equal the line total.`
      );
    }

    items.push({
      name,
      fullCode,
      productCode: baseProductCode,
      piecesPerSet: isCombo ? 0 : setSize,
      quantity: multiplier,
      piecesRequired: isCombo ? 0 : setSize * multiplier,
      isCombo,
      unitPrice,
      lineTotal
    });
  }

  const productTotal = extractAmount(text, "Product Total");
  const shipping = extractAmount(text, "Shipping");
  const orderTotal = extractAmount(text, "Order Total");

  if (
    productTotal === null ||
    shipping === null ||
    orderTotal === null
  ) {
    throw new Error(
      "Could not read Product Total, Shipping and Order Total from the message."
    );
  }

  const calculatedProducts = items.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  if (
    Math.round(calculatedProducts * 100) !==
    Math.round(productTotal * 100)
  ) {
    throw new Error(
      `Product Total mismatch: line items add up to ${money(calculatedProducts)}, but message says ${money(productTotal)}.`
    );
  }

  if (
    Math.round((productTotal + shipping) * 100) !==
    Math.round(orderTotal * 100)
  ) {
    throw new Error(
      "Order Total does not equal Product Total + Shipping."
    );
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


/* =====================================================
   FIREBASE PRODUCT LOOKUP
===================================================== */

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


/* =====================================================
   GET ALL REQUIRED PRODUCT CODES

   Includes:
   - Ordered normal products
   - Ordered combo products
   - Every component used by ordered combos
===================================================== */

function getRequiredProductCodes(order) {
  const codes = new Set();

  order.items.forEach(item => {
    codes.add(item.productCode);

    if (item.isCombo) {
      const recipe = COMBO_RECIPES[item.productCode];

      if (!recipe || !recipe.length) {
        throw new Error(
          `No combo recipe configured for ${item.productCode}.`
        );
      }

      recipe.forEach(component => {
        codes.add(component.productCode);
      });
    }
  });

  // Prevent nested combos and invalid recipes.
  for (const item of order.items) {
    if (!item.isCombo) continue;

    const recipe = COMBO_RECIPES[item.productCode];

    recipe.forEach(component => {
      if (COMBO_RECIPES[component.productCode]) {
        throw new Error(
          `Nested combo component ${component.productCode} is not supported. Use normal products inside combo recipes.`
        );
      }

      if (
        !Number.isInteger(component.pieces) ||
        component.pieces <= 0
      ) {
        throw new Error(
          `Invalid recipe quantity for ${component.productCode} in ${item.productCode}.`
        );
      }
    });
  }

  return [...codes];
}


/* =====================================================
   STOCK CALCULATION

   This function is used for BOTH:
   - Preview
   - Final transaction

   All deductions are combined by product code.

   This prevents incorrect stock when:
   - A normal product is ordered individually.
   - The same product is used inside a combo.
   - Multiple combos use the same component.
===================================================== */

function calculateStockPlan(order, productMap) {
  const deductionsMap = new Map();
  const comboRequested = new Map();

  function addDeduction(productCode, pieces, source) {
    if (!deductionsMap.has(productCode)) {
      deductionsMap.set(productCode, {
        productCode,
        piecesDeducted: 0,
        sources: []
      });
    }

    const deduction = deductionsMap.get(productCode);

    deduction.piecesDeducted += pieces;
    deduction.sources.push(source);
  }

  order.items.forEach(item => {
    if (!item.isCombo) {
      addDeduction(
        item.productCode,
        item.piecesRequired,
        item.name
      );

      return;
    }

    const recipe = COMBO_RECIPES[item.productCode];

    comboRequested.set(
      item.productCode,
      (comboRequested.get(item.productCode) || 0) + item.quantity
    );

    recipe.forEach(component => {
      addDeduction(
        component.productCode,
        component.pieces * item.quantity,
        `${item.name} (${item.productCode})`
      );
    });
  });

  const deductions = [];
  let stockOkay = true;
  let totalPiecesDeducted = 0;

  for (const deduction of deductionsMap.values()) {
    const product = productMap.get(deduction.productCode);

    if (!product) {
      throw new Error(
        `Missing product data for ${deduction.productCode}.`
      );
    }

    const currentStock = Number(product.data.stock);
    const validStock =
      Number.isInteger(currentStock) && currentStock >= 0;

    const remainingStock = validStock
      ? currentStock - deduction.piecesDeducted
      : NaN;

    const enough =
      validStock && remainingStock >= 0;

    if (!enough) stockOkay = false;

    totalPiecesDeducted += deduction.piecesDeducted;

    deductions.push({
      productId: product.id,
      productCode: deduction.productCode,
      productName: product.data.name || deduction.productCode,
      stockBefore: currentStock,
      piecesDeducted: deduction.piecesDeducted,
      stockAfter: remainingStock,
      validStock,
      enough,
      sources: deduction.sources
    });
  }

  const comboSummaries = [];

  for (const [comboCode, requestedSets] of comboRequested.entries()) {
    const recipe = COMBO_RECIPES[comboCode];

    let availableBefore = Infinity;
    let availableAfter = Infinity;

    recipe.forEach(component => {
      const product = productMap.get(component.productCode);

      if (!product) {
        throw new Error(
          `Missing combo component ${component.productCode}.`
        );
      }

      const stock = Number(product.data.stock);

      if (!Number.isInteger(stock) || stock < 0) {
        availableBefore = NaN;
        availableAfter = NaN;
        return;
      }

      const componentDeduction =
        deductionsMap.get(component.productCode)?.piecesDeducted || 0;

      availableBefore = Math.min(
        availableBefore,
        Math.floor(stock / component.pieces)
      );

      availableAfter = Math.min(
        availableAfter,
        Math.floor(
          Math.max(0, stock - componentDeduction) /
          component.pieces
        )
      );
    });

    const comboProduct = productMap.get(comboCode);

    const validAvailability =
      Number.isInteger(availableBefore) &&
      Number.isInteger(availableAfter);

    if (!validAvailability || availableBefore < requestedSets) {
      stockOkay = false;
    }

    comboSummaries.push({
      productCode: comboCode,
      productName: comboProduct?.data.name || comboCode,
      requestedSets,
      availableBefore,
      availableAfter,
      validAvailability,
      recipe
    });
  }

  return {
    deductions,
    comboSummaries,
    stockOkay,
    totalPiecesDeducted
  };
}


/* =====================================================
   LOAD ALL PRODUCTS FOR ORDER PREVIEW
===================================================== */

async function loadOrderProducts(order) {
  const codes = getRequiredProductCodes(order);
  const productMap = new Map();

  for (const code of codes) {
    const product = await findProductsByCode(code);
    productMap.set(code, product);
  }

  return productMap;
}


/* =====================================================
   STOCK INVENTORY LIST
===================================================== */

async function refreshStockManagement() {
  const list = $("stockInventoryList");

  if (!list) return;

  list.innerHTML = `
    <div class="sm-empty">Loading current stock…</div>
  `;

  try {
    const snapshot = await getDocs(
      collection(db, PRODUCTS_COLLECTION)
    );

    const products = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const dateA = a.created?.toMillis?.() ?? 0;
        const dateB = b.created?.toMillis?.() ?? 0;

        return dateA - dateB;
      });

    if (!products.length) {
      list.innerHTML = `
        <div class="sm-empty">No accessory products found.</div>
      `;
      return;
    }

    list.innerHTML = products.map(product => {
      const stock = Number(product.stock);

      return `
        <div class="sm-inventory-row">
          <div>
            <strong>${escapeHTML(product.name || "Unnamed product")}</strong>
            <small>
              ${escapeHTML(product.productCode || "No product code")}
              ·
              ${escapeHTML(product.quantity || "Pack size not set")}
            </small>
          </div>

          <span class="sm-stock-number">
            ${Number.isInteger(stock) && stock >= 0 ? stock : "Invalid"} pcs
          </span>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Stock inventory refresh failed:", error);

    list.innerHTML = `
      <div class="sm-error">
        Could not load stock. Check Firebase permissions and connection.
      </div>
    `;
  }
}


/* =====================================================
   ORDER REVIEW
===================================================== */

function renderOrderReview(order, productMap, stockPlan) {
  const review = $("stockOrderReview");
  const confirmButton = $("stockConfirmOrderBtn");

  if (!review || !confirmButton) return;

  const rows = order.items.map(item => {
    const product = productMap.get(item.productCode);

    if (!product) return "";

    if (item.isCombo) {
      const combo = stockPlan.comboSummaries.find(
        entry => entry.productCode === item.productCode
      );

      const available = combo?.validAvailability
        ? combo.availableBefore
        : "Invalid";

      const enough =
        combo?.validAvailability &&
        combo.availableBefore >= item.quantity;

      return `
        <div class="sm-review-row">
          <div class="sm-review-title">
            <strong>${escapeHTML(item.name)}</strong>

            <span class="${enough ? "sm-pill-ok" : "sm-pill-bad"}">
              ${enough ? "Available" : "Insufficient combo stock"}
            </span>
          </div>

          <small>
            Combo code: ${escapeHTML(item.fullCode)}
            · Firebase product: ${escapeHTML(product.data.name || item.productCode)}
          </small>

          <div class="sm-review-grid">
            <span>Available sets <b>${available}</b></span>
            <span>Order quantity <b>${item.quantity} sets</b></span>
            <span>After order <b>${combo?.validAvailability ? combo.availableAfter : "—"} sets</b></span>
          </div>

          <small>
            This combo uses ${COMBO_RECIPES[item.productCode].length} component products.
            Component stock will be deducted below.
          </small>

          <small>
            ${money(item.unitPrice)} × ${item.quantity} =
            ${money(item.lineTotal)}
          </small>
        </div>
      `;
    }

    const deduction = stockPlan.deductions.find(
      entry => entry.productCode === item.productCode
    );

    const enough = deduction?.enough;

    return `
      <div class="sm-review-row">
        <div class="sm-review-title">
          <strong>${escapeHTML(item.name)}</strong>

          <span class="${enough ? "sm-pill-ok" : "sm-pill-bad"}">
            ${enough ? "Available" : "Insufficient stock"}
          </span>
        </div>

        <small>
          Code: ${escapeHTML(item.fullCode)}
          · Firebase product:
          ${escapeHTML(product.data.name || "Unnamed")}
        </small>

        <div class="sm-review-grid">
          <span>Current stock <b>${deduction?.stockBefore ?? "Invalid"}</b></span>
          <span>Deduct <b>−${item.piecesRequired} pcs</b></span>
          <span>After order <b>${deduction?.stockAfter ?? "—"} pcs</b></span>
        </div>

        <small>
          ${item.piecesPerSet} pieces/set × ${item.quantity} sets =
          ${item.piecesRequired} pieces · ${money(item.unitPrice)} ×
          ${item.quantity} = ${money(item.lineTotal)}
        </small>
      </div>
    `;
  }).join("");

  /* Component deductions */

  const componentRows = stockPlan.deductions.map(deduction => `
    <div class="sm-review-row">
      <div class="sm-review-title">
        <strong>${escapeHTML(deduction.productName)}</strong>

        <span class="${deduction.enough ? "sm-pill-ok" : "sm-pill-bad"}">
          ${deduction.enough ? "Stock OK" : "Insufficient stock"}
        </span>
      </div>

      <small>
        Component code: ${escapeHTML(deduction.productCode)}
      </small>

      <div class="sm-review-grid">
        <span>Current stock <b>${deduction.validStock ? deduction.stockBefore : "Invalid"}</b></span>
        <span>Total deduct <b>−${deduction.piecesDeducted} pcs</b></span>
        <span>After order <b>${deduction.validStock ? Math.max(0, deduction.stockAfter) : "—"} pcs</b></span>
      </div>
    </div>
  `).join("");

  /* Combo availability after the complete order */

  const comboRows = stockPlan.comboSummaries.map(combo => `
    <div class="sm-review-row">
      <div class="sm-review-title">
        <strong>${escapeHTML(combo.productName)} (${escapeHTML(combo.productCode)})</strong>

        <span class="sm-pill-ok">Recalculated</span>
      </div>

      <div class="sm-review-grid">
        <span>Before order <b>${combo.validAvailability ? combo.availableBefore : "Invalid"}</b></span>
        <span>Ordered <b>${combo.requestedSets} sets</b></span>
        <span>After order <b>${combo.validAvailability ? combo.availableAfter : "—"} sets</b></span>
      </div>

      <small>
        Update saved combo stock automatically to
        ${combo.validAvailability ? combo.availableAfter : "—"} sets.
      </small>
    </div>
  `).join("");

  const warningsHTML = order.warnings.length
    ? `
      <div class="sm-warning">
        <strong>Order warnings:</strong>

        <ul>
          ${order.warnings.map(w => `<li>${escapeHTML(w)}</li>`).join("")}
        </ul>

        <small>
          Review these warnings before dispatch.
          Stock calculations follow the encoded product code.
        </small>
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
      <div>
        <span>Products</span>
        <strong>${money(order.productTotal)}</strong>
      </div>

      <div>
        <span>Shipping</span>
        <strong>${money(order.shipping)}</strong>
      </div>

      <div class="sm-total">
        <span>Order total</span>
        <strong>${money(order.orderTotal)}</strong>
      </div>

      <div>
        <span>Pieces to deduct</span>
        <strong>${stockPlan.totalPiecesDeducted} pcs</strong>
      </div>
    </div>

    ${rows}

    ${stockPlan.comboSummaries.length ? `
      <h4>Combo Stock Summary</h4>
      ${comboRows}
    ` : ""}

    <h4>Actual Component Stock Deductions</h4>

    ${componentRows || `
      <div class="sm-empty">No stock deductions found.</div>
    `}

    ${warningsHTML}
    ${missingHTML}

    <p class="sm-safe-note">
      Nothing has been changed yet. Stock updates only after you confirm.
    </p>
  `;

  confirmButton.disabled = !stockPlan.stockOkay;

  confirmButton.title = stockPlan.stockOkay
    ? ""
    : "Resolve stock issues before confirming.";
}


/* =====================================================
   CHECK ACCESSORY ORDER
===================================================== */

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

    const productMap = await loadOrderProducts(order);

    if (token !== previewToken) return;

    const stockPlan = calculateStockPlan(order, productMap);

    parsedOrder = order;
    parsedOrder.productCodes = getRequiredProductCodes(order);
    parsedOrder.previewAt = Date.now();

    renderOrderReview(order, productMap, stockPlan);

    setMessage(
      $("stockOrderStatus"),
      confirmButton.disabled
        ? "Order read, but fix the stock issues shown before confirming."
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

  const daysToAdd = daysUntilThursday === 0
    ? 7
    : daysUntilThursday;

  dispatchDate.setDate(dispatchDate.getDate() + daysToAdd);

  return dispatchDate;
}


/* =====================================================
   HASH / ORDER NUMBER
===================================================== */

async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getHighestAccessoryOrderNumber() {
  const snapshot = await getDocs(
    collection(db, ORDERS_COLLECTION)
  );

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


/* =====================================================
   CONFIRM ORDER AND UPDATE STOCK

   Important:
   - All product reads happen before transaction writes.
   - Every component deduction is aggregated.
   - Component stock is updated once per product.
   - Combo stock is recalculated after all deductions.
   - Public/private order records are saved atomically.
===================================================== */

async function confirmAccessoryStockOrder() {
  const confirmButton = $("stockConfirmOrderBtn");
  const checkButton = $("stockCheckOrderBtn");

  if (!confirmButton || confirmButton.disabled || !parsedOrder) {
    return;
  }

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

    const highestExisting =
      await getHighestAccessoryOrderNumber();

    /*
      Resolve every product needed by the order.

      This includes combo component products.
    */

    const productCodes = getRequiredProductCodes(order);
    const productRefs = new Map();

    for (const code of productCodes) {
      const product = await findProductsByCode(code);
      productRefs.set(code, product.ref);
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

    const confirmedAt = new Date();

    const estimatedDispatchDate =
      getEstimatedDispatchDate(confirmedAt);

    const estimatedDispatchISO =
      toISODate(estimatedDispatchDate);

    const estimatedDispatchDisplay =
      toDisplayDate(estimatedDispatchDate);

    const result = await runTransaction(db, async transaction => {
      /* All reads must happen before writes. */

      const duplicateSnapshot =
        await transaction.get(existingOrderRef);

      if (duplicateSnapshot.exists()) {
        throw new Error(
          `This exact WhatsApp order was already processed as ${duplicateSnapshot.data().orderId}.`
        );
      }

      const counterSnapshot =
        await transaction.get(counterRef);

      const productSnapshots = new Map();

      for (const code of productCodes) {
        const ref = productRefs.get(code);

        productSnapshots.set(
          code,
          await transaction.get(ref)
        );
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

      const customerSnapshot =
        await transaction.get(customerRef);

      if (customerSnapshot.exists()) {
        throw new Error(
          `Customer details for ${orderId} already exist. Refresh and try again.`
        );
      }

      /*
        Build fresh product map from transaction snapshots.
        This is the authoritative live stock data.
      */

      const liveProductMap = new Map();

      for (const [code, snapshot] of productSnapshots.entries()) {
        if (!snapshot.exists()) {
          throw new Error(
            `Product ${code} was deleted after preview. Run Check Order & Stock again.`
          );
        }

        const data = snapshot.data();

        if (
          String(data.productCode || "").toUpperCase() !== code
        ) {
          throw new Error(
            `Product code changed for ${code}. Run Check Order & Stock again.`
          );
        }

        if (data.active === false) {
          throw new Error(
            `Product ${code} is now inactive. No changes were made.`
          );
        }

        liveProductMap.set(code, {
          id: snapshot.id,
          ref: productRefs.get(code),
          data
        });
      }

      /*
        Recalculate the complete stock plan using live stock.
      */

      const stockPlan = calculateStockPlan(
        order,
        liveProductMap
      );

      if (!stockPlan.stockOkay) {
        const insufficient = stockPlan.deductions
          .filter(item => !item.enough)
          .map(item =>
            `${item.productName}: required ${item.piecesDeducted}, available ${item.stockBefore}`
          );

        const unavailableCombos = stockPlan.comboSummaries
          .filter(combo =>
            !combo.validAvailability ||
            combo.availableBefore < combo.requestedSets
          )
          .map(combo =>
            `${combo.productCode}: requested ${combo.requestedSets} sets, available ${combo.availableBefore}`
          );

        throw new Error(
          "Stock changed or is insufficient. No changes were made. " +
          [...insufficient, ...unavailableCombos].join(" | ") +
          " Run Check Order & Stock again."
        );
      }

      /*
        Prepare saved order product lines.
      */

      const savedProducts = order.items.map(item => {
        const product = liveProductMap.get(item.productCode);

        if (item.isCombo) {
          return {
            name: product.data.name || item.name,
            quantity: item.quantity,
            productCode: item.productCode,
            checkoutCode: item.fullCode,
            isCombo: true,
            piecesPerSet: 0,
            piecesDeducted: 0,
            comboRecipe: COMBO_RECIPES[item.productCode].map(component => ({
              productCode: component.productCode,
              piecesPerSet: component.pieces,
              totalPieces: component.pieces * item.quantity
            })),
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal
          };
        }

        return {
          name: product.data.name || item.name,
          quantity: item.quantity,
          productCode: item.productCode,
          checkoutCode: item.fullCode,
          isCombo: false,
          piecesPerSet: item.piecesPerSet,
          piecesDeducted: item.piecesRequired,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal
        };
      });

      /*
        Apply actual component deductions.

        Each product is updated only once, even if it is used
        by an individual order item and one or more combos.
      */

      for (const deduction of stockPlan.deductions) {
        const ref = productRefs.get(deduction.productCode);

        transaction.update(ref, {
          stock: deduction.stockAfter,
          stockUpdatedAt: serverTimestamp()
        });
      }

      /*
        Save newly calculated combo stock.

        Do not separately deduct combo stock.
      */

      const comboStockUpdates = [];

      for (const combo of stockPlan.comboSummaries) {
        const ref = productRefs.get(combo.productCode);

        transaction.update(ref, {
          stock: combo.availableAfter,
          stockUpdatedAt: serverTimestamp()
        });

        comboStockUpdates.push({
          productCode: combo.productCode,
          productName: combo.productName,
          requestedSets: combo.requestedSets,
          stockBefore: combo.availableBefore,
          stockAfter: combo.availableAfter
        });
      }

      /* Order counter */

      transaction.set(counterRef, {
        lastNumber: nextNumber,
        updatedAt: serverTimestamp()
      });

      const publicProducts = savedProducts.map(item => ({
        name: item.name,
        quantity: item.quantity
      }));

      /* PUBLIC ORDER: bookedOrders */

      transaction.set(existingOrderRef, {
        orderId,
        bookedDate: toDisplayDate(confirmedAt),
        confirmedAt: serverTimestamp(),
        design: "Accessories Order",
        products: publicProducts,

        shippingDate: estimatedDispatchDisplay,
        estimatedDispatchDate: estimatedDispatchISO,
        estimatedDispatchDay: "Thursday",

        status: "Ready to Pack",
        dispatchedDate: "",
        hidden: false
      });

      /* PRIVATE ORDER: orderCustomers */

      transaction.set(customerRef, {
        orderId,
        orderType: "Accessories",
        bookedDate: toDisplayDate(confirmedAt),
        confirmedAt: serverTimestamp(),

        estimatedDispatchDate: estimatedDispatchISO,
        estimatedDispatchDay: "Thursday",

        name: deliveryFields.name,
        address: deliveryFields.address,
        postOffice: deliveryFields.postOffice,
        postOfficeName: deliveryFields.postOfficeName,
        pincode: deliveryFields.pincode,
        phone: deliveryFields.phone,

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

        totalPiecesDeducted: stockPlan.totalPiecesDeducted,

        stockDeductions: stockPlan.deductions.map(item => ({
          productId: item.productId,
          productCode: item.productCode,
          productName: item.productName,
          stockBefore: item.stockBefore,
          piecesDeducted: item.piecesDeducted,
          stockAfter: item.stockAfter
        })),

        comboStockUpdates,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        orderId,
        deductions: stockPlan.deductions,
        comboStockUpdates
      };
    });

    /* =================================================
       SUCCESS MESSAGE
    ================================================= */

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

          <p>
            Stock has been updated and the order is saved in Firebase.
          </p>

          <p>
            <strong>Estimated dispatch:</strong>
            Thursday, ${escapeHTML(estimatedDispatchDisplay)}
          </p>

          <small>ORDER ID</small>

          <strong class="sm-generated-id">
            ${escapeHTML(result.orderId)}
          </strong>

          <button
            type="button"
            id="copyAccessoryOrderIdBtn"
            class="sm-primary"
          >
            Copy order confirmation
          </button>

          <h4>Component Stock Deducted</h4>

          <div class="sm-deduction-list">
            ${result.deductions.map(d => `
              <div>
                <span>
                  ${escapeHTML(d.productName)}
                  (${escapeHTML(d.productCode)})
                </span>

                <b>
                  −${d.piecesDeducted}
                  · remaining ${d.stockAfter}
                </b>
              </div>
            `).join("")}
          </div>

          ${result.comboStockUpdates.length ? `
            <h4>Updated Combo Availability</h4>

            <div class="sm-deduction-list">
              ${result.comboStockUpdates.map(combo => `
                <div>
                  <span>
                    ${escapeHTML(combo.productName)}
                    (${escapeHTML(combo.productCode)})
                  </span>

                  <b>
                    ${combo.stockBefore} → ${combo.stockAfter} sets
                  </b>
                </div>
              `).join("")}
            </div>
          ` : ""}
        </div>
      `;
    }

    $("copyAccessoryOrderIdBtn")?.addEventListener(
      "click",
      async () => {
        try {
          await navigator.clipboard.writeText(confirmation);

          setMessage(
            $("stockOrderStatus"),
            "Order confirmation copied.",
            "success"
          );
        } catch {
          window.prompt(
            "Copy this order confirmation:",
            confirmation
          );
        }
      }
    );

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
    console.error(
      "Accessory order confirmation failed:",
      error
    );

    setMessage(
      $("stockOrderStatus"),
      error.message || "Confirmation failed. No order was confirmed.",
      "error"
    );

    parsedOrder = null;

    $("stockConfirmOrderBtn").disabled = true;

  } finally {
    confirmButton.textContent = "Confirm Order & Update Stock";

    if (checkButton) {
      checkButton.disabled = false;
    }
  }
}


/* =====================================================
   GLOBAL FUNCTIONS
===================================================== */

window.refreshStockManagement = refreshStockManagement;
window.checkAccessoryOrder = checkAccessoryOrder;
window.confirmAccessoryStockOrder = confirmAccessoryStockOrder;


/* =====================================================
   CLEAR ORDER CHECK
===================================================== */

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


/* =====================================================
   INITIALIZATION
===================================================== */

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

    checkButton.insertAdjacentElement(
      "afterend",
      clearButton
    );

    clearButton.addEventListener(
      "click",
      clearAccessoryOrderCheck
    );
  }

  refreshStockManagement();
});
