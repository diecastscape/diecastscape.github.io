
import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

window.adminLogin = function () {
  const email = document.getElementById("admin-email").value;
  const pass = document.getElementById("admin-password").value;
  const loader = document.getElementById("loginLoader");
  const btn = document.getElementById("loginBtn");

  loader.classList.add("show");
  btn.disabled = true;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {
      loader.classList.remove("show");
      btn.disabled = false;
      document.getElementById("msg").innerText = "Invalid email or password";
    });
};
onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;
  const body = document.body;
  if (path.includes("/admin/login")) {
    body.classList.remove("auth-loading");
    if (user) {
      window.location.replace("/admin/dashboard.html");
    }
    return;
  }
  if (path.includes("/admin/dashboard")) {
    if (!user) {
      window.location.replace("/admin/login.html");
      return;
    }
    body.classList.remove("auth-loading");
  }
});

// ✅ LOGOUT
window.adminLogout = function () {
  const loader = document.getElementById("logoutLoader");
  const btn = document.getElementById("logoutBtn");

  if(loader){
    loader.classList.add("show");
    btn.disabled = true;
  }

  signOut(auth).then(() => {
    window.location.replace("/admin/login.html");
  });
};

