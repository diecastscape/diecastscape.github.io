importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs",
  authDomain: "diecastscape.firebaseapp.com",
  projectId: "diecastscape",
  storageBucket: "diecastscape.firebasestorage.app",
  messagingSenderId: "701890525745",
  appId: "1:701890525745:web:b0a46856995c7f5eb73310"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "New Accessories Order";
  const options = {
    body: payload.notification?.body || "A new paid Accessories order has been confirmed.",
    icon: "/favicon/favicon-96x96.png",
    badge: "/favicon/favicon-96x96.png",
    data: { url: payload.data?.url || "/admin/dashboard.html#accessoriesOrders" },
    tag: payload.data?.orderId || "accessories-order",
    renotify: true
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/admin/dashboard.html#accessoriesOrders", self.location.origin).href;
  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow(target);
  })());
});
