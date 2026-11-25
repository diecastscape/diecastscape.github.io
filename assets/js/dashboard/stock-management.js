
import { db, auth } from "../firebase-init.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/*
  Diecast.scape — Accessories Manual Order Reader + Stock Updater

  Manual orders are created in the secure Orders system.
  Stock, Accessories counters, duplicate protection and the order
  are committed atomically by the authenticated admin API.

  Historical bookedOrders and orderCustomers records remain untouched.
*/

/* =====================================================
   COLLECTIONS
===================================================== */

const PRODUCTS_COLLECTION = "accessoriesProducts";

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

  return {
    rawText: text,
    items,
    warnings,
    productTotal,
    shipping,
    orderTotal
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
    const reservedStock = Number(product.data.reservedStock || 0);
    const validStock =
      Number.isInteger(currentStock) && currentStock >= 0 &&
      Number.isInteger(reservedStock) && reservedStock >= 0;

    const availableStock = validStock
      ? Math.max(0, currentStock - reservedStock)
      : NaN;
    const remainingStock = validStock
      ? currentStock - deduction.piecesDeducted
      : NaN;

    const enough =
      validStock && availableStock >= deduction.piecesDeducted;

    if (!enough) stockOkay = false;

    totalPiecesDeducted += deduction.piecesDeducted;

    deductions.push({
      productId: product.id,
      productCode: deduction.productCode,
      productName: product.data.name || deduction.productCode,
      stockBefore: currentStock,
      reservedStock,
      availableStock,
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
      const reserved = Number(product.data.reservedStock || 0);
      const availableStock = stock - reserved;

      if (!Number.isInteger(stock) || stock < 0 ||
          !Number.isInteger(reserved) || reserved < 0) {
        availableBefore = NaN;
        availableAfter = NaN;
        return;
      }

      const componentDeduction =
        deductionsMap.get(component.productCode)?.piecesDeducted || 0;

      availableBefore = Math.min(
        availableBefore,
        Math.floor(Math.max(0, availableStock) / component.pieces)
      );

      availableAfter = Math.min(
        availableAfter,
        Math.floor(
          Math.max(0, availableStock - componentDeduction) /
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


function readManualCustomer(){
  return {
    name:$("stockCustomerName")?.value.trim()||"",
    phoneNumber:$("stockCustomerPhone")?.value.replace(/\D/g,"")||"",
    address:$("stockCustomerAddress")?.value.trim()||"",
    city:$("stockCustomerCity")?.value.trim()||"",
    state:$("stockCustomerState")?.value.trim()||"",
    postOffice:$("stockCustomerPostOffice")?.value.trim()||"",
    pincode:$("stockCustomerPincode")?.value.trim()||""
  };
}
function manualCustomerIsValid(){
  const c=readManualCustomer();
  return c.name.length>=2&&c.phoneNumber.length===10&&
    c.address.length>=5&&c.city.length>=2&&c.state.length>=2&&
    c.postOffice.length>=2&&/^\d{6}$/.test(c.pincode);
}

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
          <span>Available after holds <b>${deduction?.availableStock ?? "Invalid"}</b></span>
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
        <span>Available after holds <b>${deduction.validStock ? deduction.availableStock : "Invalid"}</b></span>
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

    <div class="sm-dispatch-date-field">
      <label for="stockEstimatedDispatchDate">Estimated Dispatch Date</label>
      <input
        type="date"
        id="stockEstimatedDispatchDate"
        class="sm-dispatch-date-input"
        required
      >
      <small>This date is saved only after you click Confirm Order.</small>
    </div>

    <p class="sm-safe-note">
      Nothing has been changed yet. Stock updates only after you confirm.
    </p>
  `;

  confirmButton.disabled = !stockPlan.stockOkay || !manualCustomerIsValid();

  confirmButton.title = !stockPlan.stockOkay
    ? "Resolve stock issues before confirming."
    : (!manualCustomerIsValid() ? "Complete all mandatory delivery details before confirming." : "");
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

/* =====================================================
   HASH / ORDER NUMBER
===================================================== */

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
  const confirmButton=$("stockConfirmOrderBtn");
  const checkButton=$("stockCheckOrderBtn");
  if(!confirmButton||confirmButton.disabled||!parsedOrder)return;

  const order=parsedOrder;
  const currentText=$("stockOrderMessage")?.value.trim()||"";
  const estimatedDispatchISO=$("stockEstimatedDispatchDate")?.value||"";
  const customer=readManualCustomer();

  if(!manualCustomerIsValid()){
    setMessage($("stockOrderStatus"),"Complete all delivery details. Phone must be 10 digits and pincode must be 6 digits.","error");
    return;
  }
  if(!/^\d{4}-\d{2}-\d{2}$/.test(estimatedDispatchISO)){
    setMessage($("stockOrderStatus"),"Select an Estimated Dispatch Date before confirming.","error");
    return;
  }
  if(currentText!==order.rawText){
    setMessage($("stockOrderStatus"),"The pasted message changed. Check the order again.","error");
    confirmButton.disabled=true;
    return;
  }

  confirmButton.disabled=true;
  if(checkButton)checkButton.disabled=true;
  confirmButton.textContent="Confirming order…";

  try{
    const user=auth.currentUser;
    if(!user)throw new Error("Admin session expired. Sign in again.");
    const token=await user.getIdToken();
    const response=await fetch("/api/admin/accessories-orders",{
      method:"POST",
      headers:{"content-type":"application/json","authorization":"Bearer "+token},
      body:JSON.stringify({
        action:"createManual",
        rawText:order.rawText,
        expectedDispatchDate:estimatedDispatchISO,
        customer,
        items:order.items.map(item=>({
          name:item.name,fullCode:item.fullCode,productCode:item.productCode,
          piecesPerSet:item.piecesPerSet,quantity:item.quantity,
          unitPrice:item.unitPrice,lineTotal:item.lineTotal
        })),
        subtotal:order.productTotal,shipping:order.shipping,grandTotal:order.orderTotal
      })
    });
    const result=await response.json();
    if(!response.ok||!result.ok)throw new Error(result.error||"Could not confirm the manual order.");

    const dispatchDisplay=toDisplayDate(new Date(estimatedDispatchISO+"T00:00:00"));
    const confirmation=
      "Diecast.scape order confirmed! ✅\n\n"+
      "Order ID: "+result.orderId+"\n"+
      "Estimated dispatch: "+dispatchDisplay+"\n\n"+
      "Track your order progress here:\n"+
      window.location.origin+"/your-orders/\n\n"+
      "Thank you for choosing Diecast.scape!";

    const success=$("stockOrderSuccess");
    if(success){
      success.style.display="";
      success.innerHTML=`
        <div class="sm-success-card">
          <div class="sm-success-icon">✓</div>
          <h4>Manual order booked successfully</h4>
          <p>Saved in the new Orders system. Stock and the Accessories order counter were updated together.</p>
          <p><strong>Estimated dispatch:</strong> ${escapeHTML(dispatchDisplay)}</p>
          <small>ORDER ID</small>
          <strong class="sm-generated-id">${escapeHTML(result.orderId)}</strong>
          <button type="button" id="copyAccessoryOrderIdBtn" class="sm-primary">Copy order confirmation</button>
          <h4>Component Stock Deducted</h4>
          <div class="sm-deduction-list">
            ${(result.stockDeductions||[]).map(d=>`
              <div><span>${escapeHTML(d.productName)} (${escapeHTML(d.productCode)})</span><b>−${d.piecesDeducted} · remaining ${d.stockAfter}</b></div>
            `).join("")}
          </div>
          ${(result.comboStockUpdates||[]).length?`
            <h4>Updated Combo Availability</h4>
            <div class="sm-deduction-list">
              ${result.comboStockUpdates.map(combo=>`
                <div><span>${escapeHTML(combo.productCode)}</span><b>${combo.stockBefore} → ${combo.stockAfter} sets</b></div>
              `).join("")}
            </div>
          `:""}
        </div>`;
    }
    $("copyAccessoryOrderIdBtn")?.addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(confirmation);setMessage($("stockOrderStatus"),"Order confirmation copied.","success");}
      catch{window.prompt("Copy this order confirmation:",confirmation);}
    });

    setMessage($("stockOrderStatus"),"Confirmed successfully: "+result.orderId,"success");
    parsedOrder=null;
    confirmButton.disabled=true;
    await refreshStockManagement();
    if(typeof window.loadAccessoriesAdminOrders==="function")await window.loadAccessoriesAdminOrders();
  }catch(error){
    console.error("Manual Accessories order confirmation failed:",error);
    setMessage($("stockOrderStatus"),error.message||"Confirmation failed. No order was confirmed.","error");
    confirmButton.disabled=true;
    parsedOrder=null;
  }finally{
    confirmButton.textContent="Confirm Order & Update Stock";
    if(checkButton)checkButton.disabled=false;
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
  const dispatchDateInput = $("stockEstimatedDispatchDate");
  if (dispatchDateInput) dispatchDateInput.value = "";

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
  ["stockCustomerName","stockCustomerPhone","stockCustomerAddress","stockCustomerCity","stockCustomerState","stockCustomerPostOffice","stockCustomerPincode"].forEach(id=>$(id)?.addEventListener("input",()=>{
    if(parsedOrder){const planButton=$("stockConfirmOrderBtn");if(planButton){const stockBlocked=planButton.title==="Resolve stock issues before confirming.";const valid=manualCustomerIsValid();planButton.disabled=!valid||stockBlocked;planButton.title=stockBlocked?"Resolve stock issues before confirming.":(valid?"":"Complete all mandatory delivery details.");}}
  }));
});
