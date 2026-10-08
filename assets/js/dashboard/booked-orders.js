import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from "../firebase-init.js";


// ==================================================
// CONFIG
// ==================================================

const BOOKED_ORDERS_COLLECTION = "bookedOrders";

let bookedOrders = [];
let editingBookedOrderId = null;


// ==================================================
// LOAD ORDERS
// ==================================================

async function loadBookedOrders() {

  const list = document.getElementById("bookedOrdersList");

  if (!list) return;

  list.innerHTML = `
    <div class="product-list-loading">
      Loading booked orders...
    </div>
  `;

  try {

    const snapshot = await getDocs(
      collection(db, BOOKED_ORDERS_COLLECTION)
    );

    bookedOrders = [];

    snapshot.forEach((docSnap) => {

      const data = docSnap.data();

      bookedOrders.push({
        firestoreId: docSnap.id,
        orderId: data.orderId || docSnap.id,
        bookedDate: data.bookedDate || "",
        design: data.design || "",
        products: Array.isArray(data.products)
          ? data.products
          : String(data.products || "")
              .split("\n")
              .map(item => item.trim())
              .filter(Boolean),
        shippingDate: data.shippingDate || "",
        status: data.status || "Pending",
        dispatchedDate: data.dispatchedDate || ""
      });

    });


    // Oldest → newest

    bookedOrders.sort((a, b) => {

      return parseDate(a.bookedDate) -
             parseDate(b.bookedDate);

    });


    renderBookedOrders();

  } catch (error) {

    console.error(
      "Error loading booked orders:",
      error
    );

    list.innerHTML = `
      <div class="center-msg">
        Unable to load booked orders.
      </div>
    `;

  }

}


// ==================================================
// DATE PARSER
// DD/MM/YYYY
// ==================================================

function parseDate(value) {

  if (!value) return 0;

  const parts = String(value).split("/");

  if (parts.length !== 3) {
    return 0;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const year = Number(parts[2]);

  return new Date(
    year,
    month,
    day
  ).getTime();

}


// ==================================================
// RENDER
// ==================================================

function renderBookedOrders() {

  const list =
    document.getElementById("bookedOrdersList");

  if (!list) return;


  if (!bookedOrders.length) {

    list.innerHTML = `
      <div class="center-msg">
        No booked orders found.
      </div>
    `;

    return;

  }


  list.innerHTML = bookedOrders.map(order => {

    const productsHTML =
      order.products.length

        ? order.products.map(product => `
            <div
              style="
                padding:7px 0;
                border-bottom:1px solid var(--border);
              "
            >
              ${escapeHTML(product)}
            </div>
          `).join("")

        : `<span style="color:var(--text-muted);">
             No products added
           </span>`;


    return `

      <div
        class="admin-product"
        style="margin-bottom:12px;"
      >

        <!-- HEADER -->

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:10px;
          "
        >

          <div>

            <div class="admin-title">
              ${escapeHTML(order.orderId)}
            </div>

            <div
              style="
                font-size:12px;
                color:var(--text-secondary);
                margin-top:3px;
              "
            >
              Booked: ${escapeHTML(order.bookedDate)}
            </div>

          </div>


          <strong>
            ${escapeHTML(order.status)}
          </strong>

        </div>


        <!-- DETAILS -->

        <div
          style="
            margin-top:12px;
            display:grid;
            gap:8px;
          "
        >

          <div>
            <strong>Design:</strong>
            ${escapeHTML(order.design)}
          </div>


          <div>

            <strong>Products / Cars:</strong>

            <div
              style="
                margin-top:5px;
                padding:8px;
                background:var(--surface-soft);
                border:1px solid var(--border);
                border-radius:8px;
              "
            >

              ${productsHTML}

            </div>

          </div>


          <div>

            <strong>
              Estimated Shipping:
            </strong>

            ${escapeHTML(order.shippingDate)}

          </div>


          ${
            order.dispatchedDate

              ? `
                <div>
                  <strong>
                    Dispatched:
                  </strong>

                  ${escapeHTML(
                    order.dispatchedDate
                  )}
                </div>
              `

              : ""
          }

        </div>


        <!-- ACTIONS -->

        <div
          class="admin-actions"
          style="
            display:flex;
            gap:8px;
            margin-top:12px;
          "
        >

          <button
            type="button"
            onclick="editBookedOrder('${escapeAttribute(order.firestoreId)}')"
          >
            Edit / Progress
          </button>


          <button
            type="button"
            onclick="deleteBookedOrder('${escapeAttribute(order.firestoreId)}')"
          >
            Delete
          </button>

        </div>

      </div>

    `;

  }).join("");

}


// ==================================================
// ADD / EDIT FORM
// ==================================================

window.toggleBookedOrderForm = function () {

  const wrap =
    document.getElementById("add-bookedOrders");

  if (!wrap) return;

  const isHidden =
    getComputedStyle(wrap).display === "none";

  wrap.style.display =
    isHidden ? "block" : "none";

};


// ==================================================
// SAVE
// ==================================================

window.saveBookedOrder = async function () {

  const saveMsg =
    document.getElementById("bo-saveMsg");

  const loader =
    document.getElementById("bo-saveLoader");

  const orderId =
    document.getElementById("bo-orderId")
      .value.trim();

  const bookedDate =
    document.getElementById("bo-bookedDate")
      .value.trim();

  const design =
    document.getElementById("bo-design")
      .value.trim();

  const productsText =
    document.getElementById("bo-products")
      .value.trim();

  const shippingDate =
    document.getElementById("bo-shippingDate")
      .value.trim();

  const status =
    document.getElementById("bo-status")
      .value;

  const dispatchedDate =
    document.getElementById("bo-dispatchedDate")
      .value.trim();


  if (!orderId) {

    saveMsg.textContent =
      "Please enter Order ID.";

    return;

  }


  if (!bookedDate) {

    saveMsg.textContent =
      "Please enter booked date.";

    return;

  }


  if (!shippingDate) {

    saveMsg.textContent =
      "Please enter estimated shipping date.";

    return;

  }


  const products =
    productsText
      .split("\n")
      .map(item => item.trim())
      .filter(Boolean);


  loader.classList.add("show");

  saveMsg.textContent = "";


  try {

    /*
      If editing:
      keep the same Firestore document.

      If adding:
      Order ID becomes the document ID.
    */

    const firestoreId =
      editingBookedOrderId || orderId;


    await setDoc(
      doc(
        db,
        BOOKED_ORDERS_COLLECTION,
        firestoreId
      ),
      {

        orderId,

        bookedDate,

        design,

        products,

        shippingDate,

        status,

        dispatchedDate

      },
      {
        merge: true
      }
    );


    saveMsg.textContent =
      editingBookedOrderId
        ? "Order updated successfully."
        : "Booked order added successfully.";


    clearBookedOrderForm();


    editingBookedOrderId = null;


    document.getElementById(
      "bookedOrdersEditModeBar"
    ).style.display = "none";


    await loadBookedOrders();


    setTimeout(() => {

      document.getElementById(
        "add-bookedOrders"
      ).style.display = "none";

    }, 500);


  } catch (error) {

    console.error(
      "Error saving booked order:",
      error
    );

    saveMsg.textContent =
      "Unable to save booked order.";

  } finally {

    loader.classList.remove("show");

  }

};


// ==================================================
// EDIT / UPDATE PROGRESS
// ==================================================

window.editBookedOrder = function (
  firestoreId
) {

  const order =
    bookedOrders.find(
      item => item.firestoreId === firestoreId
    );

  if (!order) return;


  editingBookedOrderId =
    firestoreId;


  document.getElementById(
    "bo-orderId"
  ).value = order.orderId;


  document.getElementById(
    "bo-bookedDate"
  ).value = order.bookedDate;


  document.getElementById(
    "bo-design"
  ).value = order.design;


  document.getElementById(
    "bo-products"
  ).value =
    order.products.join("\n");


  document.getElementById(
    "bo-shippingDate"
  ).value = order.shippingDate;


  document.getElementById(
    "bo-status"
  ).value = order.status;


  document.getElementById(
    "bo-dispatchedDate"
  ).value =
    order.dispatchedDate;


  document.getElementById(
    "bookedOrdersEditModeBar"
  ).style.display = "block";


  document.getElementById(
    "add-bookedOrders"
  ).style.display = "block";


  document.getElementById(
    "add-bookedOrders"
  ).scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

};


// ==================================================
// DELETE
// ==================================================

window.deleteBookedOrder = async function (
  firestoreId
) {

  const order =
    bookedOrders.find(
      item => item.firestoreId === firestoreId
    );

  if (!order) return;


  const confirmed =
    confirm(
      `Delete booked order ${order.orderId}?`
    );


  if (!confirmed) return;


  try {

    await deleteDoc(
      doc(
        db,
        BOOKED_ORDERS_COLLECTION,
        firestoreId
      )
    );


    await loadBookedOrders();

  } catch (error) {

    console.error(
      "Error deleting booked order:",
      error
    );

    alert(
      "Unable to delete booked order."
    );

  }

};


// ==================================================
// CANCEL
// ==================================================

window.cancelBookedOrderEdit = function () {

  editingBookedOrderId = null;

  clearBookedOrderForm();


  const editBar =
    document.getElementById(
      "bookedOrdersEditModeBar"
    );

  if (editBar) {
    editBar.style.display = "none";
  }


  const form =
    document.getElementById(
      "add-bookedOrders"
    );

  if (form) {
    form.style.display = "none";
  }

};


// ==================================================
// CLEAR FORM
// ==================================================

function clearBookedOrderForm() {

  document.getElementById(
    "bo-orderId"
  ).value = "";

  document.getElementById(
    "bo-bookedDate"
  ).value = "";

  document.getElementById(
    "bo-design"
  ).value = "";

  document.getElementById(
    "bo-products"
  ).value = "";

  document.getElementById(
    "bo-shippingDate"
  ).value = "";

  document.getElementById(
    "bo-status"
  ).value = "Pending";

  document.getElementById(
    "bo-dispatchedDate"
  ).value = "";

  document.getElementById(
    "bo-saveMsg"
  ).textContent = "";

}


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHTML(value) {

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");

}


// ==================================================
// INITIAL LOAD
// ==================================================

loadBookedOrders();
