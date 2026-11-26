import { jsonResponse } from "../../_lib/firebase-rest.js";
import { sendAdminTestPushNotification } from "../../_lib/admin-push.js";

const ADMIN_UID = "urSr9gyhwBMKBSmxKC5LRRnKW1P2";
const FIREBASE_API_KEY = "AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs";

async function verifyAdmin(request) {
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  const response = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: token })
  });
  if (!response.ok) return false;
  const data = await response.json();
  return data.users?.some(user => user.localId === ADMIN_UID) === true;
}

export async function onRequestPost({ request, env }) {
  try {
    if (!await verifyAdmin(request)) {
      return jsonResponse({ ok: false, error: "Admin authorization required." }, 401);
    }
    const result = await sendAdminTestPushNotification(env);
    if (!result.total) {
      return jsonResponse({ ok: false, error: "No registered notification devices found. Enable notifications first." }, 404);
    }
    if (!result.sent) {
      return jsonResponse({ ok: false, error: "Firebase could not deliver the test notification. Please re-enable notifications on this browser." }, 502);
    }
    return jsonResponse({ ok: true, sent: result.sent, total: result.total });
  } catch (error) {
    console.error("Admin test push:", String(error?.message || error));
    return jsonResponse({ ok: false, error: "Could not send the test notification." }, 500);
  }
}

export async function onRequestGet() {
  return jsonResponse({ ok: false, error: "Method Not Allowed", allowedMethod: "POST" }, 405);
}
