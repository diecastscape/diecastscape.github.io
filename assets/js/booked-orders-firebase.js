
/* =========================================================
   BOOKED ORDERS - SEARCH ONLY FIREBASE LOAD
   Diorama:    DS-D...
   Accessories: DS-A...

   Orders are loaded only after clicking Search
   or pressing Enter.
========================================================= */

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  db
} from "./firebase-init.js";


/* =========================================================
   COLLECTION
========================================================= */

const BOOKED_ORDERS_COLLECTION = "bookedOrders";


/* =========================================================
   ELEMENTS
========================================================= */

const ordersList = document.getElementById("bookedOrdersList");

const loadingState = document.getElementById("bookedOrdersLoading");

const emptyState = document.getElementById("bookedOrdersEmpty");

const errorState = document.getElementById("bookedOrdersError");

const searchInput = document.getElementById("bookedOrderSearch");

const searchBtn = document.getElementById("bookedSearchBtn");


/* =========================================================
   INITIAL PAGE STATE
========================================================= */

let searchInProgress = false;

function hideResults() {
  ordersList.innerHTML = "";
  ordersList.style.display = "none";

  emptyState.style.display = "none";
  loadingState.style.display = "none";
  errorState.style.display = "none";
}

hideResults();


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   DATE PARSER
========================================================= */

function parseDate(dateString) {
  if (!dateString || typeof dateString !== "string") {
    return null;
  }

  const parts = dateString.split("/");

  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  const date = new Date(year, month, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
}


/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {
  if (status === "Pending") {
    return "pending";
  }

  if (status === "Next in Work") {
    return "next";
  }

  if (status === "In Progress") {
    return "progress";
  }

  if (status === "Ready to Dispatch") {
    return "ready";
  }

  if (status === "Dispatched") {
    return "dispatched";
  }

  return "";
}


/* =========================================================
   DISPATCHED 30-DAY RULE
========================================================= */

function shouldShowOrder(order) {
  if (
    order.status !== "Dispatched" ||
    !order.dispatchedDate
  ) {
    return true;
  }

  const dispatchedDate = parseDate(order.dispatchedDate);

  if (!dispatchedDate) {
    return true;
  }

  const today = new Date();

  // Compare calendar dates, not elapsed hours.
  today.setHours(0, 0, 0, 0);
  dispatchedDate.setHours(0, 0, 0, 0);

  const difference =
    today.getTime() - dispatchedDate.getTime();

  const days = difference / (1000 * 60 * 60 * 24);

  return days < 30;
}


/* =========================================================
   FORMAT PRODUCTS
========================================================= */

function formatProducts(products) {
  if (!products) {
    return "";
  }

  // Array of product objects
  if (Array.isArray(products)) {
    return products
      .map((product) => {
        if (typeof product === "string") {
          return product;
        }

        const name =
          product?.name ||
          product?.productName ||
          product?.title ||
          "";

        const quantity = Number(product?.quantity);

        if (!name) {
          return "";
        }

        return Number.isFinite(quantity) && quantity > 0
          ? `${name} × ${quantity}`
          : name;
      })
      .filter(Boolean)
      .join("\n");
  }

  // Plain-text product list
  if (typeof products === "string") {
    return products;
  }

  // Single product object
  if (typeof products === "object") {
    const name =
      products.name ||
      products.productName ||
      products.title ||
      "";

    return name
      ? `${name}${
          products.quantity
            ? ` × ${products.quantity}`
            : ""
        }`
      : "";
  }

  return String(products);
}


/* =========================================================
   CREATE ORDER CARD
========================================================= */

function createBookingCard(order, isLatest) {
  const card = document.createElement("article");

  card.className = "booked-order-card";

  if (isLatest) {
    card.classList.add("latest");
  }

  const latestLabel = isLatest
    ? `
      <span class="booked-latest-label">
        Latest
      </span>
    `
    : "";

  const statusClass = getStatusClass(order.status);

  card.innerHTML = `
    <div class="booked-order-top">

      <div class="booked-order-id">
        #${escapeHTML(order.orderId)}
      </div>

      ${latestLabel}

    </div>

    <div class="booked-order-details">

      <div class="booked-detail">
        <div class="booked-detail-label">
          Booked
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(order.bookedDate)}
        </div>
      </div>

      <div class="booked-detail">
        <div class="booked-detail-label">
          Design
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(order.design)}
        </div>
      </div>

      <div class="booked-detail">
        <div class="booked-detail-label">
          Products
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(formatProducts(order.products))
            .replace(/\n/g, "<br>")}
        </div>
      </div>

      <div class="booked-detail booked-shipping">
        <div class="booked-detail-label">
          Est. Shipping
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(order.shippingDate)}
        </div>
      </div>

      <div class="booked-status-wrap">
        <span class="booked-status ${statusClass}">
          ${escapeHTML(order.status)}
        </span>
      </div>

    </div>
  `;

  return card;
}


/* =========================================================
   SHOW ONE MATCHING ORDER
========================================================= */

function renderBookedOrder(order) {
  ordersList.innerHTML = "";
  ordersList.style.display = "none";
  emptyState.style.display = "none";

  if (!order) {
    emptyState.textContent =
      "No matching order was found. Please check your Order ID and try again.";

    emptyState.style.display = "block";
    return;
  }

  // Do not display hidden or expired orders.
  if (
    order.hidden === true ||
    !shouldShowOrder(order)
  ) {
    emptyState.textContent =
      "This order is not currently available for tracking. Please check your Order ID or contact us for assistance.";

    emptyState.style.display = "block";
    return;
  }

  const card = createBookingCard(order, true);

  ordersList.appendChild(card);
  ordersList.style.display = "";
}


/* =========================================================
   SEARCH AND LOAD FROM FIREBASE
========================================================= */

async function searchBookedOrder() {
  if (searchInProgress) {
    return;
  }

  const searchValue = searchInput.value
    .trim()
    .toUpperCase()
    .replace(/^#/, "");

  // Clear old results before every search.
  hideResults();

  if (!searchValue) {
    emptyState.textContent =
      "Please enter your Order ID to track your order.";

    emptyState.style.display = "block";
    searchInput.focus();
    return;
  }

  // Accept only the two supported order-ID formats.
  const isDioramaOrder = /^DS-D\d+$/i.test(searchValue);
  const isAccessoriesOrder = /^DS-A\d+$/i.test(searchValue);

  if (!isDioramaOrder && !isAccessoriesOrder) {
    emptyState.textContent =
      "Please enter a valid Order ID, such as DS-D1201 or DS-A1001.";

    emptyState.style.display = "block";
    return;
  }

  searchInProgress = true;
  searchBtn.disabled = true;

  loadingState.style.display = "block";

  try {
    const collectionRef = collection(
      db,
      BOOKED_ORDERS_COLLECTION
    );

    const snapshot = await getDocs(collectionRef);

    let matchingOrder = null;

    snapshot.forEach((docSnap) => {
      if (matchingOrder) {
        return;
      }

      const data = docSnap.data();

      const orderId = String(data.orderId || "")
        .trim()
        .toUpperCase()
        .replace(/^#/, "");

      // Exact ID match only. Never show a general list.
      if (orderId !== searchValue) {
        return;
      }

      // Keep diorama and accessory ID types separate.
      if (
        isDioramaOrder &&
        !/^DS-D\d+$/.test(orderId)
      ) {
        return;
      }

      if (
        isAccessoriesOrder &&
        !/^DS-A\d+$/.test(orderId)
      ) {
        return;
      }

      matchingOrder = {
        firestoreId: docSnap.id,
        orderId,
        bookedDate: data.bookedDate || "",
        design: data.design || "",
        products: data.products || "",
        shippingDate: data.shippingDate || "",
        status: data.status || "",
        dispatchedDate: data.dispatchedDate || "",
        hidden: data.hidden === true
      };
    });

    loadingState.style.display = "none";

    renderBookedOrder(matchingOrder);

  } catch (error) {
    console.error("Booked order search error:", error);

    loadingState.style.display = "none";

    errorState.textContent =
      "Unable to search for your order right now. Please try again.";

    errorState.style.display = "block";

  } finally {
    searchInProgress = false;
    searchBtn.disabled = false;
  }
}

/* =========================================================
   SEARCH FORM
========================================================= */

const searchForm = document.getElementById(
  "bookedOrderSearchForm"
);

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    searchBookedOrder();
  });
}


/* =========================================================
   INITIAL PAGE STATE
   No automatic Firestore load.
========================================================= */

hideResults();
