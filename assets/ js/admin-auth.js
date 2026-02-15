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
      document.getElementById("msg").innerText = "Invalid email or password";
    });
};

// AUTH STATE CHECK
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;

  if (!user && path.includes("/admin/dashboard")) {
    window.location.href = "/admin/login.html";
  }

  if (user && path.includes("/admin/login")) {
    window.location.href = "/admin/dashboard.html";
  }
});

// LOGOUT
window.adminLogout = function () {
  signOut(auth).then(() => {
    window.location.href = "/admin/login.html";
  });
};
