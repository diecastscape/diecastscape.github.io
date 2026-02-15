import { auth } from "./firebase-init.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

window.adminLogin = function () {
  const email = document.getElementById("admin-email").value;
  const pass = document.getElementById("admin-password").value;
  const loader = document.getElementById("loginLoader");
  const btn = document.getElementById("loginBtn");

  loader.style.display = "block";
  btn.disabled = true;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => {
      window.location.href = "/admin/dashboard.html";
    })
    .catch(() => {
      loader.style.display = "none";
      btn.disabled = false;
      document.getElementById("msg").innerText = "Invalid email or password";
    });
};

onAuthStateChanged(auth, (user) => {
  const path = window.location.pathname;

  if (!user && path.includes("/admin/dashboard")) {
    window.location.href = "/admin/login.html";
  }

  if (user && path.includes("/admin/login")) {
    window.location.href = "/admin/dashboard.html";
  }
});

window.adminLogout = function () {
  const loader = document.getElementById("logoutLoader");
  const btn = document.getElementById("logoutBtn");

  if(loader){
    loader.style.display = "block";
    btn.disabled = true;
  }

  signOut(auth).then(() => {
    window.location.href = "/admin/login.html";
  });
};
