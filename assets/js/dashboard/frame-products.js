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
  showEditMode,
  hideEditMode,
  loadAdminProducts
} from "/assets/js/dashboard/dashboard.js";


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


    // ==================================================
    // VALIDATION
    // ==================================================

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


    // ==================================================
    // IMAGES
    // ==================================================

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


    // ==================================================
    // LOADER
    // ==================================================

    if (loader) {
      loader.classList.add("show");
    }

    btn.disabled = true;


    try {

      // ================================================
      // UPDATE
      // ================================================

      if (
        adminState.editingId &&
        adminState.editingType === "frames"
      ) {

        await updateDoc(
          doc(
            db,
            "frameProducts",
            adminState.editingId
          ),
          {
            name,
            price,
            shippingText,
            images
          }
        );

      }


      // ================================================
      // ADD
      // ================================================

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


      // ================================================
      // SUCCESS
      // ================================================

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
        "Save Frame";


      resetFrameForm();


      const addWrap =
        document.getElementById(
          "add-frames"
        );


      if (addWrap) {
        addWrap.style.display =
          "none";
      }


      const listBox =
        document.getElementById(
          "frameProducts"
        );


      if (listBox) {
        listBox.style.display =
          "block";
      }


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


      adminState.editingId =
        id;

      adminState.editingType =
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
// RESET FRAME FORM
// ======================================================

window.resetFrameForm =
  function () {

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

  };
