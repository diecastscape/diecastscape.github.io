
import { db } from "../firebase-init.js";

import {
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


/* =====================================================
   DIORAMA FIELD AUTOCOMPLETE
===================================================== */

const PRODUCTS_COLLECTION = "products";
const SUGGESTIONS_COLLECTION = "dioramaFieldSuggestions";

const ADMIN_FIELDS = {
  name: "p-name",
  subtitle: "p-subtitle",

  dimensions: "p-dimensions",
  flore: "p-flore",
  suitableScale: "p-suitableScale",
  capacity: "p-capacity",
  accessories: "p-accessories",
  rotating: "p-rotating",
  lighting: "p-lighting",
  lightingAdapter: "p-lightingAdapter",
  cover: "p-cover",
  build: "p-build",

  offerClime: "p-offerClime",
  offerText: "p-offerText"
};


/* =====================================================
   STATE
===================================================== */

const suggestions = {};
const savedValues = {};

let suggestionBoxCounter = 0;


/* =====================================================
   INITIALIZE FIELD DATA
===================================================== */

Object.keys(ADMIN_FIELDS).forEach(field => {
  suggestions[field] = [];
  savedValues[field] = new Set();
});


/* =====================================================
   NORMALIZE VALUES
===================================================== */

function normalizeValue(value) {
  return String(value ?? "").trim();
}

function valueKey(value) {
  return normalizeValue(value).toLocaleLowerCase();
}


/* =====================================================
   ADD UNIQUE SUGGESTION
===================================================== */

function addSuggestion(field, value) {
  const cleanValue = normalizeValue(value);

  if (!cleanValue) return;

  const key = valueKey(cleanValue);

  if (savedValues[field].has(key)) return;

  savedValues[field].add(key);
  suggestions[field].push(cleanValue);

  suggestions[field].sort((a, b) =>
    a.localeCompare(b, undefined, {
      sensitivity: "base",
      numeric: true
    })
  );
}


/* =====================================================
   LOAD EXISTING PRODUCT VALUES
===================================================== */

async function loadProductSuggestions() {
  const snapshot = await getDocs(
    collection(db, PRODUCTS_COLLECTION)
  );

  snapshot.forEach(productDoc => {
    const product = productDoc.data();

    Object.keys(ADMIN_FIELDS).forEach(field => {
      addSuggestion(field, product[field]);
    });
  });
}


/* =====================================================
   LOAD CUSTOM SAVED SUGGESTIONS
===================================================== */

async function loadSavedSuggestions() {
  const snapshot = await getDocs(
    collection(db, SUGGESTIONS_COLLECTION)
  );

  snapshot.forEach(suggestionDoc => {
    const item = suggestionDoc.data();

    if (
      item.field &&
      Object.prototype.hasOwnProperty.call(
        ADMIN_FIELDS,
        item.field
      )
    ) {
      addSuggestion(item.field, item.value);
    }
  });
}


/* =====================================================
   SAVE A NEW CUSTOM SUGGESTION
===================================================== */

async function saveCustomSuggestion(field, value) {
  const cleanValue = normalizeValue(value);

  if (!cleanValue) return;

  const key = valueKey(cleanValue);

  if (savedValues[field].has(key)) return;

  // Make the suggestion available immediately.
  addSuggestion(field, cleanValue);

  try {
    await addDoc(
      collection(db, SUGGESTIONS_COLLECTION),
      {
        field,
        value: cleanValue,
        createdAt: Date.now()
      }
    );
  } catch (error) {
    console.error(
      `Unable to save ${field} suggestion:`,
      error
    );
  }
}


/* =====================================================
   ADD AUTOCOMPLETE STYLES
===================================================== */

function addAutocompleteStyles() {
  if (document.getElementById("dioramaSuggestionStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "dioramaSuggestionStyles";

  style.textContent = `
    .diorama-autocomplete-wrap {
      position: relative;
      width: 100%;
    }

    .diorama-suggestion-list {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 9999;

      display: none;
      max-height: 220px;
      overflow-y: auto;

      background: #ffffff;
      color: #222222;
      border: 1px solid #d6d6d6;
      border-radius: 8px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    }

    .diorama-suggestion-list.is-open {
      display: block;
    }

    .diorama-suggestion-option {
      display: block;
      width: 100%;
      padding: 11px 12px;

      border: 0;
      border-bottom: 1px solid #eeeeee;
      background: #ffffff;
      color: #222222;

      text-align: left;
      font: inherit;
      cursor: pointer;
      overflow-wrap: anywhere;
    }

    .diorama-suggestion-option:last-child {
      border-bottom: 0;
    }

    .diorama-suggestion-option:hover,
    .diorama-suggestion-option.is-active {
      background: #eaf9fb;
      color: #087f8b;
    }

    .diorama-suggestion-empty {
      padding: 11px 12px;
      color: #777777;
      font-size: 13px;
    }
  `;

  document.head.appendChild(style);
}


/* =====================================================
   ATTACH AUTOCOMPLETE TO ONE INPUT
===================================================== */

function attachAutocomplete(field, input) {
  if (!input || input.dataset.suggestionsAttached === "true") {
    return;
  }

  input.dataset.suggestionsAttached = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "diorama-autocomplete-wrap";

  input.parentNode.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const box = document.createElement("div");

  box.className = "diorama-suggestion-list";
  box.id = `diorama-suggestions-${++suggestionBoxCounter}`;

  box.setAttribute("role", "listbox");

  wrapper.appendChild(box);

  let activeIndex = -1;
  let pointerSelecting = false;


  /* ===================================================
     CLOSE SUGGESTIONS
  =================================================== */

  function closeSuggestions() {
    box.classList.remove("is-open");
    box.innerHTML = "";
    activeIndex = -1;
  }


  /* ===================================================
     SHOW MATCHING SUGGESTIONS
  =================================================== */

  function showSuggestions() {
    const typedValue = valueKey(input.value);

    const matches = suggestions[field].filter(value =>
      !typedValue ||
      valueKey(value).includes(typedValue)
    );

    box.innerHTML = "";
    activeIndex = -1;

    if (!matches.length) {
      const empty = document.createElement("div");

      empty.className = "diorama-suggestion-empty";
      empty.textContent = "No matching suggestions";

      box.appendChild(empty);
      box.classList.add("is-open");

      return;
    }

    matches.slice(0, 30).forEach(value => {
      const option = document.createElement("button");

      option.type = "button";
      option.className = "diorama-suggestion-option";
      option.textContent = value;

      option.setAttribute("role", "option");

      option.addEventListener("pointerdown", event => {
        // Select before the input loses focus.
        event.preventDefault();
        pointerSelecting = true;

        input.value = value;
        closeSuggestions();

        input.dispatchEvent(
          new Event("input", { bubbles: true })
        );

        input.focus();

        saveCustomSuggestion(field, value);
      });

      box.appendChild(option);
    });

    box.classList.add("is-open");
  }


  /* ===================================================
     KEYBOARD NAVIGATION
  =================================================== */

  input.addEventListener("keydown", event => {
    if (!box.classList.contains("is-open")) {
      if (
        event.key === "ArrowDown" &&
        suggestions[field].length
      ) {
        event.preventDefault();
        showSuggestions();
      }

      return;
    }

    const options = [
      ...box.querySelectorAll(".diorama-suggestion-option")
    ];

    if (!options.length) {
      if (event.key === "Escape") {
        closeSuggestions();
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      activeIndex = (activeIndex + 1) % options.length;

    } else if (event.key === "ArrowUp") {
      event.preventDefault();

      activeIndex =
        (activeIndex - 1 + options.length) % options.length;

    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();

      options[activeIndex].click();
      return;

    } else if (event.key === "Escape") {
      closeSuggestions();
      return;

    } else {
      return;
    }

    options.forEach((option, index) => {
      option.classList.toggle(
        "is-active",
        index === activeIndex
      );
    });
  });


  /* ===================================================
     INPUT EVENTS
  =================================================== */

  input.addEventListener("focus", showSuggestions);
  input.addEventListener("input", showSuggestions);

  input.addEventListener("blur", () => {
    if (pointerSelecting) {
      pointerSelecting = false;
      return;
    }

    closeSuggestions();

    // Save new values without preventing normal typing.
    saveCustomSuggestion(field, input.value);
  });


  /* ===================================================
     CLOSE ON OUTSIDE CLICK
  =================================================== */

  document.addEventListener("pointerdown", event => {
    if (!wrapper.contains(event.target)) {
      closeSuggestions();
    }
  });
}


/* =====================================================
   INITIALIZE ALL ADMIN FIELDS
===================================================== */

function initializeAutocomplete() {
  addAutocompleteStyles();

  Object.entries(ADMIN_FIELDS).forEach(([field, elementId]) => {
    const input = document.getElementById(elementId);

    if (input) {
      attachAutocomplete(field, input);
    }
  });
}


/* =====================================================
   START
===================================================== */

async function startDioramaSuggestions() {
  initializeAutocomplete();

  try {
    await Promise.all([
      loadProductSuggestions(),
      loadSavedSuggestions()
    ]);
  } catch (error) {
    console.error(
      "Unable to load diorama field suggestions:",
      error
    );
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    startDioramaSuggestions,
    { once: true }
  );
} else {
  startDioramaSuggestions();
}
