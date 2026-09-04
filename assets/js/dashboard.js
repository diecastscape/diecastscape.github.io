import { db, auth } from "./firebase-init.js";

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

let editingId = null;
let editingType = null;
let inactivityTimer;


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

  clearTimeout(inactivityTimer);

  inactivityTimer = setTimeout(() => {

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
// FRAME PRODUCT
// ======================================================

window.addFrameImageField = function () {

  const list =
    document.getElementById(
      "f-imagesList"
    );

  if (!list) return;

  const row =
    document.createElement("div");

  row.innerHTML = `
    <input
      class="frame-image"
      placeholder="Image URL"
    >
  `;

  list.appendChild(row);

};


// Add first frame image field
window.addEventListener(
  "DOMContentLoaded",
  () => {

    const list =
      document.getElementById(
        "f-imagesList"
      );

    if (
      list &&
      list.children.length === 0
    ) {

      addFrameImageField();

    }

  }
);


// SAVE FRAME PRODUCT

window.saveFrameProduct =
  async function () {

    const loader =
      document.getElementById(
        "f-saveLoader"
      );

    const msg =
      document.getElementById(
        "f-saveMsg"
      );

    if (loader) {
      loader.style.display =
        "block";
    }

    if (msg) {
      msg.innerText = "";
    }


    const images = [];


    document
      .querySelectorAll(".frame-image")
      .forEach(input => {

        if (
          input.value.trim()
        ) {

          images.push(
            input.value.trim()
          );

        }

      });


    try {

      await addDoc(
        collection(
          db,
          "frameProducts"
        ),
        {

          name:
            document
              .getElementById("f-name")
              .value
              .trim(),

          price:
            Number(
              document
                .getElementById("f-price")
                .value
            ),

          images,

          active: true,

          created:
            serverTimestamp()

        }
      );


      if (msg) {

        msg.innerText =
          "Frame Added ✔";

      }


      document.getElementById(
        "f-name"
      ).value = "";

      document.getElementById(
        "f-price"
      ).value = "";


      document.getElementById(
        "f-imagesList"
      ).innerHTML = "";


      addFrameImageField();


    } catch (err) {

      console.error(
        "Frame save error:",
        err
      );


      if (msg) {

        msg.innerText =
          err.message;

      }

    }


    if (loader) {

      loader.style.display =
        "none";

    }

  };


// ======================================================
// DEFAULT PRODUCT DETAILS
// ======================================================

const defaultDetails = `
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
// MAIN PRODUCT IMAGE FIELD
// ======================================================

window.addImageField = function () {

  const list =
    document.getElementById(
      "imagesList"
    );

  if (!list) return;


  const div =
    document.createElement("div");


  div.innerHTML = `
    <input
      class="img-full"
      placeholder="Image path (products)"
    >
  `;


  list.appendChild(div);

};


// ======================================================
// SALE CONFIG
// ======================================================

const saleRef =
  doc(
    db,
    "siteConfig",
    "sale"
  );


async function loadSaleConfig() {

  try {

    const snap =
      await getDoc(
        saleRef
      );


    if (!snap.exists()) {
      return;
    }


    const cfg =
      snap.data();


    const enabled =
      document.getElementById(
        "sale-enabled"
      );

    const start =
      document.getElementById(
        "sale-start"
      );


    if (enabled) {

      enabled.checked =
        cfg.enabled || false;

    }


    if (
      start &&
      cfg.start
    ) {

      start.value =
        cfg.start.substring(
          0,
          16
        );

    }


  } catch (error) {

    console.error(
      "Error loading sale settings:",
      error
    );

  }

}


window.saveSaleConfig =
  async function () {

    const btn =
      document.getElementById(
        "saleSaveBtn"
      );

    const loader =
      document.getElementById(
        "saleSaveLoader"
      );

    const msg =
      document.getElementById(
        "sale-save-msg"
      );


    if (
      !btn ||
      btn.disabled
    ) {

      return;

    }


    const enabled =
      document.getElementById(
        "sale-enabled"
      ).checked;


    const start =
      document.getElementById(
        "sale-start"
      ).value;


    if (msg) {
      msg.innerText = "";
    }


    if (loader) {
      loader.classList.add(
        "show"
      );
    }


    btn.disabled = true;


    try {

      await setDoc(
        saleRef,
        {
          enabled,
          start
        }
      );


      if (loader) {

        loader.classList.remove(
          "show"
        );

      }


      btn.disabled = false;


      if (msg) {

        msg.innerText =
          "Sale settings saved";

        setTimeout(() => {

          msg.innerText = "";

        }, 2500);

      }


    } catch (error) {

      console.error(
        "Sale settings error:",
        error
      );


      if (loader) {

        loader.classList.remove(
          "show"
        );

      }


      btn.disabled = false;


      if (msg) {

        msg.innerText =
          "Error saving settings";

      }

    }

  };


window.addEventListener(
  "DOMContentLoaded",
  loadSaleConfig
);


// ======================================================
// EDIT MODE BAR
// ======================================================

function showEditMode(
  type,
  editing = false
) {

  let id;


  if (type === "main") {

    id =
      "mainEditModeBar";

  } else if (
    type === "special"
  ) {

    id =
      "specialEditModeBar";

  }


  const bar =
    document.getElementById(
      id
    );


  if (bar) {

    bar.style.display =
      "block";

    bar.innerText =
      editing
        ? "Editing Product"
        : "Adding Product";

  }

}


function hideEditMode() {

  const main =
    document.getElementById(
      "mainEditModeBar"
    );

  const special =
    document.getElementById(
      "specialEditModeBar"
    );

  const accessories =
    document.getElementById(
      "accessoriesEditModeBar"
    );


  if (main) {
    main.style.display =
      "none";
  }


  if (special) {
    special.style.display =
      "none";
  }


  if (accessories) {
    accessories.style.display =
      "none";
  }

}


// ======================================================
// SAVE MAIN PRODUCT
// ======================================================
window.saveProduct = async function () {

  const loader =
    document.getElementById("saveLoader");

  const btn =
    document.getElementById("saveBtn");

  const msg =
    document.getElementById("saveMsg");


  if (!btn || btn.disabled) {
    return;
  }


  // ==========================================
  // BASIC PRODUCT DATA
  // ==========================================

  const name =
    document.getElementById("p-name").value.trim();

  const priceOld =
    Number(
      document.getElementById("p-old").value
    );

  const priceNew =
    Number(
      document.getElementById("p-new").value
    );

  const shippingText =
    document
      .getElementById("p-shipping")
      .value
      .trim();

  const detailsHTML =
    document
      .getElementById("p-details")
      .value
      .trim();


  // ==========================================
  // QUICK SPECIFICATIONS
  // ==========================================

  const dimensions =
    document
      .getElementById("p-dimensions")
      .value
      .trim();

  const suitableScale =
    document
      .getElementById("p-suitableScale")
      .value
      .trim();

  const capacity =
    document
      .getElementById("p-capacity")
      .value
      .trim();

  const lighting =
    document
      .getElementById("p-lighting")
      .value
      .trim();

  const cover =
    document
      .getElementById("p-cover")
      .value
      .trim();

  const build =
    document
      .getElementById("p-build")
      .value
      .trim();


  if (msg) {
    msg.innerText = "";
  }


  // ==========================================
  // VALIDATION
  // ==========================================

  if (!name) {

    msg.innerText =
      "Enter product title";

    return;
  }


  if (!priceOld || !priceNew) {

    msg.innerText =
      "Enter prices";

    return;
  }


  // ==========================================
  // IMAGES
  // ==========================================

  const fulls =
    document.querySelectorAll(".img-full");

  const images = [];

  fulls.forEach(input => {

    if (input.value.trim()) {

      images.push({
        full: input.value.trim()
      });

    }

  });


  if (images.length === 0) {

    msg.innerText =
      "Add at least 1 image";

    return;
  }


  // ==========================================
  // LOADER
  // ==========================================

  if (loader) {
    loader.classList.add("show");
  }

  btn.disabled = true;


  try {

    // ========================================
    // UPDATE EXISTING PRODUCT
    // ========================================

    if (
      editingId &&
      editingType === "main"
    ) {

      await updateDoc(
        doc(
          db,
          "products",
          editingId
        ),
        {

          name,

          priceOld,

          priceNew,

          detailsHTML,

          shippingText,

          images,

          // QUICK SPECS
          dimensions,

          suitableScale,

          capacity,

          lighting,

          cover,

          build

        }
      );

    }

    // ========================================
    // ADD NEW PRODUCT
    // ========================================

    else {

      await addDoc(
        collection(
          db,
          "products"
        ),
        {

          name,

          priceOld,

          priceNew,

          detailsHTML,

          shippingText,

          images,

          // QUICK SPECS
          dimensions,

          suitableScale,

          capacity,

          lighting,

          cover,

          build,

          active: true,

          created: Date.now()

        }
      );

    }


    // ========================================
    // SUCCESS
    // ========================================

    if (loader) {
      loader.classList.remove("show");
    }

    btn.disabled = false;

    msg.innerText =
      "Saved successfully ✔";


    editingId = null;
    editingType = null;


    hideEditMode();


    btn.innerText =
      "Save Product";


    resetMainForm();


    setTimeout(() => {

      msg.innerText = "";

    }, 3000);


    loadAdminProducts("main");


  } catch (error) {

    console.error(
      "Error saving product:",
      error
    );


    if (loader) {
      loader.classList.remove("show");
    }

    btn.disabled = false;


    msg.innerText =
      "Error saving product";

  }

};
// ======================================================
// INITIAL MAIN IMAGE FIELDS
// ======================================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const list =
      document.getElementById(
        "imagesList"
      );


    if (
      list &&
      list.children.length === 0
    ) {

      for (
        let i = 0;
        i < 4;
        i++
      ) {

        addImageField();

      }

    }

  }
);


// ======================================================
// OPEN SECTION
// ======================================================

window.openSection =
  function (type) {

    // Hide all sections

    document
      .querySelectorAll(
        ".section-panel"
      )
      .forEach(section => {

        section.style.display =
          "none";

      });


    // Buttons

    const mainBtn =
      document.getElementById(
        "mainAddBtn"
      );

    const specialBtn =
      document.getElementById(
        "specialAddBtn"
      );

    const accessoriesBtn =
      document.getElementById(
        "accessoriesAddBtn"
      );


    [
      mainBtn,
      specialBtn,
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


    // Reset forms

    resetMainForm();
    resetSaleForm();
    resetAccessoryForm();


    editingId = null;
    editingType = null;


    hideEditMode();


    // Sale control

    const saleControl =
      document.querySelector(
        ".sale-control"
      );


    if (saleControl) {

      saleControl.style.display =
        "block";

    }


    // Open section

    const section =
      document.getElementById(
        "section-" + type
      );


    if (!section) {
      return;
    }


    section.style.display =
      "block";


    // Hide add form

    const addWrap =
      document.getElementById(
        "add-" + type
      );


    if (addWrap) {

      addWrap.style.display =
        "none";

    }


    // Find list

    let listBox = null;


    if (
      type === "main"
    ) {

      listBox =
        document.getElementById(
          "mainProducts"
        );

    }

    else if (
      type === "special"
    ) {

      listBox =
        document.getElementById(
          "specialProducts"
        );

    }

    else if (
      type === "accessories"
    ) {

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
// TOGGLE ADD FORM
// ======================================================

window.toggleAdd =
  function (type) {

    const addWrap =
      document.getElementById(
        "add-" + type
      );


    const listBox =
      type === "main"
        ? document.getElementById(
            "mainProducts"
          )
        : type === "special"
        ? document.getElementById(
            "specialProducts"
          )
        : document.getElementById(
            "accessoriesProducts"
          );


    const btn =
      type === "main"
        ? document.getElementById(
            "mainAddBtn"
          )
        : type === "special"
        ? document.getElementById(
            "specialAddBtn"
          )
        : document.getElementById(
            "accessoriesAddBtn"
          );


    const saleBox =
      document.getElementById(
        "saleControlBox"
      );


    if (!addWrap) {
      return;
    }


    const opening =
      addWrap.style.display !==
      "block";


    // ==========================================
    // OPEN
    // ==========================================

    if (opening) {

      // Reset only for new product

      if (!editingId) {

        if (
          type === "main"
        ) {

          resetMainForm();

        }

        else if (
          type === "special"
        ) {

          resetSaleForm();

        }

        else if (
          type === "accessories"
        ) {

          resetAccessoryForm();

        }

      }


      // Edit bar

      if (
        type === "accessories"
      ) {

        const bar =
          document.getElementById(
            "accessoriesEditModeBar"
          );


        if (bar) {

          bar.style.display =
            "block";

          bar.innerText =
            editingId
              ? "Editing Product"
              : "Adding Product";

        }

      }

      else {

        showEditMode(
          type,
          Boolean(editingId)
        );

      }


      addWrap.style.display =
        "block";


      // Hide sale settings

      if (
        type === "special" &&
        saleBox
      ) {

        saleBox.style.display =
          "none";

      }


      // Hide list

      if (listBox) {

        listBox.style.display =
          "none";

      }


      // Change button

      if (btn) {

        btn.innerText =
          "Cancel";

        btn.classList.add(
          "cancel-btn"
        );

      }

    }


    // ==========================================
    // CLOSE
    // ==========================================

    else {

      if (
        type === "main"
      ) {

        resetMainForm();

      }

      else if (
        type === "special"
      ) {

        resetSaleForm();

      }

      else if (
        type === "accessories"
      ) {

        resetAccessoryForm();

      }


      editingId = null;
      editingType = null;


      hideEditMode();


      addWrap.style.display =
        "none";


      if (
        type === "special" &&
        saleBox
      ) {

        saleBox.style.display =
          "block";

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

    }

  };


// ======================================================
// TOGGLE LIST
// ======================================================

window.toggleList =
  function (type) {

    const addWrap =
      document.getElementById(
        "add-" + type
      );


    const btn =
      type === "main"
        ? document.getElementById(
            "mainAddBtn"
          )
        : type === "special"
        ? document.getElementById(
            "specialAddBtn"
          )
        : document.getElementById(
            "accessoriesAddBtn"
          );


    if (addWrap) {

      addWrap.style.display =
        "none";

    }


    if (
      type === "special"
    ) {

      const saleBox =
        document.getElementById(
          "saleControlBox"
        );


      if (saleBox) {

        saleBox.style.display =
          "block";

      }

    }


    if (
      type === "main"
    ) {

      resetMainForm();

    }

    else if (
      type === "special"
    ) {

      resetSaleForm();

    }

    else if (
      type === "accessories"
    ) {

      resetAccessoryForm();

    }


    editingId = null;
    editingType = null;


    hideEditMode();


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

async function loadAdminProducts(
  type
) {

  // ==========================================
  // CORRECT CONTAINER
  // ==========================================

  let container = null;


  if (
    type === "main"
  ) {

    container =
      document.getElementById(
        "mainProducts"
      );

  }

  else if (
    type === "special"
  ) {

    container =
      document.getElementById(
        "specialProducts"
      );

  }

  else if (
    type === "accessories"
  ) {

    container =
      document.getElementById(
        "accessoriesProducts"
      );

  }


  if (!container) {
    return;
  }


  // Add wrapper

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


  // ==========================================
  // COLLECTION
  // ==========================================

  let colName;


  if (
    type === "main"
  ) {

    colName =
      "products";

  }

  else if (
    type === "special"
  ) {

    colName =
      "specialSaleProducts";

  }

  else if (
    type === "accessories"
  ) {

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


        // ======================================
        // PRICE
        // ======================================

        let priceHTML = "";


        if (
          type === "main"
        ) {

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


        // ======================================
        // SOLD TOGGLE
        // ======================================

        let soldHTML = "";


        if (
          type === "special"
        ) {

          soldHTML = `
            <div class="sold-toggle">

              <label class="toggle-switch">

                <input
                  type="checkbox"
                  ${p.sold ? "checked" : ""}
                  onchange="
                    toggleSold(
                      '${id}',
                      this.checked
                    )
                  "
                >

                <span class="toggle-slider"></span>

              </label>

              <span class="sold-text">
                Sold
              </span>

            </div>
          `;

        }


        // ======================================
        // EDIT / DELETE BUTTONS
        // ======================================

        let editFunction;
        let deleteFunction;


        if (
          type === "accessories"
        ) {

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


        // ======================================
        // PRODUCT HTML
        // ======================================

        html += `

          <div class="admin-product">

            <div class="admin-title">
              ${p.name || "No name"}
            </div>


            <div class="admin-price-row">

              ${priceHTML}

              ${soldHTML}

            </div>


            <div class="admin-shipping">

              ${
                p.shippingText ||
                "Shipping charges applicable"
              }

            </div>


            <div class="admin-actions">

              <!-- EDIT -->

              <button
                onclick="${editFunction}"
              >

                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 256 256"
                >

                  <g
                    transform="
                      translate(
                        1.4066
                        1.4066
                      )
                      scale(
                        2.81
                      )
                    "
                  >

                    <path
                      d="M87.851 6.29
                      83.71 2.15
                      C82.324.763
                      80.48 0
                      78.521 0
                      c-1.961 0
                      -3.804.763
                      -5.19 2.15
                      L67.15 8.331
                      22.822 52.658
                      c-.074.074
                      -.134.156
                      -.194.238
                      -.016.022
                      -.036.04
                      -.052.063
                      -.087.13
                      -.155.268
                      -.208.411
                      -.004.011
                      -.012.019
                      -.015.03
                      l-6.486 18.178
                      c-.26.728
                      -.077 1.54
                      .47 2.086
                      .381.382
                      .893.586
                      1.415.586
                      .225 0
                      .452-.038
                      .671-.116
                      l18.177-6.485
                      c.014-.005
                      .025-.014
                      .038-.019
                      .142-.054
                      .279-.12
                      .406-.206
                      .017-.012
                      .031-.027
                      .048-.039
                      .088-.063
                      .174-.128
                      .251-.206
                      l44.328-44.328
                      6.182-6.181
                      c2.861-2.862
                      2.861-7.518
                      0-10.38z"
                      fill="currentColor"
                    />

                    <path
                      d="M79.388 45.667
                      c-1.104 0
                      -2 .896
                      -2 2v34.804
                      c0 1.946
                      -1.584 3.529
                      -3.53 3.529H7.53
                      C5.583 86
                      4 84.417
                      4 82.471V16.142
                      c0-1.946
                      1.583-3.53
                      3.53-3.53h34.803
                      c1.104 0
                      2-.896
                      2-2
                      s-.896-2
                      -2-2H7.53
                      C3.378 8.612
                      0 11.99
                      0 16.142v66.329
                      C0 86.622
                      3.378 90
                      7.53 90h66.328
                      c4.152 0
                      7.53-3.378
                      7.53-7.529V47.667
                      c0-1.105
                      -.896-2
                      -2-2z"
                      fill="currentColor"
                    />

                  </g>

                </svg>

              </button>


              <!-- DELETE -->

              <button
                onclick="${deleteFunction}"
              >

                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 256 256"
                >

                  <g
                    transform="
                      translate(
                        1.4066
                        1.4066
                      )
                      scale(
                        2.81
                      )
                    "
                  >

                    <path
                      d="M66.911 90H23.089
                      c-1.589 0
                      -2.902-1.238
                      -2.995-2.824
                      l-3.69-63.018
                      c-.048-.825
                      .246-1.633
                      .813-2.234
                      .567-.601
                      1.356-.941
                      2.183-.941h51.201
                      c.826 0
                      1.615.341
                      2.183.941
                      .566.601
                      .86 1.409
                      .813 2.234
                      l-3.689 63.018
                      C69.813 88.762
                      68.5 90
                      66.911 90z"
                      fill="currentColor"
                    />

                    <path
                      d="M75.977 26.983
                      H14.023
                      c-1.657 0
                      -3-1.343
                      -3-3v-3.869
                      c0-5.645
                      4.592-10.237
                      10.237-10.237h47.479
                      c5.645 0
                      10.237 4.592
                      10.237 10.237v3.869
                      c0 1.657-1.343 3-3 3z"
                      fill="currentColor"
                    />

                    <path
                      d="M56.913 15.876
                      H33.086
                      c-1.657 0
                      -3-1.343
                      -3-3
                      C30.086 5.776
                      35.863 0
                      42.963 0h4.074
                      c7.1 0
                      12.876 5.776
                      12.876 12.876
                      c0 1.657-1.343 3-3 3z"
                      fill="currentColor"
                    />

                    <path
                      d="M55.613 76.021
                      c-.06 0-.118-.002
                      -.179-.005
                      -1.653-.097
                      -2.916-1.517
                      -2.819-3.171
                      l2.146-36.658
                      c.098-1.654
                      1.509-2.911
                      3.171-2.82
                      1.653.097
                      2.916 1.517
                      2.819 3.17
                      l-2.146 36.659
                      c-.093 1.594
                      -1.416 2.825
                      -2.992 2.825z"
                      fill="currentColor"
                    />

                    <path
                      d="M34.386 76.021
                      c-1.577 0
                      -2.898-1.23
                      -2.992-2.824
                      l-2.146-36.659
                      c-.097-1.654
                      1.166-3.073
                      2.82-3.17
                      1.644-.088
                      3.073 1.166
                      3.17 2.82
                      l2.146 36.658
                      c.097 1.654
                      -1.166 3.074
                      -2.819 3.171
                      -.06.002
                      -.12.004
                      -.179.004z"
                      fill="currentColor"
                    />

                    <path
                      d="M45 76.021
                      c-1.657 0
                      -3-1.343
                      -3-3V36.362
                      c0-1.657
                      1.343-3
                      3-3s3 1.343
                      3 3v36.658
                      c0 1.658
                      -1.343 3.001
                      -3 3.001z"
                      fill="currentColor"
                    />

                  </g>

                </svg>

              </button>

            </div>

          </div>

        `;

      }
    );


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
// EDIT MAIN / SPECIAL PRODUCT
// ======================================================

window.editProduct =
  async function (
    type,
    id
  ) {

    let colName;


    if (
      type === "main"
    ) {

      colName =
        "products";

    }

    else if (
      type === "special"
    ) {

      colName =
        "specialSaleProducts";

    }

    else {

      return;

    }


    try {

      const snap =
        await getDoc(
          doc(
            db,
            colName,
            id
          )
        );


      if (!snap.exists()) {
        return;
      }


      const data =
        snap.data();


      editingId =
        id;

      editingType =
        type;


      // Open form

      toggleAdd(
        type
      );


      showEditMode(
        type,
        true
      );


      const btn =
        type === "main"
          ? document.getElementById(
              "mainAddBtn"
            )
          : document.getElementById(
              "specialAddBtn"
            );


      if (btn) {

        btn.innerText =
          "Cancel";

        btn.classList.add(
          "cancel-btn"
        );

      }


      // ======================================
      // MAIN
      // ======================================

      if (
        type === "main"
      ) {

        document.getElementById(
          "p-name"
        ).value =
          data.name || "";


        document.getElementById(
          "p-old"
        ).value =
          data.priceOld || "";


        document.getElementById(
          "p-new"
        ).value =
          data.priceNew || "";


        document.getElementById(
          "p-details"
        ).value =
          data.detailsHTML ||
          defaultDetails;


        document.getElementById(
          "p-shipping"
        ).value =
          data.shippingText ||
          "";


        const list =
          document.getElementById(
            "imagesList"
          );


        list.innerHTML =
          "";


        if (
          Array.isArray(
            data.images
          )
        ) {

          data.images.forEach(
            image => {

              const div =
                document.createElement(
                  "div"
                );


              div.innerHTML = `
                <input
                  class="img-full"
                  value="${image.full || ""}"
                >
              `;


              list.appendChild(
                div
              );

            }
          );

        }


        document.getElementById(
          "saveBtn"
        ).innerText =
          "Update Product";

      }


      // ======================================
      // SPECIAL SALE
      // ======================================

      else if (
        type === "special"
      ) {

        document.getElementById(
          "s-name"
        ).value =
          data.name || "";


        document.getElementById(
          "s-price"
        ).value =
          data.price || "";


        document.getElementById(
          "s-shipping"
        ).value =
          data.shippingText ||
          "";


        const list =
          document.getElementById(
            "s-imagesList"
          );


        list.innerHTML =
          "";


        if (
          Array.isArray(
            data.images
          )
        ) {

          data.images.forEach(
            image => {

              const div =
                document.createElement(
                  "div"
                );


              div.innerHTML = `
                <input
                  class="s-img-full"
                  value="${image}"
                >
              `;


              list.appendChild(
                div
              );

            }
          );

        }


        document.getElementById(
          "s-saveBtn"
        ).innerText =
          "Update Product";

      }


    } catch (error) {

      console.error(
        "Error editing product:",
        error
      );

    }

  };


// ======================================================
// CANCEL EDIT
// ======================================================

window.cancelEdit =
  function (type) {

    editingId = null;
    editingType = null;


    hideEditMode();


    const addWrap =
      document.getElementById(
        "add-" + type
      );


    let listBox;


    if (
      type === "main"
    ) {

      listBox =
        document.getElementById(
          "mainProducts"
        );

    }

    else if (
      type === "special"
    ) {

      listBox =
        document.getElementById(
          "specialProducts"
        );

    }

    else if (
      type === "accessories"
    ) {

      listBox =
        document.getElementById(
          "accessoriesProducts"
        );

    }


    const btn =
      type === "main"
        ? document.getElementById(
            "mainAddBtn"
          )
        : type === "special"
        ? document.getElementById(
            "specialAddBtn"
          )
        : document.getElementById(
            "accessoriesAddBtn"
          );


    // Close form

    if (addWrap) {

      addWrap.style.display =
        "none";

    }


    // Show list

    if (listBox) {

      listBox.style.display =
        "block";

    }


    // Sale settings

    if (
      type === "special"
    ) {

      const saleBox =
        document.getElementById(
          "saleControlBox"
        );


      if (saleBox) {

        saleBox.style.display =
          "block";

      }

    }


    // Reset button

    if (btn) {

      btn.innerText =
        "+ Add";

      btn.classList.remove(
        "cancel-btn"
      );

    }


    // Reset form

    if (
      type === "main"
    ) {

      resetMainForm();

    }

    else if (
      type === "special"
    ) {

      resetSaleForm();

    }

    else if (
      type === "accessories"
    ) {

      resetAccessoryForm();

    }

  };


// ======================================================
// DELETE MAIN / SPECIAL PRODUCT
// ======================================================

window.deleteProduct =
  async function (
    type,
    id
  ) {

    if (
      !confirm(
        "Delete this product?"
      )
    ) {

      return;

    }


    let colName;


    if (
      type === "main"
    ) {

      colName =
        "products";

    }

    else if (
      type === "special"
    ) {

      colName =
        "specialSaleProducts";

    }

    else {

      return;

    }


    try {

      await deleteDoc(
        doc(
          db,
          colName,
          id
        )
      );


      loadAdminProducts(
        type
      );


    } catch (error) {

      console.error(
        "Error deleting product:",
        error
      );

    }

  };


// ======================================================
// SOLD TOGGLE
// ======================================================

window.toggleSold =
  async function (
    id,
    status
  ) {

    try {

      await updateDoc(
        doc(
          db,
          "specialSaleProducts",
          id
        ),
        {
          sold: status
        }
      );


      console.log(
        "Sold status updated"
      );


    } catch (error) {

      console.error(
        "Error updating sold status:",
        error
      );

    }

  };


// ======================================================
// RESET MAIN FORM
// ======================================================

function resetMainForm() {

  const name =
    document.getElementById(
      "p-name"
    );

  const oldPrice =
    document.getElementById(
      "p-old"
    );

  const newPrice =
    document.getElementById(
      "p-new"
    );

  const details =
    document.getElementById(
      "p-details"
    );

  const shipping =
    document.getElementById(
      "p-shipping"
    );

  const btn =
    document.getElementById(
      "saveBtn"
    );

  const list =
    document.getElementById(
      "imagesList"
    );


  if (name) {
    name.value = "";
  }


  if (oldPrice) {
    oldPrice.value = "";
  }


  if (newPrice) {
    newPrice.value = "";
  }


  if (details) {
    details.value =
      defaultDetails;
  }


  if (shipping) {
    shipping.value = "";
  }


  if (btn) {
    btn.innerText =
      "Save Product";
  }


  if (list) {

    list.innerHTML =
      "";


    for (
      let i = 0;
      i < 4;
      i++
    ) {

      addImageField();

    }

  }

}


// ======================================================
// SALE IMAGE FIELD
// ======================================================

window.addSaleImageField =
  function () {

    const list =
      document.getElementById(
        "s-imagesList"
      );


    if (!list) {
      return;
    }


    const div =
      document.createElement(
        "div"
      );


    div.innerHTML = `
      <input
        class="s-img-full"
        placeholder="Image path (newsale)"
      >
    `;


    list.appendChild(
      div
    );

  };


// ======================================================
// RESET SALE FORM
// ======================================================

function resetSaleForm() {

  const name =
    document.getElementById(
      "s-name"
    );

  const price =
    document.getElementById(
      "s-price"
    );

  const shipping =
    document.getElementById(
      "s-shipping"
    );

  const btn =
    document.getElementById(
      "s-saveBtn"
    );

  const list =
    document.getElementById(
      "s-imagesList"
    );


  if (name) {
    name.value = "";
  }


  if (price) {
    price.value = "";
  }


  if (shipping) {
    shipping.value = "";
  }


  if (btn) {
    btn.innerText =
      "Save Product";
  }


  if (list) {

    list.innerHTML =
      "";


    for (
      let i = 0;
      i < 3;
      i++
    ) {

      addSaleImageField();

    }

  }

}


// ======================================================
// SAVE SALE PRODUCT
// ======================================================

window.saveSaleProduct =
  async function () {

    const loader =
      document.getElementById(
        "s-saveLoader"
      );

    const btn =
      document.getElementById(
        "s-saveBtn"
      );

    const msg =
      document.getElementById(
        "s-saveMsg"
      );


    if (
      !btn ||
      btn.disabled
    ) {

      return;

    }


    const name =
      document.getElementById(
        "s-name"
      ).value.trim();


    const price =
      Number(
        document.getElementById(
          "s-price"
        ).value
      );


    const shippingText =
      document.getElementById(
        "s-shipping"
      ).value.trim();


    msg.innerText = "";


    // VALIDATION

    if (!name) {

      msg.innerText =
        "Enter product title";

      return;

    }


    if (!price) {

      msg.innerText =
        "Enter price";

      return;

    }


    // IMAGES

    const fulls =
      document.querySelectorAll(
        ".s-img-full"
      );


    const images = [];


    fulls.forEach(
      input => {

        if (
          input.value.trim()
        ) {

          images.push(
            input.value.trim()
          );

        }

      }
    );


    if (
      images.length === 0
    ) {

      msg.innerText =
        "Add at least 1 image";

      return;

    }


    loader.classList.add(
      "show"
    );

    btn.disabled = true;


    try {

      // UPDATE

      if (
        editingId &&
        editingType === "special"
      ) {

        await updateDoc(
          doc(
            db,
            "specialSaleProducts",
            editingId
          ),
          {

            name,
            price,
            shippingText,
            images

          }
        );

      }


      // ADD

      else {

        await addDoc(
          collection(
            db,
            "specialSaleProducts"
          ),
          {

            name,
            price,
            shippingText,
            images,

            active: true,

            sold: false,

            created:
              Date.now()

          }
        );

      }


      loader.classList.remove(
        "show"
      );

      btn.disabled = false;


      msg.innerText =
        "Saved successfully";


      editingId = null;
      editingType = null;


      hideEditMode();


      btn.innerText =
        "Save Product";


      resetSaleForm();


      setTimeout(() => {

        msg.innerText = "";

      }, 3000);


      loadAdminProducts(
        "special"
      );


    } catch (error) {

      console.error(
        "Error saving sale product:",
        error
      );


      loader.classList.remove(
        "show"
      );

      btn.disabled = false;


      msg.innerText =
        "Error saving";

    }

  };


// ======================================================
// INITIAL SALE IMAGE FIELDS
// ======================================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const list =
      document.getElementById(
        "s-imagesList"
      );


    if (
      list &&
      list.children.length === 0
    ) {

      for (
        let i = 0;
        i < 3;
        i++
      ) {

        addSaleImageField();

      }

    }

  }
);


// ======================================================
// ACCESSORIES ADMIN
// ======================================================


// ------------------------------------------------------
// ADD ACCESSORY IMAGE FIELD
// ------------------------------------------------------

window.addAccessoryImageField =
  function () {

    const list =
      document.getElementById(
        "a-imagesList"
      );


    if (!list) {
      return;
    }


    const div =
      document.createElement(
        "div"
      );


    div.innerHTML = `
      <input
        class="a-img"
        placeholder="Image path (accessories)"
      >
    `;


    list.appendChild(
      div
    );

  };


// ------------------------------------------------------
// SAVE ACCESSORY
// ------------------------------------------------------

window.saveAccessoryProduct =
  async function () {

    const loader =
      document.getElementById(
        "a-saveLoader"
      );

    const btn =
      document.getElementById(
        "a-saveBtn"
      );

    const msg =
      document.getElementById(
        "a-saveMsg"
      );


    if (
      !btn ||
      btn.disabled
    ) {

      return;

    }


    const name =
      document.getElementById(
        "a-name"
      ).value.trim();


    const price =
      Number(
        document.getElementById(
          "a-price"
        ).value
      );


    msg.innerText = "";


    // VALIDATION

    if (!name) {

      msg.innerText =
        "Enter accessory name";

      return;

    }


    if (!price) {

      msg.innerText =
        "Enter price";

      return;

    }


    // IMAGES

    const inputs =
      document.querySelectorAll(
        ".a-img"
      );


    const images = [];


    inputs.forEach(
      input => {

        const value =
          input.value.trim();


        if (value) {

          images.push(
            value
          );

        }

      }
    );


    if (
      images.length === 0
    ) {

      msg.innerText =
        "Add at least 1 image";

      return;

    }


    loader.classList.add(
      "show"
    );

    btn.disabled = true;


    try {

      // ==========================================
      // UPDATE
      // ==========================================

      if (
        editingId &&
        editingType === "accessories"
      ) {

        await updateDoc(
          doc(
            db,
            "accessoriesProducts",
            editingId
          ),
          {

            name,
            price,
            images

          }
        );

      }


      // ==========================================
      // ADD
      // ==========================================

      else {

        await addDoc(
          collection(
            db,
            "accessoriesProducts"
          ),
          {

            name,
            price,
            images,

            active: true,

            created:
              Date.now()

          }
        );

      }


      loader.classList.remove(
        "show"
      );

      btn.disabled = false;


      msg.innerText =
        "Saved successfully";


      editingId = null;
      editingType = null;


      hideEditMode();


      btn.innerText =
        "Save Product";


      resetAccessoryForm();


      // CLOSE FORM

      const addWrap =
        document.getElementById(
          "add-accessories"
        );


      if (addWrap) {

        addWrap.style.display =
          "none";

      }


      // SHOW LIST

      const listBox =
        document.getElementById(
          "accessoriesProducts"
        );


      if (listBox) {

        listBox.style.display =
          "block";

      }


      // RESET ADD BUTTON

      const addBtn =
        document.getElementById(
          "accessoriesAddBtn"
        );


      if (addBtn) {

        addBtn.innerText =
          "+ Add";

        addBtn.classList.remove(
          "cancel-btn"
        );

      }


      // RELOAD

      loadAdminProducts(
        "accessories"
      );


      setTimeout(() => {

        msg.innerText = "";

      }, 3000);


    } catch (error) {

      console.error(
        "Error saving accessory:",
        error
      );


      loader.classList.remove(
        "show"
      );

      btn.disabled = false;


      msg.innerText =
        "Error saving product";

    }

  };


// ------------------------------------------------------
// EDIT ACCESSORY
// ------------------------------------------------------

window.editAccessoryProduct =
  async function (id) {

    try {

      const snap =
        await getDoc(
          doc(
            db,
            "accessoriesProducts",
            id
          )
        );


      if (!snap.exists()) {
        return;
      }


      const data =
        snap.data();


      editingId =
        id;

      editingType =
        "accessories";


      // IMPORTANT:
      // Set edit state BEFORE toggleAdd()

      toggleAdd(
        "accessories"
      );


      const bar =
        document.getElementById(
          "accessoriesEditModeBar"
        );


      if (bar) {

        bar.style.display =
          "block";

        bar.innerText =
          "Editing Product";

      }


      // NAME

      document.getElementById(
        "a-name"
      ).value =
        data.name || "";


      // PRICE

      document.getElementById(
        "a-price"
      ).value =
        data.price || "";


      // IMAGES

      const list =
        document.getElementById(
          "a-imagesList"
        );


      list.innerHTML =
        "";


      if (
        Array.isArray(
          data.images
        )
      ) {

        data.images.forEach(
          image => {

            const div =
              document.createElement(
                "div"
              );


            div.innerHTML = `
              <input
                class="a-img"
                value="${image}"
              >
            `;


            list.appendChild(
              div
            );

          }
        );

      }


      // UPDATE BUTTON

      document.getElementById(
        "a-saveBtn"
      ).innerText =
        "Update Product";


      // ADD BUTTON

      const addBtn =
        document.getElementById(
          "accessoriesAddBtn"
        );


      if (addBtn) {

        addBtn.innerText =
          "Cancel";

        addBtn.classList.add(
          "cancel-btn"
        );

      }


    } catch (error) {

      console.error(
        "Error editing accessory:",
        error
      );

    }

  };


// ------------------------------------------------------
// DELETE ACCESSORY
// ------------------------------------------------------

window.deleteAccessoryProduct =
  async function (id) {

    if (
      !confirm(
        "Delete this accessory?"
      )
    ) {

      return;

    }


    try {

      await deleteDoc(
        doc(
          db,
          "accessoriesProducts",
          id
        )
      );


      loadAdminProducts(
        "accessories"
      );


    } catch (error) {

      console.error(
        "Error deleting accessory:",
        error
      );

    }

  };


// ------------------------------------------------------
// RESET ACCESSORY FORM
// ------------------------------------------------------

function resetAccessoryForm() {

  const name =
    document.getElementById(
      "a-name"
    );

  const price =
    document.getElementById(
      "a-price"
    );

  const list =
    document.getElementById(
      "a-imagesList"
    );

  const btn =
    document.getElementById(
      "a-saveBtn"
    );


  if (name) {
    name.value = "";
  }


  if (price) {
    price.value = "";
  }


  if (btn) {

    btn.innerText =
      "Save Product";

  }


  if (list) {

    list.innerHTML =
      "";


    for (
      let i = 0;
      i < 3;
      i++
    ) {

      addAccessoryImageField();

    }

  }


  const bar =
    document.getElementById(
      "accessoriesEditModeBar"
    );


  if (bar) {

    bar.style.display =
      "none";

  }

}


// ======================================================
// INITIAL ACCESSORY IMAGE FIELDS
// ======================================================

window.addEventListener(
  "DOMContentLoaded",
  () => {

    const list =
      document.getElementById(
        "a-imagesList"
      );


    if (
      list &&
      list.children.length === 0
    ) {

      for (
        let i = 0;
        i < 3;
        i++
      ) {

        addAccessoryImageField();

      }

    }

  }
);
