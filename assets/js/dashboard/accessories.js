import { db } from "./firebase-init.js";

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
  showEditMode,
  hideEditMode,
  loadAdminProducts
} from "/dashboard/dashboard.js";


// ======================================================
// ACCESSORY IMAGE FIELD
// ======================================================

window.addAccessoryImageField =
  function (value = "") {

    const list =
      document.getElementById(
        "a-imagesList"
      );

    if (!list) {
      return;
    }


    const div =
      document.createElement("div");


    div.innerHTML = `
      <input
        class="a-img"
        type="text"
        placeholder="Image filename"
        value="${value}"
      >
    `;


    list.appendChild(div);

  };


// ======================================================
// SAVE / UPDATE ACCESSORY PRODUCT
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


    // ==================================================
    // FORM VALUES
    // ==================================================

    const name =
      document
        .getElementById("a-name")
        .value
        .trim();


    const quantity =
      document
        .getElementById("a-quantity")
        .value
        .trim();


    const subtitle =
      document
        .getElementById("a-subtitle")
        .value
        .trim();


    const price =
      Number(
        document
          .getElementById("a-price")
          .value
      );


    if (msg) {
      msg.innerText = "";
    }


    // ==================================================
    // VALIDATION
    // ==================================================

    if (!name) {

      if (msg) {
        msg.innerText =
          "Enter accessory name";
      }

      return;
    }


    if (!quantity) {

      if (msg) {
        msg.innerText =
          "Enter quantity / pack";
      }

      return;
    }


    if (!subtitle) {

      if (msg) {
        msg.innerText =
          "Enter subtitle";
      }

      return;
    }


    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {

      if (msg) {
        msg.innerText =
          "Enter a valid price";
      }

      return;
    }


    // ==================================================
    // IMAGES
    // ==================================================

    const imageInputs =
      document.querySelectorAll(
        ".a-img"
      );


    const images = [];


    imageInputs.forEach(input => {

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


    // ==================================================
    // START LOADER
    // ==================================================

    if (loader) {
      loader.classList.add("show");
    }

    btn.disabled = true;


    try {

      // ==================================================
      // EDIT EXISTING PRODUCT
      // ==================================================

      if (
        adminState.editingId &&
        adminState.editingType === "accessories"
      ) {

        await updateDoc(

          doc(
            db,
            "accessoriesProducts",
            adminState.editingId
          ),

          {
            name,
            quantity,
            subtitle,
            price,
            images
          }

        );

      }


      // ==================================================
      // ADD NEW PRODUCT
      // ==================================================

      else {

        await addDoc(

          collection(
            db,
            "accessoriesProducts"
          ),

          {
            name,
            quantity,
            subtitle,
            price,
            images,

            active: true,

            created:
              Date.now()
          }

        );

      }


      // ==================================================
      // SUCCESS
      // ==================================================

      if (loader) {
        loader.classList.remove("show");
      }

      btn.disabled = false;


      if (msg) {

        msg.innerText =
          adminState.editingId
            ? "Product updated successfully ✔"
            : "Product added successfully ✔";

      }


      adminState.editingId = null;
      adminState.editingType = null;


      hideEditMode();


      btn.innerText =
        "Save Product";


      resetAccessoryForm();


      // ==================================================
      // HIDE ADD / EDIT FORM
      // ==================================================

      const addWrap =
        document.getElementById(
          "add-accessories"
        );


      if (addWrap) {

        addWrap.style.display =
          "none";

      }


      // ==================================================
      // SHOW PRODUCTS LIST
      // ==================================================

      const listBox =
        document.getElementById(
          "accessoriesProducts"
        );


      if (listBox) {

        listBox.style.display =
          "block";

      }


      // ==================================================
      // RESET TOP ADD BUTTON
      // ==================================================

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


      // ==================================================
      // RELOAD PRODUCTS
      // ==================================================

      loadAdminProducts(
        "accessories"
      );


      setTimeout(() => {

        if (msg) {
          msg.innerText = "";
        }

      }, 3000);


    }

    catch (error) {

      console.error(
        "Error saving accessory:",
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
// EDIT ACCESSORY PRODUCT
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

        console.error(
          "Accessory does not exist"
        );

        return;

      }


      const data =
        snap.data();


      // ==================================================
      // SET EDIT STATE
      // ==================================================

      adminState.editingId =
        id;

      adminState.editingType =
        "accessories";


      // ==================================================
      // OPEN FORM
      // ==================================================

      const addWrap =
        document.getElementById(
          "add-accessories"
        );

      const listBox =
        document.getElementById(
          "accessoriesProducts"
        );


      if (addWrap) {

        addWrap.style.display =
          "block";

      }


      if (listBox) {

        listBox.style.display =
          "none";

      }


      showEditMode(
        "accessories",
        true
      );


      // ==================================================
      // LOAD PRODUCT DATA
      // ==================================================

      document.getElementById(
        "a-name"
      ).value =
        data.name || "";


      document.getElementById(
        "a-quantity"
      ).value =
        data.quantity || "";


      document.getElementById(
        "a-subtitle"
      ).value =
        data.subtitle || "";


      document.getElementById(
        "a-price"
      ).value =
        data.price ?? "";


      // ==================================================
      // LOAD IMAGES
      // ==================================================

      const imagesList =
        document.getElementById(
          "a-imagesList"
        );


      if (imagesList) {

        imagesList.innerHTML =
          "";


        if (
          Array.isArray(data.images) &&
          data.images.length
        ) {

          data.images.forEach(
            image => {

              addAccessoryImageField(
                image
              );

            }
          );

        }

        else {

          addAccessoryImageField();

        }

      }


      // ==================================================
      // UPDATE SAVE BUTTON
      // ==================================================

      const saveBtn =
        document.getElementById(
          "a-saveBtn"
        );


      if (saveBtn) {

        saveBtn.innerText =
          "Update Product";

      }


      // ==================================================
      // UPDATE ADD BUTTON
      // ==================================================

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


    }

    catch (error) {

      console.error(
        "Error editing accessory:",
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


    }

    catch (error) {

      console.error(
        "Error deleting accessory:",
        error
      );

    }

  };


// ======================================================
// RESET ACCESSORY FORM
// ======================================================

window.resetAccessoryForm =
  function () {

    const name =
      document.getElementById(
        "a-name"
      );

    const quantity =
      document.getElementById(
        "a-quantity"
      );

    const subtitle =
      document.getElementById(
        "a-subtitle"
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

    const msg =
      document.getElementById(
        "a-saveMsg"
      );


    if (name) {
      name.value = "";
    }


    if (quantity) {
      quantity.value = "";
    }


    if (subtitle) {
      subtitle.value = "";
    }


    if (price) {
      price.value = "";
    }


    if (msg) {
      msg.innerText = "";
    }


    if (btn) {

      btn.innerText =
        "Save Product";

      btn.disabled =
        false;

    }


    // ==================================================
    // RESET IMAGE FIELDS
    // ==================================================

    if (list) {

      list.innerHTML = "";


      for (
        let i = 0;
        i < 3;
        i++
      ) {

        addAccessoryImageField();

      }

    }


    // ==================================================
    // HIDE EDIT BAR
    // ==================================================

    const bar =
      document.getElementById(
        "accessoriesEditModeBar"
      );


    if (bar) {

      bar.style.display =
        "none";

    }

  };


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
