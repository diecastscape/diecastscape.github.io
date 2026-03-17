import { db } from "./firebase-init.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp 
} 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// --------------------
// UI TOGGLE
// --------------------
window.toggleOfferCard = function () {
  const card = document.getElementById("offerCard");
  card.classList.toggle("open");
};

// --------------------
// HASH FUNCTION
// --------------------
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// --------------------
// RANDOM STRING
// --------------------
function randomPart(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// --------------------
// GENERATE UNIQUE COUPON
// Example: REEL1-7K4P9M
// --------------------
function generateCoupon(campaignName) {
  return `${campaignName}-${randomPart(6)}`;
}

// --------------------
// SAVE GENERATED COUPON
// --------------------
async function saveGeneratedCoupon(couponCode, campaignId, campaignName) {
  const couponRef = doc(db, "generatedCoupons", couponCode);

  await setDoc(couponRef, {
    couponCode: couponCode,
    campaignId: campaignId,
    campaignName: campaignName,
    used: false,
    createdAt: serverTimestamp()
  });

  return true;
}

// --------------------
// MAIN CHECK FUNCTION
// --------------------
window.checkSecretCode = async function () {
  const input = document.getElementById("secretInput").value.trim().toUpperCase();
  const msg = document.getElementById("offerMsg");
  const content = document.getElementById("offerContent");

  msg.innerText = "";
  content.innerHTML = "";

  if (!input) {
    msg.innerText = "Please enter the secret code";
    return;
  }

  msg.innerText = "Checking...";

  try {
    const campaignId = "reelCampaign1";
    const snap = await getDoc(doc(db, "offers", campaignId));

    if (!snap.exists()) {
      msg.innerText = "Offer unavailable";
      return;
    }

    const data = snap.data();

    if (!data.active) {
      msg.innerText = "Offer expired";
      return;
    }

    if (!data.codeHash || !data.campaignName) {
      msg.innerText = "Offer setup missing";
      return;
    }

    // Optional salt
    const salt = "MY_SECRET_SALT_2026";

    // Hash user input + salt
    const inputHash = await sha256(input + salt);

    if (inputHash !== data.codeHash) {
      msg.innerText = "❌ Code is not right";
      return;
    }

    // Correct code → generate coupon
    const couponCode = generateCoupon(data.campaignName);

    // Save coupon in Firestore
    await saveGeneratedCoupon(couponCode, campaignId, data.campaignName);

    // Show coupon
    msg.innerText = "✅ Code verified";
    showCoupon(couponCode);

  } catch (e) {
    console.error(e);
    msg.innerText = "Error checking code";
  }
};

// --------------------
// SHOW COUPON
// --------------------
function showCoupon(code) {
  const content = document.getElementById("offerContent");

  content.innerHTML = `
    <div id="couponCard" class="coupon-card">
      <h3>🎉 Free Delivery Unlocked</h3>
      <p>Your Coupon Code</p>

      <div class="coupon-code" id="couponText">${code}</div>

      <button class="copy-btn" onclick="copyCoupon()">
        Copy
      </button>

      <p class="coupon-note">
        Apply this code at checkout.
      </p>
    </div>
  `;
}

// --------------------
// COPY COUPON
// --------------------
window.copyCoupon = async function () {
  const el = document.getElementById("couponText");
  if (!el) return;

  const text = el.innerText;

  try {
    await navigator.clipboard.writeText(text);
    alert("Coupon copied");
  } catch (e) {
    alert("Could not copy coupon");
  }
};
