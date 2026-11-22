import {getFirebaseContext,firestoreGet,firestoreBatchGet,jsonResponse} from "../../_lib/firebase-rest.js";

export async function onRequestGet({request,env}) {
 try {
  const url=new URL(request.url);
  const paymentId=String(url.searchParams.get("paymentId")||"");
  const recordId=String(url.searchParams.get("recordId")||"");
  if(!/^pay_[A-Za-z0-9]+$/.test(paymentId)||!/^DSA[A-F0-9]{24}$/.test(recordId))
   return jsonResponse({ok:false,error:"Invalid diagnostic identifiers."},400);
  if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET)
   return jsonResponse({ok:false,error:"Payment gateway configuration is missing."},503);
  const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
  const pr=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{authorization:auth}});
  const payment=await pr.json();
  if(!pr.ok)
   return jsonResponse({ok:false,error:"Razorpay payment lookup failed.",razorpayHttpStatus:pr.status,razorpayErrorCode:String(payment&&payment.error&&payment.error.code||"UNKNOWN"),razorpayErrorField:String(payment&&payment.error&&payment.error.field||""),razorpayErrorDescription:String(payment&&payment.error&&payment.error.description||"No description returned")},502);
  if(payment.status!=="captured")
   return jsonResponse({ok:false,error:"Razorpay returned a payment status other than captured.",razorpayHttpStatus:pr.status,razorpayStatus:String(payment.status||"UNKNOWN"),razorpayOrderId:String(payment.order_id||"")},409);
  const firebase=await getFirebaseContext(env);
  const record=await firestoreGet(firebase,"onlinePaymentOrders/"+recordId);
  if(!record) return jsonResponse({ok:false,error:"Payment record not found."},404);
  if(record.fields.razorpayOrderId!==payment.order_id||Number(record.fields.amountPaise)!==Number(payment.amount))
   return jsonResponse({ok:false,error:"Payment and Firestore record do not match."},409);
  const items=Array.isArray(record.fields.items)?record.fields.items:[];
  const paths=["onlinePaymentOrders/"+recordId,"bookedOrderCounters/accessoryOrderIdSequence",...items.map(item=>"accessoriesProducts/"+encodeURIComponent(item.productId))];
  try {
   const docs=await firestoreBatchGet(firebase,paths);
   return jsonResponse({ok:true,paymentStatus:payment.status,recordStatus:record.fields.paymentStatus,amountPaise:payment.amount,readTest:"batchGet_without_transaction_succeeded",documentsFound:docs.size,documentsRequested:paths.length});
  } catch(error) {
   return jsonResponse({ok:false,paymentStatus:payment.status,recordStatus:record.fields.paymentStatus,readTest:"batchGet_without_transaction_failed",diagnosticDetail:String(error&&error.message||error)});
  }
 } catch(error) {
  console.error("Accessories payment diagnostic failed:",String(error&&error.message||error));
  return jsonResponse({ok:false,error:"Diagnostic request failed. Check Cloudflare function logs."},500);
 }
}
