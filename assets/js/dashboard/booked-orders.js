
import { db } from "../firebase-init.js";

import {
  collection,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { adminState } from "/assets/js/dashboard/dashboard.js";

// ======================================================
// SETTINGS
// ======================================================

const ORDERS_COLLECTION = "bookedOrders";
const CUSTOMERS_COLLECTION = "orderCustomers";

const COUNTERS_COLLECTION = "bookedOrderCounters";
const COUNTER_DOCUMENT = "orderIdSequence";

const COUNTER_REF = doc(
  db,
  COUNTERS_COLLECTION,
  COUNTER_DOCUMENT
);

const ORDER_PREFIX = "DS-D";
const FIRST_ORDER_NUMBER = 1000;

const ORDER_STATUSES = [
  "Pending",
  "Next in Work",
  "In Progress",
  "Ready to Dispatch",
  "Dispatched"
];

// Change this if your public tracking page uses another URL.
const ORDER_PROGRESS_URL =
  `${window.location.origin}/booked-orders/`;

// ======================================================
// HELPERS
// ======================================================

function byId(id) {
  return document.getElementById(id);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isoToDisplayDate(value) {
  if (!value) return "";

  const parts = String(value).split("-");

  if (parts.length !== 3) return String(value);

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function displayToISODate(value) {
  if (!value) return "";

  const parts = String(value).split("/");

  if (parts.length !== 3) return "";

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function storedDateToISO(value) {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return displayToISODate(text);
  }

  return "";
}

/* =========================================
   BOOKED ORDER — MULTIPLE PRODUCTS
========================================= */

let bookedProductRowCount = 0;

/**
 * Add a new product row to the booked order form.
 * Each row includes a product name and quantity.
 */
function addBookedProductRow(productName = "", quantity = 1) {
  const productsList = document.getElementById("bo-productsList");

  if (!productsList) {
    console.error("Missing #bo-productsList element.");
    return;
  }

  const rowId = `bo-product-row-${++bookedProductRowCount}`;

  const row = document.createElement("div");
  row.className = "bo-product-row";
  row.id = rowId;

  row.innerHTML = `
    
<div class="bo-product-field">
  <label for="${rowId}-name">Product</label>
  <select
    id="${rowId}-name"
    class="bo-product-name"
    required
  >
    <option value="">Select Diorama</option>
    <option value="Classic Diorama">Classic Diorama</option>
    <option value="Premium Diorama">Premium Diorama</option>
    <option value="Exclusive Diorama">Exclusive Diorama</option>
    <option value="Custom Diorama">Custom Diorama</option>
  </select>
</div>
    <div class="bo-product-field bo-product-quantity-field">
      <label for="${rowId}-qty">Qty</label>
      <input
        type="number"
        id="${rowId}-qty"
        class="bo-product-quantity"
        min="1"
        step="1"
        value="${Number.isInteger(Number(quantity)) && Number(quantity) > 0 ? Number(quantity) : 1}"
        required
      >
    </div>

    <button
      type="button"
      class="bo-remove-product-btn"
      aria-label="Remove this product"
      title="Remove product"
    >Remove</button>
  `;

  
const nameInput = row.querySelector(".bo-product-name");

if (
  productName &&
  ![...nameInput.options].some(option => option.value === productName)
) {
  const oldOption = document.createElement("option");
  oldOption.value = productName;
  oldOption.textContent = productName;
  nameInput.appendChild(oldOption);
}

nameInput.value = productName;

  row.querySelector(".bo-remove-product-btn").addEventListener("click", () => {
    row.remove();

    // Keep one blank row so a new product can always be added.
    if (!productsList.querySelector(".bo-product-row")) {
      addBookedProductRow();
    }
  });

  productsList.appendChild(row);
}

/**
 * Read and validate all product rows.
 * Returns an array of { name, quantity } objects.
 */
function getBookedProducts() {
  const productsList = document.getElementById("bo-productsList");

  if (!productsList) {
    throw new Error("Products section is missing from the form.");
  }

  const rows = [...productsList.querySelectorAll(".bo-product-row")];

  const products = rows.map((row) => {
    const nameInput = row.querySelector(".bo-product-name");
    const quantityInput = row.querySelector(".bo-product-quantity");

    const name = nameInput?.value.trim() || "";
    const quantity = Number(quantityInput?.value);

    if (!name) {
      throw new Error("Please enter a name for every product.");
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Enter a valid quantity for "${name}".`);
    }

    return { name, quantity };
  });

  if (products.length === 0) {
    throw new Error("Please add at least one product.");
  }

  return products;
}

/**
 * Display saved products when editing an existing order.
 */
function renderBookedProducts(products) {
  const productsList = document.getElementById("bo-productsList");
  if (!productsList) return;

  productsList.innerHTML = "";

  let normalizedProducts = [];

  if (Array.isArray(products)) {
    normalizedProducts = products.map((item) => {
      if (typeof item === "string") {
        return { name: item, quantity: 1 };
      }

      return {
        name: item?.name || item?.productName || "",
        quantity: Number(item?.quantity) || 1
      };
    });
  } else if (typeof products === "string" && products.trim()) {
    // Supports older orders where products were saved as plain text.
    normalizedProducts = products
      .split(/\n|,\s*(?=[^,]+$)/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1 }));
  }

  if (normalizedProducts.length === 0) {
    addBookedProductRow();
    return;
  }

  normalizedProducts.forEach((product) => {
    addBookedProductRow(product.name, product.quantity);
  });
}

/**
 * Convert products to readable text for old code,
 * order summaries, or WhatsApp messages.
 */
function bookedProductsToText(products) {
  if (!Array.isArray(products)) return String(products || "");

  return products
    .map((product) => `${product.name} × ${product.quantity}`)
    .join("\n");
}

// Keep these functions available to inline HTML handlers.
window.addBookedProductRow = addBookedProductRow;
window.getBookedProducts = getBookedProducts;
window.renderBookedProducts = renderBookedProducts;
window.bookedProductsToText = bookedProductsToText;

// Start with one empty product row when the page is ready.
document.addEventListener("DOMContentLoaded", () => {
  const productsList = document.getElementById("bo-productsList");

  if (productsList && !productsList.querySelector(".bo-product-row")) {
    addBookedProductRow();
  }
});
function storedDateToDisplay(value) {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return isoToDisplayDate(text);
  }

  return text;
}

function setMessage(message, type = "") {
  const element = byId("bo-saveMsg");
  if (!element) return;

  element.textContent = message;
  element.className = "booked-save-message";

  if (type) element.classList.add(type);
}

function setSaving(isSaving) {
  const button = byId("bo-saveBtn");
  const loader = byId("bo-saveLoader");

  if (button) button.disabled = isSaving;
  if (loader) loader.classList.toggle("show", isSaving);
}

function setAddButtonEditing(isEditing) {
  const button = byId("bookedOrdersAddBtn");
  if (!button) return;

  button.textContent = isEditing ? "Cancel" : "+ Add";
  button.classList.toggle("cancel-btn", isEditing);
}

function setEditModeBar(text = "", visible = false) {
  const bar = byId("bookedOrderEditModeBar");
  if (!bar) return;

  bar.textContent = text;
  bar.style.display = visible ? "block" : "none";
}

function productsToText(products) {
  if (typeof products === "string") return products;

  if (!Array.isArray(products)) return "";

  return products.map(item => {
    if (typeof item === "string") return item;

    const name = item?.name || item?.title || "Product";
    const quantity = item?.quantity
      ? `× ${item.quantity}`
      : "";

    return [name, quantity].filter(Boolean).join(" ");
    
  }).join("\n");
}

// ======================================================
// ACCESSORIES BOOKING HELPERS
// ======================================================

function isAccessoriesOrder(order) {
  return (
    String(order?.orderId || "").startsWith("DS-A") ||
    String(order?.orderType || "").toLowerCase() === "accessories"
  );
}


// Convert the existing customerDetails text into editable fields.
function parseAccessoriesCustomerDetails(text = "") {
  const details = {
    name: "",
    address: "",
    postOfficeName: "",
    pincode: "",
    phone: ""
  };

  const labels = {
    "name": "name",
    "address": "address",
    "post office name": "postOfficeName",
    "pincode": "pincode",
    "phone": "phone"
  };

  String(text).split(/\r?\n/).forEach(line => {
    const separator = line.indexOf(":");

    if (separator === -1) return;

    const label = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    const key = labels[label];

    if (key) {
      details[key] = /^not provided$/i.test(value) ? "" : value;
    }
  });

  return details;
}


// Format the fields using the existing orderCustomers schema.
function formatAccessoriesCustomerDetails(details) {
  return [
    `Name: ${details.name.trim() || "Not provided"}`,
    `Address: ${details.address.trim() || "Not provided"}`,
    `Post Office Name: ${details.postOfficeName.trim() || "Not provided"}`,
    `Pincode: ${details.pincode.trim() || "Not provided"}`,
    `Phone: ${details.phone.trim() || "Not provided"}`
  ].join("\n");
}


// Display product names and ordered quantities only.
function accessoriesProductsToText(products) {
  if (!Array.isArray(products)) return "";

  return products.map(item => {
    if (typeof item === "string") {
      return `${item} × 1`;
    }

    const name = item?.name || item?.productName || "Product";
    const quantity = Number(item?.quantity) || 1;

    return `${name} × ${quantity}`;
  }).join("\n");
}
// ======================================================
// ACCESSORIES DELIVERY DETAILS
// ======================================================

window.saveAccessoriesDeliveryDetails = async function (orderId) {
  const button = byId(`accessory-customer-save-${orderId}`);

  if (button?.disabled) return;

  const getValue = field =>
    byId(`accessory-${field}-${orderId}`)?.value.trim() || "";

  const details = {
    name: getValue("name"),
    address: getValue("address"),
    postOfficeName: getValue("postOfficeName"),
    pincode: getValue("pincode"),
    phone: getValue("phone")
  };

  if (!details.name) {
    alert("Please enter the customer's name.");
    return;
  }

  if (!details.address) {
    alert("Please enter the delivery address.");
    return;
  }

  if (!details.postOfficeName) {
    alert("Please enter the post office name.");
    return;
  }

  if (!/^\d{6}$/.test(details.pincode)) {
    alert("Please enter a valid 6-digit pincode.");
    return;
  }

  if (!/^[6-9]\d{9}$/.test(details.phone)) {
    alert("Please enter a valid 10-digit Indian mobile number.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }

  try {
    const customerRef = doc(
      db,
      CUSTOMERS_COLLECTION,
      orderId
    );

    const customerSnapshot = await getDoc(customerRef);

    if (!customerSnapshot.exists()) {
      throw new Error(
        "Customer details document not found for " + orderId
      );
    }

    // Update only private customer delivery details.
    // Preserve the existing document's other fields.
    await updateDoc(customerRef, {
      customerDetails: formatAccessoriesCustomerDetails(details)
    });

    alert("Accessories delivery details saved successfully.");

    await window.loadAccessoriesBookedOrders();

  } catch (error) {
    console.error("Error saving delivery details:", error);

    alert(
      error.message ||
      "Could not save delivery details. Check admin permissions."
    );

    if (button) {
      button.disabled = false;
      button.textContent = "Save Delivery Details";
    }
  }
};
// ======================================================
// EDIT ACCESSORIES DELIVERY DETAILS
// ======================================================

window.editAccessoriesDeliveryDetails = async function (orderId) {
  try {
    const customerRef = doc(
      db,
      CUSTOMERS_COLLECTION,
      orderId
    );

    const customerSnapshot = await getDoc(customerRef);

    if (!customerSnapshot.exists()) {
      alert("Customer details document not found.");
      return;
    }

    const details = parseAccessoriesCustomerDetails(
      customerSnapshot.data().customerDetails || ""
    );

    const oldPopup = document.getElementById(
      "accessoryDeliveryEditPopup"
    );

    if (oldPopup) oldPopup.remove();

    const popup = document.createElement("div");
    popup.id = "accessoryDeliveryEditPopup";
    popup.className = "accessory-edit-overlay";

    popup.innerHTML = `
      <div class="accessory-edit-box">

        <h3>Edit Delivery Details</h3>

        <p>Order ID: ${escapeHTML(orderId)}</p>

        <label for="accessory-edit-name">Customer Name</label>
        <input
          id="accessory-edit-name"
          type="text"
          value="${escapeHTML(details.name)}"
        >

        <label for="accessory-edit-address">Delivery Address</label>
        <textarea
          id="accessory-edit-address"
          rows="3"
        >${escapeHTML(details.address)}</textarea>

        <label for="accessory-edit-postOffice">Post Office Name</label>
        <input
          id="accessory-edit-postOffice"
          type="text"
          value="${escapeHTML(details.postOfficeName)}"
        >

        <label for="accessory-edit-pincode">Pincode</label>
        <input
          id="accessory-edit-pincode"
          type="text"
          inputmode="numeric"
          maxlength="6"
          value="${escapeHTML(details.pincode)}"
        >

        <label for="accessory-edit-phone">Phone</label>
        <input
          id="accessory-edit-phone"
          type="tel"
          inputmode="numeric"
          maxlength="10"
          value="${escapeHTML(details.phone)}"
        >

        <div class="accessory-edit-actions">
          <button
            type="button"
            id="accessory-edit-save"
          >
            Save Changes
          </button>

          <button
            type="button"
            id="accessory-edit-cancel"
          >
            Cancel
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(popup);

    popup.querySelector("#accessory-edit-cancel")
      .addEventListener("click", () => popup.remove());

    popup.querySelector("#accessory-edit-save")
      .addEventListener("click", async () => {
        const saveButton = popup.querySelector(
          "#accessory-edit-save"
        );

        const updatedDetails = {
          name: popup.querySelector("#accessory-edit-name").value.trim(),
          address: popup.querySelector("#accessory-edit-address").value.trim(),
          postOfficeName: popup.querySelector("#accessory-edit-postOffice").value.trim(),
          pincode: popup.querySelector("#accessory-edit-pincode").value.trim(),
          phone: popup.querySelector("#accessory-edit-phone").value.trim()
        };

        if (
          !updatedDetails.name ||
          !updatedDetails.address ||
          !updatedDetails.postOfficeName
        ) {
          alert("Please complete the name, address, and post office fields.");
          return;
        }

        if (!/^\d{6}$/.test(updatedDetails.pincode)) {
          alert("Please enter a valid 6-digit pincode.");
          return;
        }

        if (!/^[6-9]\d{9}$/.test(updatedDetails.phone)) {
          alert("Please enter a valid 10-digit Indian mobile number.");
          return;
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
          await updateDoc(customerRef, {
            customerDetails:
              formatAccessoriesCustomerDetails(updatedDetails)
          });

          popup.remove();

          await window.loadAccessoriesBookedOrders();

          alert("Delivery details updated successfully.");

        } catch (error) {
          console.error("Error updating delivery details:", error);

          alert("Could not save delivery details. Check Firebase permissions.");

          saveButton.disabled = false;
          saveButton.textContent = "Save Changes";
        }
      });

  } catch (error) {
    console.error("Error opening delivery editor:", error);
    alert("Could not load the delivery details.");
  }
};
// ======================================================
// LOAD ACCESSORIES BOOKINGS
// ======================================================

window.loadAccessoriesBookedOrders = async function () {
  const container = byId("accessoriesBookedOrdersList");

  if (!container) return;

  container.innerHTML = `
    <div class="booked-loading-state">
      Loading Accessories bookings...
    </div>
  `;

  try {
    // Public booking and tracking information.
    const ordersSnapshot = await getDocs(
      collection(db, ORDERS_COLLECTION)
    );

    const orders = [];

    ordersSnapshot.forEach(orderDoc => {
      const order = {
        id: orderDoc.id,
        ...orderDoc.data()
      };

      if (isAccessoriesOrder(order)) {
        orders.push(order);
      }
    });

    orders.sort((a, b) => {
      const numberA = Number(
        String(a.orderId || "").match(/\d+$/)?.[0] || 0
      );

      const numberB = Number(
        String(b.orderId || "").match(/\d+$/)?.[0] || 0
      );

      return numberB - numberA;
    });

    if (!orders.length) {
      container.innerHTML = `
        <div class="booked-empty-state">
          No Accessories bookings found.
        </div>
      `;
      return;
    }

    // Private customer details are loaded separately.
    const customersSnapshot = await getDocs(
      collection(db, CUSTOMERS_COLLECTION)
    );

    const customerMap = new Map();

    customersSnapshot.forEach(customerDoc => {
      customerMap.set(customerDoc.id, customerDoc.data());
    });

    let html = `
      <div class="booked-order-count">
        Total Accessories bookings: ${orders.length}
      </div>
    `;

    orders.forEach(order => {
      const orderId = String(order.orderId || "");
      const customer = customerMap.get(orderId);

      const details = parseAccessoriesCustomerDetails(
        customer?.customerDetails || ""
      );

      const isHidden = order.hidden === true;

      const status = ORDER_STATUSES.includes(order.status)
        ? order.status
        : "Pending";

      const productsText = accessoriesProductsToText(order.products);

      const statusOptions = ORDER_STATUSES.map(option => `
        <option
          value="${escapeHTML(option)}"
          ${option === status ? "selected" : ""}
        >
          ${escapeHTML(option)}
        </option>
      `).join("");

      html += `
        <article class="booked-order-card">

          <div class="booked-order-top">
            <div>
              <div class="booked-order-id">
                ${escapeHTML(orderId || "No Order ID")}
              </div>

              <div class="booked-order-design">
                Accessories Order
              </div>
            </div>

            <div class="booked-visibility-label">
              ${isHidden ? "Hidden from public" : "Visible publicly"}
            </div>
          </div>

          <div class="booked-order-details">

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Booking Date</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.bookedDate) || "—")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Shipping Date</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.shippingDate) || "—")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Products</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(productsText || "—").replace(/\n/g, "<br>")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Dispatched Date</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.dispatchedDate) || "—")}
              </div>
            </div>

          </div>

          <h4 class="booked-form-heading">
  Delivery Details
</h4>

${
  customer
    ? `
      <div class="accessory-delivery-details">
        <p><strong>Name:</strong> ${escapeHTML(details.name || "—")}</p>
        <p><strong>Address:</strong> ${escapeHTML(details.address || "—")}</p>
        <p><strong>Post Office:</strong> ${escapeHTML(details.postOfficeName || "—")}</p>
        <p><strong>Pincode:</strong> ${escapeHTML(details.pincode || "—")}</p>
        <p><strong>Phone:</strong> ${escapeHTML(details.phone || "—")}</p>
      </div>
    `
    : `
      <p class="booked-save-message error">
        Customer details document not found.
      </p>
    `
}

<div class="booked-order-actions">
  <button
    type="button"
    onclick="editAccessoriesDeliveryDetails('${escapeHTML(orderId)}')"
    ${customer ? "" : "disabled"}
  >
    Edit Delivery Details
  </button>
</div>
          <div class="booked-status-row">

            <label for="bo-status-${escapeHTML(order.id)}">
              Update Order Progress
            </label>

            <select
              class="booked-status-select"
              id="bo-status-${escapeHTML(order.id)}"
            >
              ${statusOptions}
            </select>

            <button
              type="button"
              class="booked-status-update"
              onclick="updateBookedOrderStatus('${escapeHTML(order.id)}')"
            >
              Update Progress
            </button>

          </div>

          <div class="booked-order-actions">

            <button
              type="button"
              onclick="toggleBookedOrderVisibility('${escapeHTML(order.id)}')"
            >
              ${isHidden ? "Show Publicly" : "Hide from Public"}
            </button>

            <button
              type="button"
              class="booked-delete-btn"
              onclick="deleteBookedOrder('${escapeHTML(order.id)}')"
            >
              Delete
            </button>

          </div>

        </article>
      `;
    });

    container.innerHTML = html;

  } catch (error) {
    console.error("Error loading Accessories bookings:", error);

    container.innerHTML = `
      <div class="booked-error-state">
        Could not load Accessories bookings.<br>
        Check Firebase permissions and refresh.
      </div>
    `;
  }
};
function getFormValues() {
  return {
    orderId: byId("bo-orderId")?.value.trim() || "",
    bookedDate: isoToDisplayDate(
      byId("bo-bookedDate")?.value || ""
    ),
    design: byId("bo-design")?.value.trim() || "",
    products: [],
    shippingDate: isoToDisplayDate(
      byId("bo-shippingDate")?.value || ""
    ),
    status: byId("bo-status")?.value || "Pending",
    dispatchedDate: isoToDisplayDate(
      byId("bo-dispatchedDate")?.value || ""
    )
  };
}

function validateForm(data, isEditing) {
  if (isEditing && !data.orderId) {
    setMessage("The existing Order ID is missing.", "error");
    return false;
  }

  if (!data.bookedDate) {
    setMessage("Please select the booking date.", "error");
    return false;
  }

  if (!data.design) {
    setMessage("Please enter the design.", "error");
    return false;
  }
if (!Array.isArray(data.products) || data.products.length === 0) {
  setMessage("Please add at least one product.", "error");
  return false;
}

  if (!data.shippingDate) {
    setMessage("Please select the expected shipping date.", "error");
    return false;
  }

  if (!ORDER_STATUSES.includes(data.status)) {
    setMessage("Please select a valid order status.", "error");
    return false;
  }

  if (data.status === "Dispatched" && !data.dispatchedDate) {
    data.dispatchedDate = isoToDisplayDate(todayISO());
  }

  return true;
}

function getOrderNumber(orderId) {
  const match = String(orderId || "").match(/^DS-D(\d+)$/);
  return match ? Number(match[1]) : 0;
}

// ======================================================
// SAFE SEQUENTIAL ORDER ID + ORDER CREATION
// ======================================================

// The sequence counter and the new order are saved in the
// SAME transaction. Cancelling the form does not consume an ID.

async function findHighestExistingOrderNumber() {
  const snapshot = await getDocs(
    collection(db, ORDERS_COLLECTION)
  );

  let highest = FIRST_ORDER_NUMBER;

  snapshot.forEach(orderDoc => {
    highest = Math.max(
      highest,
      getOrderNumber(orderDoc.data().orderId)
    );
  });

  return highest;
}

async function createBookedOrder(data) {
  // Used only if the counter document has not been created yet.
  const highestExisting = await findHighestExistingOrderNumber();

  // Generate a Firestore document reference before the transaction.
  const newOrderRef = doc(collection(db, ORDERS_COLLECTION));

  return await runTransaction(db, async transaction => {
    const counterSnapshot = await transaction.get(COUNTER_REF);

    const previousNumber = counterSnapshot.exists()
      ? Math.max(
          FIRST_ORDER_NUMBER,
          Number(counterSnapshot.data().lastNumber) ||
            FIRST_ORDER_NUMBER
        )
      : highestExisting;

    const nextNumber = Math.max(
      previousNumber,
      highestExisting,
      FIRST_ORDER_NUMBER
    ) + 1;

    const orderId = `${ORDER_PREFIX}${nextNumber}`;

    transaction.set(COUNTER_REF, {
      lastNumber: nextNumber,
      updatedAt: serverTimestamp()
    });

    transaction.set(newOrderRef, {
orderId,
bookedDate: data.bookedDate,
design: data.design,
products: data.products.map(item => ({
name: item.name,
quantity: item.quantity
})),
shippingDate: data.shippingDate,
status: data.status,
dispatchedDate: data.dispatchedDate,
hidden: false
});

    return { orderId, documentId: newOrderRef.id };
  });
}

// ======================================================
// RESET FORM
// ======================================================

window.resetBookedOrderForm = function () {
  const form = byId("bookedOrderForm");

  if (form) {
    form.querySelectorAll("input, textarea").forEach(input => {
      if (input.id === "bo-orderId") return;
      input.value = "";
    });
  }

  const orderIdInput = byId("bo-orderId");

  if (orderIdInput) {
    orderIdInput.value = "";
    orderIdInput.placeholder = "Generated automatically when saved";
    orderIdInput.readOnly = true;
  }

  if (byId("bo-status")) {
    byId("bo-status").value = "Pending";
  }

  if (byId("bo-bookedDate")) {
    byId("bo-bookedDate").value = todayISO();
  }

  if (byId("bo-saveBtn")) {
    byId("bo-saveBtn").textContent = "Book Order & Copy Message";
    byId("bo-saveBtn").disabled = false;
  }

  
const productsList = byId("bo-productsList");

if (productsList) {
  productsList.innerHTML = "";
  addBookedProductRow();
}

setSaving(false);
setMessage("");
setEditModeBar("", false);
};

// ======================================================
// OPEN ADD FORM
// ======================================================

window.toggleBookedOrderForm = function () {
  const wrap = byId("add-bookedOrders");
  const list = byId("bookedOrdersList");

  if (!wrap || !list) return;

  if (wrap.style.display === "block") {
    window.cancelBookedOrderForm();
    return;
  }

  adminState.editingId = null;
  adminState.editingType = null;

  window.resetBookedOrderForm();

  wrap.style.display = "block";
  list.style.display = "none";

  setAddButtonEditing(true);

  setMessage(
    "The next Order ID will be generated automatically when you save.",
    "success"
  );
};

// ======================================================
// CANCEL FORM
// ======================================================

window.cancelBookedOrderForm = function () {
  const wrap = byId("add-bookedOrders");
  const list = byId("bookedOrdersList");

  if (wrap) wrap.style.display = "none";
  if (list) list.style.display = "block";

  setAddButtonEditing(false);

  adminState.editingId = null;
  adminState.editingType = null;

  window.resetBookedOrderForm();
};

// ======================================================
// SAVE / UPDATE ORDER
// ======================================================

window.saveBookedOrder = async function () {
  const button = byId("bo-saveBtn");
  if (!button || button.disabled) return;

  const isEditing =
    adminState.editingType === "bookedOrders" &&
    Boolean(adminState.editingId);

  
let data;

try {
  data = getFormValues();
  data.products = getBookedProducts();
} catch (error) {
  setMessage(
    error.message || "Please add at least one product.",
    "error"
  );
  return;
}

if (!validateForm(data, isEditing)) return;

setSaving(true);
setMessage("");
  try {
    if (isEditing) {
      const orderRef = doc(
        db,
        ORDERS_COLLECTION,
        adminState.editingId
      );

      const existing = await getDoc(orderRef);

      if (!existing.exists()) {
        throw new Error("This order no longer exists.");
      }
await updateDoc(orderRef, {
bookedDate: data.bookedDate,
design: data.design,
products: data.products.map(item => ({
name: item.name,
quantity: item.quantity
})),
shippingDate: data.shippingDate,
status: data.status,
dispatchedDate: data.dispatchedDate
});


      setSaving(false);
      window.cancelBookedOrderForm();
      await window.loadBookedOrders();

      alert("Order updated successfully.");
      return;
    }

    // Create the order and allocate its ID atomically.
    const created = await createBookedOrder(data);
    const orderId = created.orderId;

    const confirmation =
      `Your order has been booked successfully! ✅\n\n` +
      `Order ID: ${orderId}\n\n` +
      `Track your order progress here:\n${ORDER_PROGRESS_URL}\n\n` +
      `Thank you for choosing Diecast.scape!`;

    setSaving(false);
    window.cancelBookedOrderForm();
    await window.loadBookedOrders();

    try {
      await navigator.clipboard.writeText(confirmation);

      alert(
        `Order ${orderId} saved successfully.\n\n` +
        `The booking confirmation has been copied to your clipboard.`
      );
    } catch (clipboardError) {
      console.warn("Clipboard copy failed:", clipboardError);

      // Saving already succeeded, so clipboard failure must not
      // be shown as an order-save failure.
      window.prompt(
        `Order ${orderId} was saved successfully. Copy this confirmation:`,
        confirmation
      );
    }
  } catch (error) {
    console.error("Error saving booked order:", error);

    setSaving(false);

    setMessage(
      error.message ||
        "Could not save the order. Check Firebase permissions and try again.",
      "error"
    );
  }
};

// ======================================================
// LOAD BOOKED ORDERS
// ======================================================

window.loadBookedOrders = async function () {
  const container = byId("bookedOrdersList");
  if (!container) return;

  container.innerHTML = `
    <div class="booked-loading-state">
      Loading booked orders...
    </div>
  `;

  try {
    const snapshot = await getDocs(
      collection(db, ORDERS_COLLECTION)
    );

    const orders = [];

    snapshot.forEach(orderDoc => {
  const order = {
    id: orderDoc.id,
    ...orderDoc.data()
  };

  if (!isAccessoriesOrder(order)) {
    orders.push(order);
  }
});

    orders.sort((a, b) => {
      return getOrderNumber(b.orderId) - getOrderNumber(a.orderId);
    });

    if (!orders.length) {
  container.innerHTML = `
    <div class="booked-empty-state">
      No Diorama bookings yet.<br>
      Click <strong>+ Add</strong> to create your first order.
    </div>
  `;

  await window.loadAccessoriesBookedOrders();
  return;
}

    const hiddenCount = orders.filter(order => order.hidden === true).length;

    let html = `
      <div class="booked-order-count">
        Total booked orders: ${orders.length}
        ${hiddenCount ? ` · Hidden from public: ${hiddenCount}` : ""}
      </div>
    `;

    orders.forEach(order => {
      const status = ORDER_STATUSES.includes(order.status)
        ? order.status
        : "Pending";

      const productText = productsToText(order.products);
      const isHidden = order.hidden === true;

      const statusOptions = ORDER_STATUSES.map(option => `
        <option
          value="${escapeHTML(option)}"
          ${option === status ? "selected" : ""}
        >
          ${escapeHTML(option)}
        </option>
      `).join("");

      html += `
        <article class="booked-order-card">

          <div class="booked-order-top">
            <div>
              <div class="booked-order-id">
                ${escapeHTML(order.orderId || "No Order ID")}
              </div>

              <div class="booked-order-design">
                ${escapeHTML(order.design || "No design")}
              </div>
            </div>

            <div class="booked-visibility-label">
              ${isHidden ? "Hidden from public" : "Visible publicly"}
            </div>
          </div>

          <div class="booked-order-details">

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Booking Date</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.bookedDate) || "—")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Shipping Date</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.shippingDate) || "—")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Products / Details</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(productText || "—").replace(/\n/g, "<br>")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">Dispatched Date</span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.dispatchedDate) || "—")}
              </div>
            </div>

          </div>

          <div class="booked-status-row">
            <label for="bo-status-${escapeHTML(order.id)}">
              Update Order Progress
            </label>

            <select
              class="booked-status-select"
              id="bo-status-${escapeHTML(order.id)}"
            >
              ${statusOptions}
            </select>

            <button
              type="button"
              class="booked-status-update"
              onclick="updateBookedOrderStatus('${escapeHTML(order.id)}')"
            >
              Update Progress
            </button>
          </div>

          <div class="booked-order-actions">
            <button
              type="button"
              onclick="editBookedOrder('${escapeHTML(order.id)}')"
            >
              Edit
            </button>

            <button
              type="button"
              onclick="toggleBookedOrderVisibility('${escapeHTML(order.id)}')"
            >
              ${isHidden ? "Show Publicly" : "Hide from Public"}
            </button>

            <button
              type="button"
              class="booked-delete-btn"
              onclick="deleteBookedOrder('${escapeHTML(order.id)}')"
            >
              Delete
            </button>
          </div>

        </article>
      `;
    });

    container.innerHTML = html;
    await window.loadAccessoriesBookedOrders();
  } catch (error) {
    console.error("Error loading booked orders:", error);

    container.innerHTML = `
      <div class="booked-error-state">
        Could not load booked orders.<br>
        Check Firebase permissions and refresh.
      </div>
    `;
  }
};

// ======================================================
// REFRESH
// ======================================================

window.refreshBookedOrders = async function () {
  await window.loadBookedOrders();
};

// ======================================================
// EDIT EXISTING ORDER
// ======================================================

window.editBookedOrder = async function (id) {
  try {
    const snapshot = await getDoc(
      doc(db, ORDERS_COLLECTION, id)
    );

    if (!snapshot.exists()) {
      alert("This order could not be found.");
      return;
    }

    const data = snapshot.data();

    adminState.editingId = id;
    adminState.editingType = "bookedOrders";

    const wrap = byId("add-bookedOrders");
    const list = byId("bookedOrdersList");

    if (wrap) wrap.style.display = "block";
    if (list) list.style.display = "none";

    setAddButtonEditing(true);

    const orderIdInput = byId("bo-orderId");
    if (orderIdInput) {
      orderIdInput.value = data.orderId || "";
      orderIdInput.readOnly = true;
    }

    if (byId("bo-bookedDate")) {
      byId("bo-bookedDate").value =
        storedDateToISO(data.bookedDate);
    }

    if (byId("bo-design")) {
      byId("bo-design").value = data.design || "";
    }

renderBookedProducts(data.products);

    if (byId("bo-shippingDate")) {
      byId("bo-shippingDate").value =
        storedDateToISO(data.shippingDate);
    }

    if (byId("bo-status")) {
      byId("bo-status").value =
        ORDER_STATUSES.includes(data.status)
          ? data.status
          : "Pending";
    }

    if (byId("bo-dispatchedDate")) {
      byId("bo-dispatchedDate").value =
        storedDateToISO(data.dispatchedDate);
    }

    setEditModeBar(
      `Editing Order ${data.orderId || ""} — Order ID cannot be changed`,
      true
    );

    const saveButton = byId("bo-saveBtn");
    if (saveButton) {
      saveButton.textContent = "Update Order";
      saveButton.disabled = false;
    }

    setMessage("");
  } catch (error) {
    console.error("Error editing booked order:", error);
    alert("Could not open this order for editing.");
  }
};

// ======================================================
// UPDATE ORDER PROGRESS
// ======================================================

window.updateBookedOrderStatus = async function (id) {
  const select = byId(`bo-status-${id}`);
  if (!select) return;

  const status = select.value;

  if (!ORDER_STATUSES.includes(status)) {
    alert("Please select a valid order status.");
    return;
  }

  try {
    const orderRef = doc(db, ORDERS_COLLECTION, id);
    const snapshot = await getDoc(orderRef);

    if (!snapshot.exists()) {
      alert("This order no longer exists.");
      await window.loadBookedOrders();
      return;
    }

    const existing = snapshot.data();

    let dispatchedDate = existing.dispatchedDate || "";

    if (status === "Dispatched" && !dispatchedDate) {
      dispatchedDate = isoToDisplayDate(todayISO());
    }

    await updateDoc(orderRef, {
  status,
  dispatchedDate
});

    await window.loadBookedOrders();
    alert("Order progress updated successfully.");
  } catch (error) {
    console.error("Error updating order progress:", error);
    alert("Could not update order progress. Check Firebase permissions.");
  }
};

// ======================================================
// HIDE / SHOW ORDER ON PUBLIC SCHEDULE
// ======================================================

window.toggleBookedOrderVisibility = async function (id) {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, id);
    const snapshot = await getDoc(orderRef);

    if (!snapshot.exists()) {
      alert("This order no longer exists.");
      await window.loadBookedOrders();
      return;
    }

    const currentlyHidden = snapshot.data().hidden === true;
    const newHiddenValue = !currentlyHidden;

    await updateDoc(orderRef, {
  hidden: newHiddenValue
});

    await window.loadBookedOrders();

    alert(
      newHiddenValue
        ? "Order hidden from the public schedule."
        : "Order is visible on the public schedule again."
    );
  } catch (error) {
    console.error("Error changing order visibility:", error);
    alert("Could not change visibility. Check Firebase permissions.");
  }
};

// ======================================================
// DELETE ORDER
// ======================================================

window.deleteBookedOrder = async function (id) {
  const confirmed = confirm(
    "Permanently delete this booked order?\n\n" +
    "This action cannot be undone."
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, ORDERS_COLLECTION, id));
    await window.loadBookedOrders();
  } catch (error) {
    console.error("Error deleting booked order:", error);
    alert("Could not delete this order. Check Firebase permissions.");
  }
};

// ======================================================
// INITIAL STATE
// ======================================================

window.addEventListener("DOMContentLoaded", () => {
  const wrap = byId("add-bookedOrders");
  if (wrap) wrap.style.display = "none";

  window.resetBookedOrderForm();

  // Load automatically if the list exists on the current page.
  if (byId("bookedOrdersList")) {
    window.loadBookedOrders();
  }
});
