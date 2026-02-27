export function isSaleLive(){

  if(window.SALE_CONFIG?.enabled === true){
    return true;
  }

  if(window.SALE_CONFIG?.start){
    const now = new Date();
    const start = new Date(window.SALE_CONFIG.start);
    return now >= start;
  }

  return false;
}
import { db } from "./firebase-init.js";
import { doc, getDoc } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function isSaleLive(){

  const ref = doc(db,"siteConfig","sale");
  const snap = await getDoc(ref);

  if(!snap.exists()) return false;

  const cfg = snap.data();

  if(cfg.enabled === true) return true;

  if(cfg.start){
    return new Date() >= new Date(cfg.start);
  }

  return false;
}
