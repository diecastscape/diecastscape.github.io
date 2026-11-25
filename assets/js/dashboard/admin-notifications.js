import { auth } from "../firebase-init.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const ADMIN_UID = "urSr9gyhwBMKBSmxKC5LRRnKW1P2";
const VAPID_PUBLIC_KEY = "BOCXTZg8PFcXSCuL4zKJ-SbZ_TrrMI3m8cbWwNRas7K7DluV21sdC7-WH8nwMgy3Rgix-luYtOv_uedUAITgpek";
const button = document.getElementById("enableAdminNotifications");
const testButton = document.getElementById("sendAdminTestNotification");
const status = document.getElementById("adminNotificationStatus");
let foregroundListenerRegistered = false;
let messagingInstance = null;
let serviceWorkerRegistration = null;

function showStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#b42318" : "#16803c";
}
function getMessagingInstance() {
  const app = getApps()[0] || initializeApp({
    apiKey: "AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs",
    authDomain: "diecastscape.firebaseapp.com",
    projectId: "diecastscape",
    storageBucket: "diecastscape.firebasestorage.app",
    messagingSenderId: "701890525745",
    appId: "1:701890525745:web:b0a46856995c7f5eb73310"
  });
  messagingInstance = messagingInstance || getMessaging(app);
  return messagingInstance;
}
async function attachForegroundListener(registration) {
  if (foregroundListenerRegistered || !("Notification" in window) ||
      Notification.permission !== "granted" || !(await isSupported())) return;
  const messaging = getMessagingInstance();
  serviceWorkerRegistration = registration || await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  onMessage(messaging, payload => {
    const title = payload.data?.title || payload.notification?.title || "Diecast.scape Admin";
    const body = payload.data?.body || payload.notification?.body || "New Accessories order update.";
    serviceWorkerRegistration.showNotification(title, {
      body,
      icon: "/favicon/favicon-96x96.png",
      badge: "/favicon/favicon-96x96.png",
      data: { url: payload.data?.url || "/admin/dashboard.html#accessoriesOrders" },
      tag: payload.data?.orderId || "accessories-order"
    }).then(() => {
      showStatus("New order notification received.");
    }).catch(error => {
      console.error("Could not display foreground notification:", error);
      showStatus("Browser could not display notification: " + (error.message || "unknown error"), true);
    });
  });
  foregroundListenerRegistered = true;
}
async function saveToken(token, user) {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/push-token", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + idToken },
    body: JSON.stringify({ token, ownerUid: user.uid })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Could not save this browser.");
}

// Reconnect foreground delivery after a dashboard reload. Permission is never
// requested automatically; the admin must enable it using the button below.
onAuthStateChanged(auth, async user => {
  if (!user || user.uid !== ADMIN_UID || !("Notification" in window) || Notification.permission !== "granted" ||
      !("serviceWorker" in navigator)) return;
  try {
    await attachForegroundListener();
  } catch (error) {
    console.warn("Could not reconnect foreground notifications:", error);
  }
});

button?.addEventListener("click", async () => {
  button.disabled = true;
  try {
    const user = auth.currentUser;
    if (!user || user.uid !== ADMIN_UID) throw new Error("Only the authorized admin account can enable notifications.");
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) {
      throw new Error("This browser does not support web push notifications.");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in your browser settings.");
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessagingInstance();
    const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration });
    if (!token) throw new Error("Firebase did not return a browser notification token.");
    await saveToken(token, user);
    serviceWorkerRegistration = registration;
    await attachForegroundListener(registration);
    showStatus("Notifications enabled on this browser.");
  } catch (error) {
    console.error("Admin push setup:", error);
    showStatus(error.message || "Could not enable notifications.", true);
  } finally {
    button.disabled = false;
  }
});

testButton?.addEventListener("click", async () => {
  testButton.disabled = true;
  try {
    const user = auth.currentUser;
    if (!user || user.uid !== ADMIN_UID) throw new Error("Only the authorized admin account can enable notifications.");
    if (!("Notification" in window) || Notification.permission !== "granted") throw new Error("Please enable browser notifications first.");
    const idToken = await user.getIdToken();
    const response = await fetch("/api/admin/test-push", { method: "POST", headers: { authorization: "Bearer " + idToken } });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Test notification could not be sent.");
    showStatus("Test notification sent (" + result.sent + "). Waiting for browser display.");
  } catch (error) {
    console.error("Admin test notification:", error);
    showStatus(error.message || "Could not send test notification.", true);
  } finally { testButton.disabled = false; }
});
