import {getFirebaseContext,jsonResponse} from "../../../_lib/firebase-rest.js";
import {releaseAccessoryReservation} from "../../../_lib/accessory-reservations.js";

export async function onRequestPost({request,env}) {
  try {
    const body=await request.json();
    const recordId=String(body?.paymentRecordId||"");
    if(!/^DSA[A-F0-9]{24}$/.test(recordId))
      return jsonResponse({ok:false,error:"Invalid payment session."},400);
    const firebase=await getFirebaseContext(env);
    const released=await releaseAccessoryReservation(firebase,recordId,"cancelled");
    return jsonResponse({ok:true,released});
  } catch(error) {
    console.error("Accessories reservation cancellation failed:",String(error?.message||error));
    return jsonResponse({ok:false,error:"Unable to release this reservation right now."},500);
  }
}
export async function onRequestGet() {
  return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);
}
