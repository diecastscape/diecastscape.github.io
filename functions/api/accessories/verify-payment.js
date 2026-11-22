import {getFirebaseContext,firestoreGet,firestoreBegin,firestoreBatchGet,firestoreCommit,firestoreFields,jsonResponse} from "../../_lib/firebase-rest.js";

async function hmacHex(secret,message) {
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));
 return Array.from(new Uint8Array(sig),b=>b.toString(16).padStart(2,"0")).join("");
}
function equal(a,b) {
 if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length) return false;
 let diff=0; for(let i=0;i<a.length;i++) diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
export async function onRequestPost({request,env}) {
 try {
  const body=await request.json();
  const orderId=String(body.razorpay_order_id||""), paymentId=String(body.razorpay_payment_id||""),
   signature=String(body.razorpay_signature||""), recordId=String(body.paymentRecordId||"");
  if(!/^order_[A-Za-z0-9]+$/.test(orderId)||!/^pay_[A-Za-z0-9]+$/.test(paymentId)||
     !/^DSA[A-F0-9]{24}$/.test(recordId)||!/^[a-f0-9]{64}$/i.test(signature))
   return jsonResponse({error:"Payment verification details are invalid."},400);
  const expected=await hmacHex(env.RAZORPAY_KEY_SECRET,orderId+"|"+paymentId);
  if(!equal(expected,signature.toLowerCase())) return jsonResponse({error:"Payment signature verification failed."},400);
  const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
  const pr=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{authorization:auth}});
  const payment=await pr.json();
  if(!pr.ok||payment.order_id!==orderId||payment.status!=="captured")
   return jsonResponse({error:"Razorpay has not confirmed a captured payment yet."},409);
  const firebase=await getFirebaseContext(env), recordPath="onlinePaymentOrders/"+recordId;
  const current=await firestoreGet(firebase,recordPath);
  if(!current||current.fields.razorpayOrderId!==orderId) return jsonResponse({error:"Payment order could not be found."},404);
  if(Number(payment.amount)!==Number(current.fields.amountPaise)) return jsonResponse({error:"Captured amount does not match the order total."},409);
  if(current.fields.paymentStatus==="paid") return jsonResponse({ok:true,status:"paid",message:"Payment already verified."});
  if(current.fields.paymentStatus==="paid_stock_issue") return jsonResponse({ok:false,status:"paid_stock_issue",message:"Payment received, but stock needs manual review. Please contact us."},409);

  const transaction=await firestoreBegin(firebase);
  const items=current.fields.items||[];
  const paths=[recordPath,...items.map(item=>"accessoriesProducts/"+encodeURIComponent(item.productId))];
  const docs=await firestoreBatchGet(firebase,paths,transaction);
  const record=docs.get(firebase.base+"/"+recordPath);
  if(!record) throw new Error("Payment order disappeared during verification.");
  if(record.fields.paymentStatus==="paid") {
   await firestoreCommit(firebase,transaction,[]);
   return jsonResponse({ok:true,status:"paid",message:"Payment already verified."});
  }
  let issue=false; const stockWrites=[];
  for(const item of items) {
   const path="accessoriesProducts/"+encodeURIComponent(item.productId);
   const doc=docs.get(firebase.base+"/"+path);
   const stock=Number(doc&&doc.fields.stock), units=Number(item.qty)*Number(item.packSize);
   if(!doc||doc.fields.active!==true||!Number.isInteger(stock)||!Number.isInteger(units)||units<1||stock<units) {
    issue=true; break;
   }
   stockWrites.push({update:{name:doc.name,fields:firestoreFields({stock:stock-units})},updateMask:{fieldPaths:["stock"]},currentDocument:{updateTime:doc.updateTime}});
  }
  const status=issue?"paid_stock_issue":"paid";
  const writes=issue?[]:stockWrites;
  writes.push({update:{name:record.name,fields:firestoreFields({
   status:status,paymentStatus:status,razorpayPaymentId:paymentId,
   paymentVerifiedAt:{__timestamp:new Date().toISOString()}
  })},updateMask:{fieldPaths:["status","paymentStatus","razorpayPaymentId","paymentVerifiedAt"]},currentDocument:{updateTime:record.updateTime}});
  await firestoreCommit(firebase,transaction,writes);
  if(issue) return jsonResponse({ok:false,status:"paid_stock_issue",message:"Payment received, but stock needs manual review. Please contact Diecast.scape."},409);
  return jsonResponse({ok:true,status:"paid",message:"Payment verified successfully."});
 } catch(error) {
  console.error("Accessories verify-payment error:",error);
  return jsonResponse({error:"Unable to verify payment right now. Please do not pay again; contact us if money was deducted."},500);
 }
}
