
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
  `${window.location.origin}/booked-orders.html`;

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

function getFormValues() {
  return {
    orderId: byId("bo-orderId")?.value.trim() || "",
    bookedDate: isoToDisplayDate(
      byId("bo-bookedDate")?.value || ""
    ),
    design: byId("bo-design")?.value.trim() || "",
    products: byId("bo-products")?.value.trim() || "",
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

  if (!data.products) {
    setMessage("Please enter the products / order details.", "error");
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
      products: data.products,
      shippingDate: data.shippingDate,
      status: data.status,
      dispatchedDate: data.dispatchedDate,
      hidden: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
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

  const data = getFormValues();

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

      // Do not update orderId. It is permanent.
      await updateDoc(orderRef, {
        bookedDate: data.bookedDate,
        design: data.design,
        products: data.products,
        shippingDate: data.shippingDate,
        status: data.status,
        dispatchedDate: data.dispatchedDate,
        updatedAt: serverTimestamp()
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
      orders.push({
        id: orderDoc.id,
        ...orderDoc.data()
      });
    });

    orders.sort((a, b) => {
      return getOrderNumber(b.orderId) - getOrderNumber(a.orderId);
    });

    if (!orders.length) {
      container.innerHTML = `
        <div class="booked-empty-state">
          No booked orders yet.<br>
          Click <strong>+ Add</strong> to create your first order.
        </div>
      `;
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

    if (byId("bo-products")) {
      byId("bo-products").value = productsToText(data.products);
    }

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
      dispatchedDate,
      updatedAt: serverTimestamp()
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
      hidden: newHiddenValue,
      updatedAt: serverTimestamp()
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
