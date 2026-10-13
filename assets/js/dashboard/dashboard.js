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

  <p>
    The diorama comes enclosed in a <strong>box-style display</strong> with
    <strong>built-in LED lighting</strong> and a
    <strong>clear acrylic front panel</strong> for enhanced presentation and protection.
  </p>

  <p>
    An <strong>external power adapter is included</strong>, ensuring quick and
    hassle-free setup.
  </p>

  <p>
    <strong>Product Dimensions:</strong>
    300 × 125 × 120 mm
  </p>

  <p>
    <strong>Note:</strong>
    Display models (cars) are
    <strong>not included</strong> and are shown for representation purposes only.
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
// LOAD ADMIN PRODUCTS
// ======================================================

export async function loadAdminProducts(type) {

  let container = null;


  if (type === "main") {

    container =
      document.getElementById(
        "mainProducts"
      );

  }

  else if (type === "frames") {

    container =
      document.getElementById(
        "frameProducts"
      );

  }

  else if (type === "accessories") {

    container =
      document.getElementById(
        "accessoriesProducts"
      );

  }


  if (!container) {
    return;
  }


  const addWrap =
    document.getElementById(
      "add-" + type
    );


  if (addWrap) {
    addWrap.style.display =
      "none";
  }


  container.style.display =
    "block";


  container.innerHTML = `
    <div class="product-list-loading">
      Loading products...
    </div>
  `;


  let colName;


  if (type === "main") {

    colName =
      "products";

  }

  else if (type === "frames") {

    colName =
      "frameProducts";

  }

  else if (type === "accessories") {

    colName =
      "accessoriesProducts";

  }


  try {

    const q =
      query(
        collection(
          db,
          colName
        ),
        orderBy(
          "created",
          "desc"
        )
      );


    const snap =
      await getDocs(q);


    let html = "";


    snap.forEach(
      productDoc => {

        const p =
          productDoc.data();

        const id =
          productDoc.id;


        let priceHTML = "";


        if (type === "main") {

          priceHTML = `
            <div class="price-stack">

              <div class="admin-old-price">
                ₹${p.priceOld || 0}
              </div>

              <div class="admin-price">
                ₹${p.priceNew || 0}
              </div>

            </div>
          `;

        }

        else {

          priceHTML = `
            <div class="admin-price">
              ₹${p.price || 0}
            </div>
          `;

        }


        let editFunction;
        let deleteFunction;


        if (type === "frames") {

          editFunction =
            `editFrameProduct('${id}')`;

          deleteFunction =
            `deleteFrameProduct('${id}')`;

        }

        else if (type === "accessories") {

          editFunction =
            `editAccessoryProduct('${id}')`;

          deleteFunction =
            `deleteAccessoryProduct('${id}')`;

        }

        else {

          editFunction =
            `editProduct('${type}','${id}')`;

          deleteFunction =
            `deleteProduct('${type}','${id}')`;

        }


        html += `

          
const valueOrDash = value =>
  value !== undefined && value !== null && String(value).trim() !== ""
    ? String(value)
    : "—";

const imageCount = Array.isArray(p.images) ? p.images.length : 0;

const isMainProduct = type === "main";

const productInfo = isMainProduct ? `
  <div class="admin-product-details">

    <div class="admin-detail-row">
      <span class="admin-detail-label">Subtitle</span>
      <span class="admin-detail-value">${valueOrDash(p.subtitle)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Old price</span>
      <span class="admin-detail-value admin-old-value">
        ₹${valueOrDash(p.priceOld)}
      </span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">New price</span>
      <span class="admin-detail-value admin-new-value">
        ₹${valueOrDash(p.priceNew)}
      </span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Shipping price</span>
      <span class="admin-detail-value">
        ${p.shippingPrice !== undefined && p.shippingPrice !== null
          ? "₹" + p.shippingPrice
          : valueOrDash(p.shippingText)}
      </span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Ribbon / offer label</span>
      <span class="admin-detail-value">${valueOrDash(p.offerClime)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Offer text</span>
      <span class="admin-detail-value">${valueOrDash(p.offerText)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Dimensions</span>
      <span class="admin-detail-value">${valueOrDash(p.dimensions)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Floors</span>
      <span class="admin-detail-value">${valueOrDash(p.flore)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Suitable scale</span>
      <span class="admin-detail-value">${valueOrDash(p.suitableScale)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Car capacity</span>
      <span class="admin-detail-value">${valueOrDash(p.capacity)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Accessories</span>
      <span class="admin-detail-value">${valueOrDash(p.accessories)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Rotating feature</span>
      <span class="admin-detail-value">${valueOrDash(p.rotating)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Lighting</span>
      <span class="admin-detail-value">${valueOrDash(p.lighting)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Lighting / adapter</span>
      <span class="admin-detail-value">${valueOrDash(p.lightingAdapter)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Acrylic cover</span>
      <span class="admin-detail-value">${valueOrDash(p.cover)}</span>
    </div>

    <div class="admin-detail-row">
      <span class="admin-detail-label">Build details</span>
      <span class="admin-detail-value">${valueOrDash(p.build)}</span>
    </div>

    <div class="admin-detail-row admin-image-count">
      <span class="admin-detail-label">Product images</span>
      <span class="admin-detail-value">${imageCount} image${imageCount === 1 ? "" : "s"}</span>
    </div>

    <div class="admin-description">
      <span class="admin-detail-label">Product description</span>
      <div class="admin-description-content">
        ${p.detailsHTML || "No description added"}
      </div>
    </div>

  </div>
` : `
  <div class="admin-product-details">
    <div class="admin-detail-row">
      <span class="admin-detail-label">Shipping</span>
      <span class="admin-detail-value">
        ${valueOrDash(p.shippingText)}
      </span>
    </div>
  </div>
`;

html += `
  <div class="admin-product">

    <div class="admin-product-heading">
      <div class="admin-title">${valueOrDash(p.name)}</div>
      <div class="admin-product-type">
        ${isMainProduct ? "MAIN PRODUCT" : type.toUpperCase()}
      </div>
    </div>

    <div class="admin-price-row">
      ${priceHTML}
    </div>

    ${productInfo}

    <div class="admin-actions">
      <button onclick="${editFunction}">Edit product</button>
      <button onclick="${deleteFunction}" class="admin-delete-btn">
        Delete product
      </button>
    </div>

  </div>
`;
                  


    if (!html) {

      html =
        `<p>No products</p>`;

    }


    container.innerHTML =
      html;


  } catch (error) {

    console.error(
      "Error loading products:",
      error
    );


    container.innerHTML = `
      <p>
        Error loading products.
      </p>
    `;

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
