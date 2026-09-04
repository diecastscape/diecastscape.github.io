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
// FRAME PRODUCT IMAGE FIELD
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
      placeholder="Image path (frames)"
    >
  `;

  list.appendChild(row);

};


// ======================================================
// SAVE FRAME PRODUCT
// ======================================================

window.saveFrameProduct =
  async function () {

    const loader =
      document.getElementById(
        "f-saveLoader"
      );

    const btn =
      document.getElementById(
        "f-saveBtn"
      );

    const msg =
      document.getElementById(
        "f-saveMsg"
      );

    if (
      !btn ||
      btn.disabled
    ) {
      return;
    }


    const name =
      document.getElementById(
        "f-name"
      ).value.trim();


    const price =
      Number(
        document.getElementById(
          "f-price"
        ).value
      );


    const shippingText =
      document.getElementById(
        "f-shipping"
      ).value.trim();


    if (msg) {
      msg.innerText = "";
    }


    // ==========================================
    // VALIDATION
    // ==========================================

    if (!name) {

      if (msg) {
        msg.innerText =
          "Enter frame name";
      }

      return;

    }


    if (!price) {

      if (msg) {
        msg.innerText =
          "Enter price";
      }

      return;

    }


    // ==========================================
    // IMAGES
    // ==========================================

    const inputs =
      document.querySelectorAll(
        ".frame-image"
      );

    const images = [];


    inputs.forEach(input => {

      const value =
        input.value.trim();

      if (value) {
        images.push(value);
      }

    });


    if (
      images.length === 0
    ) {

      if (msg) {
        msg.innerText =
          "Add at least 1 image";
      }

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
      // UPDATE
      // ========================================

      if (
        editingId &&
        editingType === "frames"
      ) {

        await updateDoc(
          doc(
            db,
            "frameProducts",
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


      // ========================================
      // ADD
      // ========================================

      else {

        await addDoc(
          collection(
            db,
            "frameProducts"
          ),
          {

            name,
            price,
            shippingText,
            images,

            active: true,

            created:
              Date.now()

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


      if (msg) {
        msg.innerText =
          "Saved successfully ✔";
      }


      editingId = null;
      editingType = null;


      hideEditMode();


      btn.innerText =
        "Save Frame";


      resetFrameForm();


      // Close form

      const addWrap =
        document.getElementById(
          "add-frames"
        );

      if (addWrap) {
        addWrap.style.display =
          "none";
      }


      // Show list

      const listBox =
        document.getElementById(
          "frameProducts"
        );

      if (listBox) {
        listBox.style.display =
          "block";
      }


      // Reset button

      const addBtn =
        document.getElementById(
          "framesAddBtn"
        );

      if (addBtn) {

        addBtn.innerText =
          "+ Add";

        addBtn.classList.remove(
          "cancel-btn"
        );

      }


      loadAdminProducts(
        "frames"
      );


      setTimeout(() => {

        if (msg) {
          msg.innerText = "";
        }

      }, 3000);


    } catch (error) {

      console.error(
        "Error saving frame:",
        error
      );


      if (loader) {
        loader.classList.remove("show");
      }

      btn.disabled = false;


      if (msg) {
        msg.innerText =
          "Error saving frame";
      }

    }

  };


// ======================================================
// INITIAL FRAME IMAGE FIELDS
// ======================================================

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

      for (
        let i = 0;
        i < 3;
        i++
      ) {

        addFrameImageField();

      }

    }

  }
);


// ======================================================
// MAIN IMAGE FIELD
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

  }

  else if (type === "frames") {

    id =
      "framesEditModeBar";

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


  const name =
    document.getElementById("p-name")
      .value.trim();

  const subtitle =
    document.getElementById("p-subtitle")
      .value.trim();

  const priceOld =
    Number(
      document.getElementById("p-old").value
    );

  const priceNew =
    Number(
      document.getElementById("p-new").value
    );

  const shippingText =
    document.getElementById("p-shipping")
      .value.trim();

  const detailsHTML =
    document.getElementById("p-details")
      .value.trim();


  // ==========================================
  // QUICK SPECIFICATIONS
  // ==========================================

  const dimensions =
    document.getElementById("p-dimensions")
      .value.trim();

  const flore =
    document.getElementById("p-flore")
      .value.trim();

  const suitableScale =
    document.getElementById("p-suitableScale")
      .value.trim();

  const capacity =
    document.getElementById("p-capacity")
      .value.trim();

  const accessories =
    document.getElementById("p-accessories")
      .value.trim();

  const rotating =
    document.getElementById("p-rotating")
      .value.trim();

  const lighting =
    document.getElementById("p-lighting")
      .value.trim();

  const cover =
    document.getElementById("p-cover")
      .value.trim();

  const build =
    document.getElementById("p-build")
      .value.trim();


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
        full:
          input.value.trim()
      });

    }

  });


  if (images.length === 0) {

    msg.innerText =
      "Add at least 1 image";

    return;

  }


  if (loader) {
    loader.classList.add("show");
  }

  btn.disabled = true;


  try {

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
          subtitle,
          priceOld,
          priceNew,
          detailsHTML,
          shippingText,
          images,

          dimensions,
          flore,
          suitableScale,
          capacity,
          accessories,
          rotating,
          lighting,
          cover,
          build

        }
      );

    }

    else {

      await addDoc(
        collection(
          db,
          "products"
        ),
        {

          name,
          subtitle,
          priceOld,
          priceNew,
          detailsHTML,
          shippingText,
          images,

          dimensions,
          flore,
          suitableScale,
          capacity,
          accessories,
          rotating,
          lighting,
          cover,
          build,

          active: true,

          created:
            Date.now()

        }
      );

    }


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


    loadAdminProducts(
      "main"
    );


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
// ACCESSORY IMAGE FIELD
// ======================================================

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


    list.appendChild(div);

  };


// ======================================================
// SAVE ACCESSORY
// ======================================================

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


    if (msg) {
      msg.innerText = "";
    }


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
          images.push(value);
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


    if (loader) {
      loader.classList.add("show");
    }

    btn.disabled = true;


    try {

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


      if (loader) {
        loader.classList.remove("show");
      }

      btn.disabled = false;


      msg.innerText =
        "Saved successfully";


      editingId = null;
      editingType = null;


      hideEditMode();


      btn.innerText =
        "Save Product";


      resetAccessoryForm();


      const addWrap =
        document.getElementById(
          "add-accessories"
        );

      if (addWrap) {
        addWrap.style.display =
          "none";
      }


      const listBox =
        document.getElementById(
          "accessoriesProducts"
        );

      if (listBox) {
        listBox.style.display =
          "block";
      }


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


      if (loader) {
        loader.classList.remove("show");
      }

      btn.disabled = false;


      msg.innerText =
        "Error saving product";

    }

  };


// ======================================================
// EDIT ACCESSORY
// ======================================================

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


      document.getElementById(
        "a-name"
      ).value =
        data.name || "";


      document.getElementById(
        "a-price"
      ).value =
        data.price || "";


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


      document.getElementById(
        "a-saveBtn"
      ).innerText =
        "Update Product";


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


// ======================================================
// EDIT FRAME
// ======================================================

window.editFrameProduct =
  async function (id) {

    try {

      const snap =
        await getDoc(
          doc(
            db,
            "frameProducts",
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
        "frames";


      toggleAdd(
        "frames"
      );


      showEditMode(
        "frames",
        true
      );


      const addBtn =
        document.getElementById(
          "framesAddBtn"
        );


      if (addBtn) {

        addBtn.innerText =
          "Cancel";

        addBtn.classList.add(
          "cancel-btn"
        );

      }


      document.getElementById(
        "f-name"
      ).value =
        data.name || "";


      document.getElementById(
        "f-price"
      ).value =
        data.price || "";


      document.getElementById(
        "f-shipping"
      ).value =
        data.shippingText || "";


      const list =
        document.getElementById(
          "f-imagesList"
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
                class="frame-image"
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
        "f-saveBtn"
      ).innerText =
        "Update Frame";


    } catch (error) {

      console.error(
        "Error editing frame:",
        error
      );

    }

  };


// ======================================================
// DELETE FRAME
// ======================================================

window.deleteFrameProduct =
  async function (id) {

    if (
      !confirm(
        "Delete this frame?"
      )
    ) {

      return;

    }


    try {

      await deleteDoc(
        doc(
          db,
          "frameProducts",
          id
        )
      );


      loadAdminProducts(
        "frames"
      );


    } catch (error) {

      console.error(
        "Error deleting frame:",
        error
      );

    }

  };


// ======================================================
// DELETE ACCESSORY
// ======================================================

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


    resetMainForm();
    resetFrameForm();
    resetAccessoryForm();


    editingId = null;
    editingType = null;


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


    // ==========================================
    // OPEN
    // ==========================================

    if (opening) {

      if (!editingId) {

        if (type === "main") {
          resetMainForm();
        }

        else if (type === "frames") {
          resetFrameForm();
        }

        else if (type === "accessories") {
          resetAccessoryForm();
        }

      }


      showEditMode(
        type,
        Boolean(editingId)
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


    // ==========================================
    // CLOSE
    // ==========================================

    else {

      if (type === "main") {
        resetMainForm();
      }

      else if (type === "frames") {
        resetFrameForm();
      }

      else if (type === "accessories") {
        resetAccessoryForm();
      }


      editingId = null;
      editingType = null;


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
      resetMainForm();
    }

    else if (type === "frames") {
      resetFrameForm();
    }

    else if (type === "accessories") {
      resetAccessoryForm();
    }


    editingId = null;
    editingType = null;


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

async function loadAdminProducts(
  type
) {

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


        // ======================================
        // PRICE
        // ======================================

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


        // ======================================
        // EDIT / DELETE
        // ======================================

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
                      C5.583 86 4 84.417
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
                      translate(1.4066 1.4066)
                      scale(2.81)
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
                      c.826 0 1.615.341
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
                      c-1.657 0-3-1.343-3-3v-3.869
                      c0-5.645 4.592-10.237
                      10.237-10.237h47.479
                      c5.645 0 10.237 4.592
                      10.237 10.237v3.869
                      c0 1.657-1.343 3-3 3z"
                      fill="currentColor"
                    />

                    <path
                      d="M56.913 15.876
                      H33.086
                      c-1.657 0-3-1.343-3-3
                      C30.086 5.776
                      35.863 0 42.963 0h4.074
                      c7.1 0 12.876 5.776
                      12.876 12.876
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
// EDIT MAIN PRODUCT
// ======================================================

window.editProduct =
  async function (
    type,
    id
  ) {

    if (type !== "main") {
      return;
    }


    try {

      const snap =
        await getDoc(
          doc(
            db,
            "products",
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
        "main";


      toggleAdd(
        "main"
      );


      showEditMode(
        "main",
        true
      );


      const btn =
        document.getElementById(
          "mainAddBtn"
        );


      if (btn) {

        btn.innerText =
          "Cancel";

        btn.classList.add(
          "cancel-btn"
        );

      }


      document.getElementById(
        "p-name"
      ).value =
        data.name || "";


      document.getElementById(
        "p-subtitle"
      ).value =
        data.subtitle || "";


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
        data.shippingText || "";


      document.getElementById(
        "p-dimensions"
      ).value =
        data.dimensions || "";


      document.getElementById(
        "p-flore"
      ).value =
        data.flore || "";


      document.getElementById(
        "p-suitableScale"
      ).value =
        data.suitableScale || "";


      document.getElementById(
        "p-capacity"
      ).value =
        data.capacity || "";


      document.getElementById(
        "p-accessories"
      ).value =
        data.accessories || "";


      document.getElementById(
        "p-rotating"
      ).value =
        data.rotating || "";


      document.getElementById(
        "p-lighting"
      ).value =
        data.lighting || "";


      document.getElementById(
        "p-cover"
      ).value =
        data.cover || "";


      document.getElementById(
        "p-build"
      ).value =
        data.build || "";


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


    } catch (error) {

      console.error(
        "Error editing product:",
        error
      );

    }

  };


// ======================================================
// DELETE MAIN PRODUCT
// ======================================================

window.deleteProduct =
  async function (
    type,
    id
  ) {

    if (type !== "main") {
      return;
    }


    if (
      !confirm(
        "Delete this product?"
      )
    ) {

      return;

    }


    try {

      await deleteDoc(
        doc(
          db,
          "products",
          id
        )
      );


      loadAdminProducts(
        "main"
      );


    } catch (error) {

      console.error(
        "Error deleting product:",
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


    if (type === "main") {

      listBox =
        document.getElementById(
          "mainProducts"
        );

      resetMainForm();

    }

    else if (type === "frames") {

      listBox =
        document.getElementById(
          "frameProducts"
        );

      resetFrameForm();

    }

    else if (type === "accessories") {

      listBox =
        document.getElementById(
          "accessoriesProducts"
        );

      resetAccessoryForm();

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
// RESET MAIN FORM
// ======================================================

function resetMainForm() {

  const ids = [
    "p-name",
    "p-subtitle",
    "p-old",
    "p-new",
    "p-shipping",
    "p-dimensions",
    "p-flore",
    "p-suitableScale",
    "p-capacity",
    "p-accessories",
    "p-rotating",
    "p-lighting",
    "p-cover",
    "p-build"
  ];


  ids.forEach(id => {

    const el =
      document.getElementById(id);

    if (el) {
      el.value = "";
    }

  });


  const details =
    document.getElementById(
      "p-details"
    );

  if (details) {
    details.value =
      defaultDetails;
  }


  const btn =
    document.getElementById(
      "saveBtn"
    );

  if (btn) {
    btn.innerText =
      "Save Product";
  }


  const list =
    document.getElementById(
      "imagesList"
    );


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
// RESET FRAME FORM
// ======================================================

function resetFrameForm() {

  const name =
    document.getElementById(
      "f-name"
    );

  const price =
    document.getElementById(
      "f-price"
    );

  const shipping =
    document.getElementById(
      "f-shipping"
    );

  const btn =
    document.getElementById(
      "f-saveBtn"
    );

  const list =
    document.getElementById(
      "f-imagesList"
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
      "Save Frame";
  }


  if (list) {

    list.innerHTML =
      "";


    for (
      let i = 0;
      i < 3;
      i++
    ) {

      addFrameImageField();

    }

  }


  const bar =
    document.getElementById(
      "framesEditModeBar"
    );


  if (bar) {
    bar.style.display =
      "none";
  }

}


// ======================================================
// RESET ACCESSORY FORM
// ======================================================

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
