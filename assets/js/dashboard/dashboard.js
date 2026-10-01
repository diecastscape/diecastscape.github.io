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
      addWrap.style.display =
        "none";
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

          <div class="admin-product">

            <div class="admin-title">
              ${p.name || "No name"}
            </div>


            <div class="admin-price-row">

              ${priceHTML}

            </div>


            <div class="admin-shipping">

              ${
                p.shippingText ||
                "Shipping charges applicable"
              }

            </div>


            <div class="admin-actions">

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
                      translate(1.4066 1.4066)
                      scale(2.81)
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
                      C5.583 86 4 84.417 4 82.471V16.142
                      c0-1.946 1.583-3.53 3.53-3.53h34.803
                      c1.104 0 2-.896 2-2
                      s-.896-2-2-2H7.53
                      C3.378 8.612 0 11.99 0 16.142v66.329
                      C0 86.622 3.378 90 7.53 90h66.328
                      c4.152 0 7.53-3.378 7.53-7.529V47.667
                      c0-1.105-.896-2-2-2z"
                      fill="currentColor"
                    />

                  </g>

                </svg>

              </button>


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
                      translate(1.4066 1.4066)
                      scale(2.81)
                    "
                  >

                    <path
                      d="M66.911 90H23.089
                      c-1.589 0-2.902-1.238-2.995-2.824
                      l-3.69-63.018
                      c-.048-.825.246-1.633.813-2.234
                      .567-.601 1.356-.941 2.183-.941h51.201
                      c.826 0 1.615.341 2.183.941
                      .566.601.86 1.409.813 2.234
                      l-3.689 63.018
                      C69.813 88.762 68.5 90 66.911 90z"
                      fill="currentColor"
                    />

                    <path
                      d="M75.977 26.983
                      H14.023c-1.657 0-3-1.343-3-3v-3.869
                      c0-5.645 4.592-10.237 10.237-10.237h47.479
                      c5.645 0 10.237 4.592 10.237 10.237v3.869
                      c0 1.657-1.343 3-3 3z"
                      fill="currentColor"
                    />

                    <path
                      d="M56.913 15.876H33.086c-1.657 0-3-1.343-3-3
                      C30.086 5.776 35.863 0 42.963 0h4.074
                      c7.1 0 12.876 5.776 12.876 12.876
                      c0 1.657-1.343 3-3 3z"
                      fill="currentColor"
                    />

                    <path
                      d="M55.613 76.021
                      c-.06 0-.118-.002-.179-.005
                      -1.653-.097-2.916-1.517-2.819-3.171
                      l2.146-36.658
                      c.098-1.654 1.509-2.911 3.171-2.82
                      1.653.097 2.916 1.517 2.819 3.17
                      l-2.146 36.659
                      c-.093 1.594-1.416 2.825-2.992 2.825z"
                      fill="currentColor"
                    />

                    <path
                      d="M34.386 76.021
                      c-1.577 0-2.898-1.23-2.992-2.824
                      l-2.146-36.659
                      c-.097-1.654 1.166-3.073 2.82-3.17
                      1.644-.088 3.073 1.166 3.17 2.82
                      l2.146 36.658
                      c.097 1.658-1.166 3.074-2.819 3.171
                      -.06.002-.12.004-.179.004z"
                      fill="currentColor"
                    />

                    <path
                      d="M45 76.021
                      c-1.657 0-3-1.343-3-3V36.362
                      c0-1.657 1.343-3 3-3s3 1.343 3 3v36.658
                      c0 1.658-1.343 3.001-3 3.001z"
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
