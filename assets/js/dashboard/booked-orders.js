import { db } from "../firebase-init.js";

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  adminState
} from "/assets/js/dashboard/dashboard.js";


// ======================================================
// SETTINGS
// ======================================================

const ORDERS_COLLECTION = "bookedOrders";

const COUNTER_REF = doc(
  db,
  "bookedOrderCounters",
  "orderIdSequence"
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


// Change this if your public progress page has another URL.
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

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function isoToDisplayDate(value) {
  if (!value) return "";

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return String(value);
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function displayToISODate(value) {
  if (!value) return "";

  const parts = String(value).split("/");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}


function storedDateToISO(value) {
  if (!value) return "";

  const text = String(value).trim();

  // Already YYYY-MM-DD.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // Existing stored format: DD/MM/YYYY.
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

  if (type) {
    element.classList.add(type);
  }
}


function setSaving(isSaving) {
  const button = byId("bo-saveBtn");
  const loader = byId("bo-saveLoader");

  if (button) {
    button.disabled = isSaving;
  }

  if (loader) {
    loader.classList.toggle("show", isSaving);
  }
}


function getFormValues() {
  const orderId = byId("bo-orderId").value.trim();

  const bookedDate = byId("bo-bookedDate").value;

  const design = byId("bo-design").value.trim();

  const products = byId("bo-products").value.trim();

  const shippingDate = byId("bo-shippingDate").value;

  const status = byId("bo-status").value;

  const dispatchedDate = byId("bo-dispatchedDate").value;

  return {
    orderId,
    bookedDate: isoToDisplayDate(bookedDate),
    design,
    products,
    shippingDate: isoToDisplayDate(shippingDate),
    status,
    dispatchedDate: isoToDisplayDate(dispatchedDate)
  };
}


function validateForm(data) {
  if (!data.orderId) {
    setMessage("The Order ID is not ready. Please try again.", "error");
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

  if (
    data.status === "Dispatched" &&
    !data.dispatchedDate
  ) {
    data.dispatchedDate = isoToDisplayDate(todayISO());
  }

  return true;
}


// ======================================================
// GENERATE THE NEXT SEQUENTIAL ORDER ID
// ======================================================

// Finds the highest existing order ID when the counter
// document has not yet been created.

async function findHighestExistingOrderNumber() {
  const snapshot = await getDocs(
    collection(db, ORDERS_COLLECTION)
  );

  let highest = FIRST_ORDER_NUMBER;

  snapshot.forEach(orderDoc => {
    const data = orderDoc.data();

    const match = String(data.orderId || "").match(
      /^DS-D(\d+)$/
    );

    if (match) {
      highest = Math.max(
        highest,
        Number(match[1])
      );
    }
  });

  return highest;
}


async function generateNextOrderId() {
  const highestExisting =
    await findHighestExistingOrderNumber();

  const nextNumber = await runTransaction(
    db,
    async transaction => {
      const counterSnapshot = await transaction.get(
        COUNTER_REF
      );

      const previousNumber = counterSnapshot.exists()
        ? Number(counterSnapshot.data().lastNumber) || FIRST_ORDER_NUMBER
        : highestExisting;

      const next = Math.max(
        FIRST_ORDER_NUMBER,
        previousNumber,
        highestExisting
      ) + 1;

      transaction.set(
        COUNTER_REF,
        {
          lastNumber: next,
          updatedAt: serverTimestamp()
        }
      );

      return next;
    }
  );

  return `${ORDER_PREFIX}${nextNumber}`;
}


// ======================================================
// RESET FORM
// ======================================================

window.resetBookedOrderForm = function () {
  const form = byId("bookedOrderForm");

  if (!form) return;

  form.querySelectorAll("input, textarea").forEach(input => {
    if (input.id === "bo-orderId") return;

    input.value = "";
  });

  if (byId("bo-status")) {
    byId("bo-status").value = "Pending";
  }

  if (byId("bo-bookedDate")) {
    byId("bo-bookedDate").value = todayISO();
  }

  if (byId("bo-saveBtn")) {
    byId("bo-saveBtn").textContent =
      "Book Order & Copy Message";

    byId("bo-saveBtn").disabled = false;
  }

  setSaving(false);
  setMessage("");

  const bar = byId("bookedOrderEditModeBar");

  if (bar) {
    bar.style.display = "none";
  }
};


// ======================================================
// OPEN ADD FORM
// ======================================================

window.toggleBookedOrderForm = async function () {
  const wrap = byId("add-bookedOrders");
  const list = byId("bookedOrdersList");
  const button = byId("bookedOrdersAddBtn");

  if (!wrap || !list) return;

  const isOpening = wrap.style.display !== "block";

  if (!isOpening) {
    window.cancelBookedOrderForm();
    return;
  }

  adminState.editingId = null;
  adminState.editingType = null;

  window.resetBookedOrderForm();

  wrap.style.display = "block";
  list.style.display = "none";

  if (button) {
    button.textContent = "Cancel";
    button.classList.add("cancel-btn");
  }

  const orderIdInput = byId("bo-orderId");

  if (orderIdInput) {
    orderIdInput.value = "Generating...";
  }

  setMessage("Generating a new Order ID...");

  try {
    const newOrderId = await generateNextOrderId();

    // Do not replace the ID if the form was closed while waiting.
    if (wrap.style.display !== "block") return;

    if (
      adminState.editingType === "bookedOrders" &&
      adminState.editingId
    ) {
      return;
    }

    if (orderIdInput) {
      orderIdInput.value = newOrderId;
    }

    setMessage("New Order ID generated.", "success");

  } catch (error) {
    console.error("Error generating Order ID:", error);

    setMessage(
      "Could not generate an Order ID. Check Firebase permissions and try again.",
      "error"
    );

    if (orderIdInput) {
      orderIdInput.value = "";
    }
  }

};


// ======================================================
// CANCEL FORM
// ======================================================

window.cancelBookedOrderForm = function () {
  const wrap = byId("add-bookedOrders");
  const list = byId("bookedOrdersList");
  const button = byId("bookedOrdersAddBtn");

  if (wrap) wrap.style.display = "none";

  if (list) list.style.display = "block";

  if (button) {
    button.textContent = "+ Add";
    button.classList.remove("cancel-btn");
  }

  adminState.editingId = null;
  adminState.editingType = null;

  window.resetBookedOrderForm();
};


// ======================================================
// SAVE / UPDATE BOOKED ORDER
// ======================================================

window.saveBookedOrder = async function () {
  const button = byId("bo-saveBtn");

  if (!button || button.disabled) return;

  const data = getFormValues();

  if (!validateForm(data)) return;

  const isEditing =
    adminState.editingType === "bookedOrders" &&
    Boolean(adminState.editingId);

  setSaving(true);
  setMessage("");

  try {
    if (isEditing) {
      // Preserve the original Order ID. It is never read
      // from an editable field during an update.
      const orderRef = doc(
        db,
        ORDERS_COLLECTION,
        adminState.editingId
      );

      const existing = await getDoc(orderRef);

      if (!existing.exists()) {
        throw new Error("This order no longer exists.");
      }

      const originalOrderId =
        existing.data().orderId || data.orderId;

      await updateDoc(orderRef, {
        bookedDate: data.bookedDate,
        design: data.design,
        products: data.products,
        shippingDate: data.shippingDate,
        status: data.status,
        dispatchedDate: data.dispatchedDate,
        updatedAt: serverTimestamp()
      });

      // Keep original ID visible in the form.
      if (byId("bo-orderId")) {
        byId("bo-orderId").value = originalOrderId;
      }

      setMessage("Order updated successfully.", "success");

      setSaving(false);

      window.cancelBookedOrderForm();

      await window.loadBookedOrders();

      return;
    }

    // Add new order. Its ID was reserved when the
    // Add button opened the form.
    const orderId = byId("bo-orderId").value.trim();

    if (!orderId) {
      throw new Error("Order ID is missing. Please cancel and try again.");
    }

    await addDoc(
      collection(db, ORDERS_COLLECTION),
      {
        orderId,
        bookedDate: data.bookedDate,
        design: data.design,
        products: data.products,
        shippingDate: data.shippingDate,
        status: data.status,
        dispatchedDate: data.dispatchedDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }
    );

    const confirmation =
      `Your order has been booked successfully! ✅\n\n` +
      `Order ID: ${orderId}\n\n` +
      `Track your order progress here:\n${ORDER_PROGRESS_URL}\n\n` +
      `Thank you for choosing Diecast.scape!`;

    let copied = false;

    try {
      await navigator.clipboard.writeText(confirmation);
      copied = true;
    } catch (clipboardError) {
      // Clipboard access may be blocked by browser permissions.
      console.warn("Clipboard copy failed:", clipboardError);
    }

    setSaving(false);

    window.cancelBookedOrderForm();

    await window.loadBookedOrders();

    if (copied) {
      alert(
        `Order ${orderId} saved successfully.\n\n` +
        `The booking confirmation has been copied to your clipboard.`
      );
    } else {
      // The order has already been saved. Do not report it
      // as a failed save merely because clipboard access failed.
      window.prompt(
        `Order ${orderId} was saved successfully.\nCopy this confirmation:`,
        confirmation
      );
    }

  } catch (error) {
    console.error("Error saving booked order:", error);

    setSaving(false);

    setMessage(
      error.message || "Could not save the order. Please try again.",
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
      query(
        collection(db, ORDERS_COLLECTION),
        orderBy("createdAt", "desc")
      )
    );

    const orders = [];

    snapshot.forEach(orderDoc => {
      orders.push({
        id: orderDoc.id,
        ...orderDoc.data()
      });
    });

    // Sort by the numeric part of the order ID, descending.
    orders.sort((a, b) => {
      const numberA = Number(
        String(a.orderId || "").replace("DS-D", "")
      ) || 0;

      const numberB = Number(
        String(b.orderId || "").replace("DS-D", "")
      ) || 0;

      return numberB - numberA;
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

    let html = `
      <div class="booked-order-count">
        Total booked orders: ${orders.length}
      </div>
    `;

    orders.forEach(order => {
      const status = ORDER_STATUSES.includes(order.status)
        ? order.status
        : "Pending";

      const productText =
        typeof order.products === "string"
          ? order.products
          : Array.isArray(order.products)
            ? order.products.map(item => {
                if (typeof item === "string") return item;

                return [
                  item.name || item.title || "Product",
                  item.quantity ? `× ${item.quantity}` : ""
                ].filter(Boolean).join(" ");
              }).join("\n")
            : "";

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

          </div>

          <div class="booked-order-details">

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">
                Booking Date
              </span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.bookedDate) || "—")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">
                Shipping Date
              </span>
              <div class="booked-order-detail-value">
                ${escapeHTML(storedDateToDisplay(order.shippingDate) || "—")}
              </div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">
                Products / Details
              </span>
              <div class="booked-order-detail-value">${escapeHTML(productText || "—")}</div>
            </div>

            <div class="booked-order-detail">
              <span class="booked-order-detail-label">
                Dispatched Date
              </span>
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
// REFRESH ORDERS
// ======================================================

window.refreshBookedOrders = async function () {
  const wrap = byId("add-bookedOrders");

  if (wrap && wrap.style.display === "block") {
    window.cancelBookedOrderForm();
  }

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
    const button = byId("bookedOrdersAddBtn");

    if (wrap) wrap.style.display = "block";

    if (list) list.style.display = "none";

    if (button) {
      button.textContent = "Cancel";
      button.classList.add("cancel-btn");
    }

    byId("bo-orderId").value = data.orderId || "";

    byId("bo-bookedDate").value =
      storedDateToISO(data.bookedDate);

    byId("bo-design").value = data.design || "";

    byId("bo-products").value =
      typeof data.products === "string"
        ? data.products
        : Array.isArray(data.products)
          ? data.products.map(item => {
              if (typeof item === "string") return item;

              return [
                item.name || item.title || "Product",
                item.quantity ? `× ${item.quantity}` : ""
              ].filter(Boolean).join(" ");
            }).join("\n")
          : "";

    byId("bo-shippingDate").value =
      storedDateToISO(data.shippingDate);

    byId("bo-status").value =
      ORDER_STATUSES.includes(data.status)
        ? data.status
        : "Pending";

    byId("bo-dispatchedDate").value =
      storedDateToISO(data.dispatchedDate);

    const bar = byId("bookedOrderEditModeBar");

    if (bar) {
      bar.style.display = "block";
      bar.textContent = `Editing Order ${data.orderId || ""}`;
    }

    const saveButton = byId("bo-saveBtn");

    if (saveButton) {
      saveButton.textContent = "Update Order";
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
    const orderRef = doc(
      db,
      ORDERS_COLLECTION,
      id
    );

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
// DELETE ORDER
// ======================================================

window.deleteBookedOrder = async function (id) {
  const confirmed = confirm(
    "Permanently delete this booked order?\n\nThis action cannot be undone."
  );

  if (!confirmed) return;

  try {
    await deleteDoc(
      doc(db, ORDERS_COLLECTION, id)
    );

    await window.loadBookedOrders();

  } catch (error) {
    console.error("Error deleting booked order:", error);

    alert("Could not delete this order. Check Firebase permissions.");
  }
};


// ======================================================
// INITIAL FORM STATE
// ======================================================

window.addEventListener("DOMContentLoaded", () => {
  const wrap = byId("add-bookedOrders");

  if (wrap) {
    wrap.style.display = "none";
  }

  window.resetBookedOrderForm();
});
