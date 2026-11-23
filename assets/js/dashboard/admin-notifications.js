import { auth } from "../firebase-init.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const VAPID_PUBLIC_KEY = "BOCXTZg8PFcXSCuL4zKJ-SbZ_TrrMI3m8cbWwNRas7K7DluV21sdC7-WH8nwMgy3Rgix-luYtOv_uedUAITgpek";
const button = document.getElementById("enableAdminNotifications");
const status = document.getElementById("adminNotificationStatus");

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
    onMessage(messaging, payload => {
      const title = payload.notification?.title || "Diecast.scape Admin";
      const body = payload.notification?.body || "New Accessories order update.";
      showStatus(title + " — " + body);
    });
    showStatus("Notifications enabled on this browser.");
  } catch (error) {
    console.error("Admin push setup:", error);
    showStatus(error.message || "Could not enable notifications.", true);
  } finally {
    button.disabled = false;
  }
});
