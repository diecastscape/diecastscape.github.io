import { auth } from "../firebase-init.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const VAPID_PUBLIC_KEY = "BOCXTZg8PFcXSCuL4zKJ-SbZ_TrrMI3m8cbWwNRas7K7DluV21sdC7-WH8nwMgy3Rgix-luYtOv_uedUAITgpek";
const button = document.getElementById("enableAdminNotifications");
const testButton = document.getElementById("sendAdminTestNotification");
const localTestButton = document.getElementById("testLocalAdminNotification");
const status = document.getElementById("adminNotificationStatus");
let foregroundListenerRegistered = false;

function showStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? "#b42318" : "#16803c";
}
async function saveToken(token, user) {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/admin/push-token", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + idToken },
    body: JSON.stringify({ token })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "Could not save this browser.");
}
button?.addEventListener("click", async () => {
  button.disabled = true;
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Please log in to the admin dashboard again.");
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !(await isSupported())) {
      throw new Error("This browser does not support web push notifications.");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notifications are blocked. Allow them in your browser settings.");
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const app = getApps()[0] || initializeApp({
      apiKey: "AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs",
      authDomain: "diecastscape.firebaseapp.com",
      projectId: "diecastscape",
      storageBucket: "diecastscape.firebasestorage.app",
      messagingSenderId: "701890525745",
      appId: "1:701890525745:web:b0a46856995c7f5eb73310"
    });
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: registration });
    if (!token) throw new Error("Firebase did not return a browser notification token.");
    await saveToken(token, user);

    if (!foregroundListenerRegistered) {
      onMessage(messaging, payload => {
        const title = payload.data?.title || payload.notification?.title || "Diecast.scape Admin";
        const body = payload.data?.body || payload.notification?.body || "New Accessories order update.";
        registration.showNotification(title, {
          body,
          icon: "/favicon/favicon-96x96.png",
          badge: "/favicon/favicon-96x96.png",
          data: { url: payload.data?.url || "/admin/dashboard.html#accessoriesOrders" },
          tag: payload.data?.orderId || "accessories-order"
        }).then(() => {
          showStatus("Message received; browser accepted the notification request.");
        }).catch(error => {
          console.error("Could not display foreground notification:", error);
          showStatus("Browser could not display notification: " + (error.message || "unknown error"), true);
        });
      });
      foregroundListenerRegistered = true;
    }
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
    if (!user) throw new Error("Please log in to the admin dashboard again.");
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
