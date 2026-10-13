import { db, auth } from "../firebase-init.js";

import {
  collection,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// ======================================================
// GLOBAL EDIT STATE
// ======================================================

export const adminState = {
  editingId: null,
  editingType: null,
  inactivityTimer: null
};


// ======================================================
// AUTH + AUTO LOGOUT
// ======================================================

onAuthStateChanged(auth, (user) => {

  if (user) {
    startTracking();
  }

});


function startTracking() {

  resetTimer();

  [
    "click",
    "mousemove",
    "keydown",
    "scroll",
    "touchstart"
  ].forEach(event => {

    window.addEventListener(
      event,
      resetTimer
    );

  });

}


function resetTimer() {

  clearTimeout(adminState.inactivityTimer);

  adminState.inactivityTimer = setTimeout(() => {

    autoLogout();

  }, 15 * 60 * 1000);

}


function autoLogout() {

  alert(
    "Session expired due to inactivity"
  );

  signOut(auth).then(() => {

    window.location.replace(
      "/admin/login.html"
    );

  });

}


// ======================================================
// DEFAULT PRODUCT DETAILS
// ======================================================

export const defaultDetails = `
  <p>
    This is a <strong>fully assembled, ready-to-display diorama</strong>,
    designed for collectors who value realism and craftsmanship.
  </p>

  
`;


// ======================================================
// INITIAL DEFAULT DETAILS
// ======================================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const details =
      document.getElementById(
        "p-details"
      );

    if (
      details &&
      !details.value
    ) {

      details.value =
        defaultDetails;

    }

  }
);


// ======================================================
// EDIT MODE BAR
// ======================================================

export function showEditMode(type, editing = false) {

  let id = null;

  if (type === "main") {

    id = "mainEditModeBar";

  }

  else if (type === "frames") {

    id = "framesEditModeBar";

  }

  else if (type === "accessories") {

    id = "accessoriesEditModeBar";

  }


  if (!id) {
    return;
  }


  const bar =
    document.getElementById(id);


  if (bar) {

    bar.style.display = "block";

    bar.innerText =
      editing
        ? "Editing Product"
        : "Adding Product";

  }

}


export function hideEditMode() {

  const main =
    document.getElementById(
      "mainEditModeBar"
    );

  const frames =
    document.getElementById(
      "framesEditModeBar"
    );

  const accessories =
    document.getElementById(
      "accessoriesEditModeBar"
    );


  if (main) {
    main.style.display =
      "none";
  }


  if (frames) {
    frames.style.display =
      "none";
  }


  if (accessories) {
    accessories.style.display =
      "none";
  }

}


// ======================================================
// OPEN SECTION
// ======================================================

window.openSection =
  function (type) {

    document
      .querySelectorAll(
        ".section-panel"
      )
      .forEach(section => {

        section.style.display =
          "none";

      });


    const mainBtn =
      document.getElementById(
        "mainAddBtn"
      );

    const framesBtn =
      document.getElementById(
        "framesAddBtn"
      );

    const accessoriesBtn =
      document.getElementById(
        "accessoriesAddBtn"
      );


    [
      mainBtn,
      framesBtn,
      accessoriesBtn
    ].forEach(btn => {

      if (btn) {

        btn.innerText =
          "+ Add";

        btn.classList.remove(
          "cancel-btn"
        );

      }

    });


    window.resetMainForm();
    window.resetFrameForm();
    window.resetAccessoryForm();


    adminState.editingId = null;
    adminState.editingType = null;


    hideEditMode();


    const section =
      document.getElementById(
        "section-" + type
      );


    if (!section) {
      return;
    }


    section.style.display =
      "block";


    const addWrap =
  document.getElementById(
    "add-" + type
  );

if (addWrap) {
  addWrap.style.display = "none";
}


// ======================================================
// BOOKED ORDERS SECTION
// ======================================================

if (type === "bookedOrders") {

  const bookedList =
    document.getElementById(
      "bookedOrdersList"
    );

  if (bookedList) {
    bookedList.style.display = "block";
  }

  if (
    typeof window.loadBookedOrders === "function"
  ) {
    window.loadBookedOrders();
  }

  return;
}

let listBox;

    if (type === "main") {

      listBox =
        document.getElementById(
          "mainProducts"
        );

    }

    else if (type === "frames") {

      listBox =
        document.getElementById(
          "frameProducts"
        );

    }

    else if (type === "accessories") {

      listBox =
        document.getElementById(
          "accessoriesProducts"
        );

    }


    if (listBox) {

      listBox.style.display =
        "block";

      loadAdminProducts(
        type
      );

    }

  };


// ======================================================
// TOGGLE ADD
// ======================================================

window.toggleAdd =
  function (type) {

    const addWrap =
      document.getElementById(
        "add-" + type
      );


    let listBox;
    let btn;


    if (type === "main") {

      listBox =
        document.getElementById(
          "mainProducts"
        );

      btn =
        document.getElementById(
          "mainAddBtn"
        );

    }

    else if (type === "frames") {

      listBox =
        document.getElementById(
          "frameProducts"
        );

      btn =
        document.getElementById(
          "framesAddBtn"
        );

    }

    else if (type === "accessories") {

      listBox =
        document.getElementById(
          "accessoriesProducts"
        );

      btn =
        document.getElementById(
          "accessoriesAddBtn"
        );

    }


    if (!addWrap) {
      return;
    }


    const opening =
      addWrap.style.display !==
      "block";


    if (opening) {

      if (!adminState.editingId) {

        if (type === "main") {
          window.resetMainForm();
        }

        else if (type === "frames") {
          window.resetFrameForm();
        }

        else if (type === "accessories") {
          window.resetAccessoryForm();
        }

      }


      showEditMode(
        type,
        Boolean(adminState.editingId)
      );


      addWrap.style.display =
        "block";


      if (listBox) {
        listBox.style.display =
          "none";
      }


      if (btn) {

        btn.innerText =
          "Cancel";

        btn.classList.add(
          "cancel-btn"
        );

      }

    }

    else {

      if (type === "main") {
        window.resetMainForm();
      }

      else if (type === "frames") {
        window.resetFrameForm();
      }

      else if (type === "accessories") {
        window.resetAccessoryForm();
      }


      adminState.editingId = null;
      adminState.editingType = null;


      hideEditMode();


      addWrap.style.display =
        "none";


      if (listBox) {
        listBox.style.display =
          "block";
      }


      if (btn) {

        btn.innerText =
          "+ Add";

        btn.classList.remove(
          "cancel-btn"
        );

      }

    }

  };


// ======================================================
// TOGGLE LIST / REFRESH
// ======================================================

window.toggleList =
  function (type) {

    const addWrap =
      document.getElementById(
        "add-" + type
      );


    if (addWrap) {
      addWrap.style.display =
        "none";
    }


    if (type === "main") {
      window.resetMainForm();
    }

    else if (type === "frames") {
      window.resetFrameForm();
    }

    else if (type === "accessories") {
      window.resetAccessoryForm();
    }


    adminState.editingId = null;
    adminState.editingType = null;


    hideEditMode();


    let btn;


    if (type === "main") {

      btn =
        document.getElementById(
          "mainAddBtn"
        );

    }

    else if (type === "frames") {

      btn =
        document.getElementById(
          "framesAddBtn"
        );

    }

    else if (type === "accessories") {

      btn =
        document.getElementById(
          "accessoriesAddBtn"
        );

    }


    if (btn) {

      btn.innerText =
        "+ Add";

      btn.classList.remove(
        "cancel-btn"
      );

    }


    loadAdminProducts(
      type
    );

  };




// ======================================================
// LOAD ADMIN PRODUCTS — FIXED
// ======================================================

export async function loadAdminProducts(type) {
  const containers = {
    main: "mainProducts",
    frames: "frameProducts",
    accessories: "accessoriesProducts"
  };

  const collections = {
    main: "products",
    frames: "frameProducts",
    accessories: "accessoriesProducts"
  };

  const container = document.getElementById(containers[type]);
  if (!container || !collections[type]) return;

  const addWrap = document.getElementById("add-" + type);
  if (addWrap) addWrap.style.display = "none";

  container.style.display = "block";
  container.innerHTML =
    '<div class="product-list-loading">Loading products...</div>';

  const value = v =>
    v !== undefined &&
    v !== null &&
    String(v).trim() !== ""
      ? String(v)
      : "—";

  const safe = v =>
    String(v ?? "—").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);

  try {
    const q = query(
      collection(db, collections[type]),
      orderBy("created", "desc")
    );

    const snap = await getDocs(q);
    let html = "";

    snap.forEach(productDoc => {
      const p = productDoc.data();
      const id = productDoc.id;
      const isMain = type === "main";

      // Prices
      const priceHTML = isMain
        ? `
          <div class="price-stack">
            <span class="admin-old-price">
              ${p.priceOld != null ? "₹" + safe(p.priceOld) : "—"}
            </span>
            <span class="admin-price">
              ${p.priceNew != null ? "₹" + safe(p.priceNew) : "—"}
            </span>
          </div>
        `
        : `
          <div class="admin-price">
            ${p.price != null ? "₹" + safe(p.price) : "—"}
          </div>
        `;

      // Existing edit/delete functions
      let editFunction;
      let deleteFunction;

      if (type === "frames") {
        editFunction = `editFrameProduct('${id}')`;
        deleteFunction = `deleteFrameProduct('${id}')`;
      } else if (type === "accessories") {
        editFunction = `editAccessoryProduct('${id}')`;
        deleteFunction = `deleteAccessoryProduct('${id}')`;
      } else {
        editFunction = `editProduct('${type}','${id}')`;
        deleteFunction = `deleteProduct('${type}','${id}')`;
      }

      // Product information rows
      let rows = [];

      if (isMain) {
        const shipping =
          p.shippingPrice != null
            ? "₹" + p.shippingPrice
            : value(p.shippingText);

        rows = [
          ["Shipping price", shipping],
          ["Ribbon / offer label", p.offerClime],
          ["Offer text", p.offerText],
          ["Dimensions", p.dimensions],
          ["Floors", p.flore],
          ["Suitable scale", p.suitableScale],
          ["Car capacity", p.capacity],
          ["Accessories", p.accessories],
          ["Rotating feature", p.rotating],
          ["Lighting", p.lighting],
          ["Lighting / adapter", p.lightingAdapter],
          ["Acrylic cover", p.cover],
          ["Build details", p.build],
          [
            "Total product images",
            Array.isArray(p.images) ? p.images.length : 0
          ]
        ];
      } else {
        rows = [
          [
            "Shipping price",
            p.shippingPrice != null
              ? "₹" + p.shippingPrice
              : value(p.shippingText)
          ],
          [
            "Total product images",
            Array.isArray(p.images) ? p.images.length : 0
          ]
        ];
      }

      // IMPORTANT: Convert rows into visible HTML
      const detailsHTML = `
        <div class="admin-product-details">
          ${rows.map(([label, val]) => `
            <div class="admin-detail-row">
              <span class="admin-detail-label">${safe(label)}</span>
              <span class="admin-detail-value">${safe(value(val))}</span>
            </div>
          `).join("")}

        </div>
      `;

      // Render ALL product types, not only main products
      html += `
        <div class="admin-product">

          <div class="admin-product-heading">
            <div class="admin-title">${safe(value(p.name))}</div>
            ${p.subtitle ? `
              <div class="admin-product-subtitle">
                ${safe(p.subtitle)}
              </div>
            ` : ""}
            <div class="admin-product-type">
              ${isMain ? "MAIN PRODUCT" : safe(type.toUpperCase())}
            </div>
          </div>

          <div class="admin-price-row">
            ${priceHTML}
          </div>

          ${detailsHTML}

          <div class="admin-actions">
            <button type="button" onclick="${editFunction}">
              Edit product
            </button>
            <button
              type="button"
              onclick="${deleteFunction}"
              class="admin-delete-btn"
            >
              Delete product
            </button>
          </div>

        </div>
      `;
    });

    container.innerHTML = html || "<p>No products found.</p>";

  } catch (error) {
    console.error("Error loading products:", error);
    container.innerHTML =
      "<p>Error loading products. Check the browser console.</p>";
  }
}



// ======================================================
// CANCEL EDIT
// ======================================================

window.cancelEdit =
  function (type) {

    adminState.editingId = null;
    adminState.editingType = null;


    hideEditMode();


    const addWrap =
      document.getElementById(
        "add-" + type
      );


    let listBox;


    if (type === "main") {

      listBox =
        document.getElementById(
          "mainProducts"
        );

      window.resetMainForm();

    }

    else if (type === "frames") {

      listBox =
        document.getElementById(
          "frameProducts"
        );

      window.resetFrameForm();

    }

    else if (type === "accessories") {

      listBox =
        document.getElementById(
          "accessoriesProducts"
        );

      window.resetAccessoryForm();

    }


    const btn =
      type === "main"
        ? document.getElementById(
            "mainAddBtn"
          )
        : type === "frames"
        ? document.getElementById(
            "framesAddBtn"
          )
        : document.getElementById(
            "accessoriesAddBtn"
          );


    if (addWrap) {

      addWrap.style.display =
        "none";

    }


    if (listBox) {

      listBox.style.display =
        "block";

    }


    if (btn) {

      btn.innerText =
        "+ Add";

      btn.classList.remove(
        "cancel-btn"
      );

    }

  };


// ======================================================
// COMPATIBILITY
// ======================================================

window.showEditMode = showEditMode;
window.hideEditMode = hideEditMode;
window.loadAdminProducts = loadAdminProducts;
