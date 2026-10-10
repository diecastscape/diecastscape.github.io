/* =========================================================
   BOOKED ORDERS - FIREBASE LOAD ONLY
========================================================= */

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/*
  IMPORTANT:

  This assumes your existing firebase-init.js
  initializes Firebase and exports `db`.

  Example:

  export const db = getFirestore(app);
*/


import {
  db
} from "./firebase-init.js";



/* =========================================================
   COLLECTION
========================================================= */

const BOOKED_ORDERS_COLLECTION =
  "bookedOrders";



/* =========================================================
   ELEMENTS
========================================================= */

const ordersList =
  document.getElementById(
    "bookedOrdersList"
  );


const loadingState =
  document.getElementById(
    "bookedOrdersLoading"
  );


const emptyState =
  document.getElementById(
    "bookedOrdersEmpty"
  );


const errorState =
  document.getElementById(
    "bookedOrdersError"
  );


const searchInput =
  document.getElementById(
    "bookedOrderSearch"
  );


const searchBtn =
  document.getElementById(
    "bookedSearchBtn"
  );



/* =========================================================
   GLOBAL DATA
========================================================= */

let bookedOrders = [];



/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}



/* =========================================================
   DATE PARSER
========================================================= */

function parseDate(dateString) {

  if (!dateString) {
    return null;
  }


  if (
    typeof dateString !==
    "string"
  ) {

    return null;

  }


  const parts =
    dateString.split("/");


  if (
    parts.length !== 3
  ) {

    return null;

  }


  const day =
    Number(parts[0]);


  const month =
    Number(parts[1]) - 1;


  const year =
    Number(parts[2]);


  const date =
    new Date(
      year,
      month,
      day
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return null;

  }


  return date;

}



/* =========================================================
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

  if (
    status === "Pending"
  ) {

    return "pending";

  }


  if (
    status === "Next in Work"
  ) {

    return "next";

  }


  if (
    status === "In Progress"
  ) {

    return "progress";

  }


  if (
    status === "Ready to Dispatch"
  ) {

    return "ready";

  }


  if (
    status === "Dispatched"
  ) {

    return "dispatched";

  }


  return "";

}



/* =========================================================
   DISPATCHED 30-DAY RULE
========================================================= */

function shouldShowOrder(order) {

  if (

    order.status !==
      "Dispatched"

    ||

    !order.dispatchedDate

  ) {

    return true;

  }


  const dispatchedDate =
    parseDate(
      order.dispatchedDate
    );


  if (!dispatchedDate) {
    return true;
  }


  const today =
    new Date();


  const difference =
    today.getTime() -
    dispatchedDate.getTime();


  const days =
    difference /
    (
      1000 *
      60 *
      60 *
      24
    );


  return days < 30;

}



/* =========================================================
   CREATE CARD
========================================================= */

function createBookingCard(
  order,
  isLatest
) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "booked-order-card";


  if (isLatest) {

    card.classList.add(
      "latest"
    );

  }


  const latestLabel =
    isLatest

      ? `
        <span class="booked-latest-label">
          Latest
        </span>
      `

      : "";


  const statusClass =
    getStatusClass(
      order.status
    );


  card.innerHTML = `

    <div class="booked-order-top">

      <div class="booked-order-id">

        #${escapeHTML(
          order.orderId
        )}

      </div>

      ${latestLabel}

    </div>



    <div class="booked-order-details">


      <!-- BOOKED -->

      <div class="booked-detail">

        <div class="booked-detail-label">
          Booked
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(
            order.bookedDate
          )}
        </div>

      </div>



      <!-- DESIGN -->

      <div class="booked-detail">

        <div class="booked-detail-label">
          Design
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(
            order.design
          )}
        </div>

      </div>



      <!-- PRODUCTS -->

      <div class="booked-detail">

        <div class="booked-detail-label">
          Products
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(
  formatProducts(order.products)
).replace(/\n/g, "<br>")}
          
        </div>

      </div>



      <!-- SHIPPING -->

      <div class="
        booked-detail
        booked-shipping
      ">

        <div class="booked-detail-label">
          Est. Shipping
        </div>

        <div class="booked-detail-value">
          ${escapeHTML(
            order.shippingDate
          )}
        </div>

      </div>



      <!-- STATUS -->

      <div class="booked-status-wrap">

        <span
          class="
            booked-status
            ${statusClass}
          "
        >
          ${escapeHTML(
            order.status
          )}
        </span>

      </div>


    </div>

  `;


  return card;

}

function formatProducts(products) {
  if (!products) return "";

  // New format: array of product objects
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

        if (!name) return "";

        return Number.isFinite(quantity) && quantity > 0
          ? `${name} × ${quantity}`
          : name;
      })
      .filter(Boolean)
      .join("\n");
  }

  // Old format: plain text
  if (typeof products === "string") {
    return products;
  }

  // Handle a single product object
  if (typeof products === "object") {
    const name =
      products.name ||
      products.productName ||
      products.title ||
      "";

    return name
      ? `${name}${products.quantity ? ` × ${products.quantity}` : ""}`
      : "";
  }

  return String(products);
}


/* =========================================================
   RENDER
========================================================= */

function renderBookedOrders(
  orders
) {

  ordersList.innerHTML = "";

  emptyState.style.display =
    "none";


const visibleOrders =
  orders.filter(
    order =>
      order.hidden !== true &&
      shouldShowOrder(order)
  );


  if (
    visibleOrders.length === 0
  ) {

    emptyState.style.display =
      "block";

    return;

  }


  visibleOrders.forEach(
    (
      order,
      index
    ) => {

      const isLatest =
        index ===
        visibleOrders.length - 1;


      const card =
        createBookingCard(
          order,
          isLatest
        );


      ordersList.appendChild(
        card
      );

    }
  );

}



/* =========================================================
   LOAD FROM FIREBASE
========================================================= */

async function loadBookedOrders() {

  try {

    loadingState.style.display =
      "block";

    errorState.style.display =
      "none";


    const collectionRef =
      collection(
        db,
        BOOKED_ORDERS_COLLECTION
      );


    const snapshot =
      await getDocs(
        collectionRef
      );


    bookedOrders = [];


    snapshot.forEach(
      (docSnap) => {

        const data =
          docSnap.data();


        
bookedOrders.push({

  firestoreId:
    docSnap.id,

  orderId:
    data.orderId || "",

  bookedDate:
    data.bookedDate || "",

  design:
    data.design || "",

  products:
    data.products || "",

  shippingDate:
    data.shippingDate || "",

  status:
    data.status || "",

  dispatchedDate:
    data.dispatchedDate || "",

  // Read the same visibility field used by the admin page.
  hidden:
    data.hidden === true

});

      }
    );


    /*
      Oldest → Newest
    */

    bookedOrders.sort(
      (a, b) => {

        const dateA =
          parseDate(
            a.bookedDate
          );


        const dateB =
          parseDate(
            b.bookedDate
          );


        if (!dateA) return -1;

        if (!dateB) return 1;


        return (
          dateA.getTime() -
          dateB.getTime()
        );

      }
    );


    loadingState.style.display =
      "none";


    renderBookedOrders(
      bookedOrders
    );


  } catch (error) {

    console.error(
      "Booked orders load error:",
      error
    );


    loadingState.style.display =
      "none";


    errorState.style.display =
      "block";

  }

}



/* =========================================================
   SEARCH
========================================================= */

function searchBookedOrder() {

  const searchValue =
    searchInput.value
      .trim()
      .toUpperCase()
      .replace(
        /^#/,
        ""
      );


  /*
    Empty search = show everything
  */

  if (!searchValue) {

    renderBookedOrders(
      bookedOrders
    );

    return;

  }


  /*
    Exact Order ID
  */

  const result =
    bookedOrders.filter(
      order => {

        return String(
          order.orderId
        )
          .toUpperCase()
          ===
          searchValue;

      }
    );


  renderBookedOrders(
    result
  );

}



/* =========================================================
   SEARCH BUTTON
========================================================= */

searchBtn.addEventListener(
  "click",
  searchBookedOrder
);



/* =========================================================
   ENTER KEY
========================================================= */

searchInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter"
    ) {

      searchBookedOrder();

    }

  }
);



/* =========================================================
   INITIAL LOAD
========================================================= */

loadBookedOrders();
