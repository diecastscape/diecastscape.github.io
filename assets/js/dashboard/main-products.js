import { db } from "../firebase-init.js";

import {
  collection,
  updateDoc,
  addDoc,
  doc,
  getDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  adminState,
  defaultDetails,
  showEditMode,
  hideEditMode,
  loadAdminProducts
} from "/assets/js/dashbord/dashboard.js";


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

  const shippingPrice =
    Number(
      document.getElementById("p-shippingPrice").value
    );

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

  const lightingAdapter =
    document.getElementById("p-lightingAdapter")
      .value.trim();

  const offerClime =
    document.getElementById("p-offerClime")
      .value.trim();

  const offerText =
    document.getElementById("p-offerText")
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

    if (msg) {
      msg.innerText =
        "Enter product title";
    }

    return;

  }


  if (!priceOld || !priceNew) {

    if (msg) {
      msg.innerText =
        "Enter prices";
    }

    return;

  }


  if (
    !Number.isFinite(shippingPrice) ||
    shippingPrice < 0
  ) {

    if (msg) {
      msg.innerText =
        "Enter a valid shipping price";
    }

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
    // UPDATE EXISTING PRODUCT
    // ========================================

    if (
      adminState.editingId &&
      adminState.editingType === "main"
    ) {

      await updateDoc(
        doc(
          db,
          "products",
          adminState.editingId
        ),
        {

          name,
          subtitle,
          priceOld,
          priceNew,
          detailsHTML,
          shippingPrice,
          images,

          dimensions,
          flore,
          suitableScale,
          capacity,
          accessories,
          rotating,
          lighting,
          lightingAdapter,
          cover,
          build,
          offerClime,
          offerText

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
          subtitle,
          priceOld,
          priceNew,
          detailsHTML,
          shippingPrice,
          images,

          dimensions,
          flore,
          suitableScale,
          capacity,
          accessories,
          rotating,
          lighting,
          lightingAdapter,
          cover,
          build,
          offerClime,
          offerText,

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


    adminState.editingId = null;
    adminState.editingType = null;


    hideEditMode();


    btn.innerText =
      "Save Product";


    resetMainForm();


    setTimeout(() => {

      if (msg) {
        msg.innerText = "";
      }

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


    if (msg) {
      msg.innerText =
        "Error saving product";
    }

  }

};


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


      adminState.editingId =
        id;

      adminState.editingType =
        "main";


      if (typeof window.toggleAdd === "function") {

        window.toggleAdd(
          "main"
        );

      }


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


      // ==========================================
      // BASIC PRODUCT DATA
      // ==========================================

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


      // ==========================================
      // SHIPPING PRICE
      // ==========================================

      document.getElementById(
        "p-shippingPrice"
      ).value =
        data.shippingPrice ?? "";


      // ==========================================
      // QUICK SPECIFICATIONS
      // ==========================================

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
        "p-lightingAdapter"
      ).value =
        data.lightingAdapter || "";


      document.getElementById(
        "p-cover"
      ).value =
        data.cover || "";


      document.getElementById(
        "p-build"
      ).value =
        data.build || "";


      document.getElementById(
        "p-offerClime"
      ).value =
        data.offerClime || "";


      document.getElementById(
        "p-offerText"
      ).value =
        data.offerText || "";


      // ==========================================
      // LOAD IMAGES
      // ==========================================

      const list =
        document.getElementById(
          "imagesList"
        );


      if (list) {

        list.innerHTML =
          "";

      }


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


            if (list) {

              list.appendChild(
                div
              );

            }

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
// RESET MAIN FORM
// ======================================================

window.resetMainForm =
  function resetMainForm() {

    const ids = [

      "p-name",
      "p-subtitle",
      "p-old",
      "p-new",
      "p-shippingPrice",
      "p-dimensions",
      "p-flore",
      "p-suitableScale",
      "p-capacity",
      "p-accessories",
      "p-rotating",
      "p-lighting",
      "p-lightingAdapter",
      "p-cover",
      "p-build",
      "p-offerClime",
      "p-offerText"

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

  };
