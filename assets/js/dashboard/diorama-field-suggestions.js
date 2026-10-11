
import { db } from "../firebase-init.js";

import {
  collection,
  getDocs,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ======================================================
// DIORAMA QUICK TYPE SELECT
// Only Quick Specifications + Offer Ribbon
// ======================================================

const FIELD_IDS = {
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

const SUGGESTION_COLLECTION = "dioramaFieldSuggestions";

const suggestionsByField = {};

let suggestionsLoaded = false;


// ======================================================
// STYLES
// ======================================================

function addSuggestionStyles() {
  if (document.getElementById("dioramaQuickTypeStyles")) {
    return;
  }

  const style = document.createElement("style");

  style.id = "dioramaQuickTypeStyles";

  style.textContent = `
    .diorama-quick-type-wrap {
      position: relative;
      width: 100%;
    }

    .diorama-quick-type-menu {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      z-index: 9999;
      display: none;
      max-height: 220px;
      overflow-y: auto;
      background: #ffffff;
      color: #202124;
      border: 1px solid #d7dce2;
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
      padding: 5px;
    }

    .diorama-quick-type-menu.show {
      display: block;
    }

    .diorama-quick-type-option {
      display: block;
      width: 100%;
      padding: 11px 12px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: inherit;
      text-align: left;
      font: inherit;
      font-size: 14px;
      cursor: pointer;
      overflow-wrap: anywhere;
    }

    .diorama-quick-type-option:hover,
    .diorama-quick-type-option:focus-visible {
      background: #e8f8fa;
      outline: none;
    }

    .diorama-quick-type-empty {
      padding: 10px 12px;
      color: #777777;
      font-size: 13px;
    }
  `;

  document.head.appendChild(style);
}


// ======================================================
// ADD A SUGGESTION WITHOUT DUPLICATES
// ======================================================

function addLocalSuggestion(field, value) {
  const cleanValue = String(value ?? "").trim();

  if (!cleanValue) {
    return;
  }

  if (!suggestionsByField[field]) {
    suggestionsByField[field] = [];
  }

  const exists = suggestionsByField[field].some(
    item => item.toLowerCase() === cleanValue.toLowerCase()
  );

  if (!exists) {
    suggestionsByField[field].push(cleanValue);

    suggestionsByField[field].sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
        numeric: true
      })
    );
  }
}


// ======================================================
// LOAD SUGGESTIONS
// From existing Diorama products + saved reusable values
// ======================================================

async function loadSuggestions() {
  try {
    const [productsSnap, savedSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, SUGGESTION_COLLECTION))
    ]);

    // Existing Diorama product values
    productsSnap.forEach(productDoc => {
      const product = productDoc.data();

      Object.entries(FIELD_IDS).forEach(([field, inputId]) => {
        addLocalSuggestion(field, product[field]);
      });
    });

    // Reusable suggestions, including values typed previously
    savedSnap.forEach(suggestionDoc => {
      const data = suggestionDoc.data();

      if (FIELD_IDS[data.field]) {
        addLocalSuggestion(data.field, data.value);
      }
    });

    suggestionsLoaded = true;

  } catch (error) {
    console.error("Could not load Diorama suggestions:", error);
  }
}


// ======================================================
// SAVE A NEW REUSABLE SUGGESTION
// ======================================================

function makeDocumentId(field, value) {
  const normalized = value.trim().toLowerCase();

  // Compact deterministic hash keeps document IDs short.
  let hash = 2166136261;

  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `${field}_${(hash >>> 0).toString(36)}`;
}

async function saveSuggestion(field, value) {
  const cleanValue = String(value ?? "").trim();

  if (!FIELD_IDS[field] || !cleanValue) {
    return;
  }

  // Make it available immediately in the current session.
  addLocalSuggestion(field, cleanValue);

  try {
    const documentId = makeDocumentId(field, cleanValue);

    await setDoc(
      doc(db, SUGGESTION_COLLECTION, documentId),
      {
        field,
        value: cleanValue,
        normalized: cleanValue.toLowerCase(),
        updatedAt: Date.now()
      },
      { merge: true }
    );

  } catch (error) {
    console.error("Could not save Diorama suggestion:", error);
  }
}


// ======================================================
// AUTOCOMPLETE MENU
// ======================================================

function setupQuickType(field, input) {
  if (input.dataset.quickTypeReady === "true") {
    return;
  }

  input.dataset.quickTypeReady = "true";

  const parent = input.parentElement;

  const wrapper = document.createElement("div");
  wrapper.className = "diorama-quick-type-wrap";

  parent.insertBefore(wrapper, input);
  wrapper.appendChild(input);

  const menu = document.createElement("div");
  menu.className = "diorama-quick-type-menu";
  menu.setAttribute("role", "listbox");

  wrapper.appendChild(menu);


  function hideMenu() {
    menu.classList.remove("show");
    menu.innerHTML = "";
  }


  function showSuggestions() {
    const query = input.value.trim().toLowerCase();

    const allValues = suggestionsByField[field] || [];

    // Blank input shows recent alphabetical choices.
    // Typed input filters matching choices.
    const matches = allValues
      .filter(value =>
        !query || value.toLowerCase().includes(query)
      )
      .slice(0, 8);

    menu.innerHTML = "";

    if (matches.length === 0) {
      if (query) {
        const empty = document.createElement("div");
        empty.className = "diorama-quick-type-empty";
        empty.textContent = "No match — keep typing your own value";
        menu.appendChild(empty);
      } else {
        hideMenu();
        return;
      }
    } else {
      matches.forEach(value => {
        const option = document.createElement("button");

        option.type = "button";
        option.className = "diorama-quick-type-option";
        option.setAttribute("role", "option");
        option.textContent = value;

        // Keep the input focused so tapping a suggestion works.
        option.addEventListener("mousedown", event => {
          event.preventDefault();
        });

        option.addEventListener("click", () => {
          input.value = value;
          hideMenu();
          input.dispatchEvent(new Event("change", { bubbles: true }));
        });

        menu.appendChild(option);
      });
    }

    menu.classList.add("show");
  }


  input.addEventListener("focus", showSuggestions);
  input.addEventListener("input", showSuggestions);

  input.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      hideMenu();
    }
  });

  input.addEventListener("blur", () => {
    // Save a custom value for future use.
    const value = input.value.trim();

    if (value) {
      saveSuggestion(field, value);
    }

    hideMenu();
  });

  // Do not change the value while the user is typing.
  // Suggestions only fill the input when tapped.
}


// ======================================================
// INITIALIZE ONLY THE MAIN DIORAMA FORM
// ======================================================

async function initDioramaQuickType() {
  addSuggestionStyles();

  Object.entries(FIELD_IDS).forEach(([field, inputId]) => {
    const input = document.getElementById(inputId);

    if (input) {
      setupQuickType(field, input);
    }
  });

  await loadSuggestions();
}


// This file is loaded at the end of the HTML body.
initDioramaQuickType();
