import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// LOGIN
window.adminLogin = function () {
  const email = document.getElementById("admin-email").value;
  const pass = document.getElementById("admin-password").value;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {
      alert("Login failed");
    });
};

// CHECK LOGIN
onAuthStateChanged(auth, (user) => {
  if (!user && window.location.pathname.includes("/admin/")) {
    window.location.href = "/admin/login.html";
  }
});

// LOGOUT
window.adminLogout = function () {
  signOut(auth).then(() => {
    window.location.href = "/admin/login.html";
  });
};

