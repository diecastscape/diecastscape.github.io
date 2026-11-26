import {
  getFirebaseContext,firestoreGet,firestoreCommit,firestoreFields,jsonResponse
} from "../../../_lib/firebase-rest.js";

async function hmacHex(secret,message){
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature),b=>b.toString(16).padStart(2,"0")).join("");
}
function constantTimeEqual(a,b){
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
  let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
function validCustomer(c){
  return c&&typeof c.name==="string"&&c.name.trim().length>=2&&
    typeof c.phone==="string"&&/^\d{10}$/.test(c.phone)&&
    typeof c.address==="string"&&c.address.trim().length>=5&&
    typeof c.city==="string"&&c.city.trim().length>=2&&
    typeof c.state==="string"&&c.state.trim().length>=2&&
    typeof c.postOffice==="string"&&c.postOffice.trim().length>=2&&
    typeof c.pincode==="string"&&/^\d{6}$/.test(c.pincode);
}
export async function onRequestPost({request,env}){
 try{
  const body=await request.json();
  const orderId=String(body?.razorpay_order_id||""),paymentId=String(body?.razorpay_payment_id||"");
  const signature=String(body?.razorpay_signature||""),recordId=String(body?.paymentRecordId||"");
  const customer=body?.customer||{};
  if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET||
     !/^order_[A-Za-z0-9]+$/.test(orderId)||!/^pay_[A-Za-z0-9]+$/.test(paymentId)||
     !/^DSA[A-F0-9]{24}$/.test(recordId)||!/^[a-f0-9]{64}$/i.test(signature)||!validCustomer(customer))
    return jsonResponse({ok:false,error:"Pending payment report details are invalid."},400);
  const expected=await hmacHex(env.RAZORPAY_KEY_SECRET,orderId+"|"+paymentId);
  if(!constantTimeEqual(expected,signature.toLowerCase()))
    return jsonResponse({ok:false,error:"Payment signature could not be verified."},400);
  const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
  const gatewayResponse=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{authorization:auth}});
  const payment=await gatewayResponse.json();
  if(!gatewayResponse.ok||payment.order_id!==orderId||payment.status!=="captured")
    return jsonResponse({ok:false,error:"Razorpay has not confirmed this payment as captured."},409);
  const firebase=await getFirebaseContext(env);
  const paymentRecord=await firestoreGet(firebase,"onlinePaymentOrders/"+recordId);
  if(!paymentRecord||paymentRecord.fields.razorpayOrderId!==orderId||
     Number(payment.amount)!==Number(paymentRecord.fields.amountPaise)||
     payment.currency!=="INR"||paymentRecord.fields.category!=="accessories")
    return jsonResponse({ok:false,error:"Captured payment does not match the saved Accessories payment session."},409);
  const now=new Date().toISOString();
  const path="paymentVerificationIssues/"+recordId;
  const existing=await firestoreGet(firebase,path);
  const fields={
    paymentRecordId:recordId,razorpayOrderId:orderId,paymentId,
    amount:Number(payment.amount)/100,currency:"INR",paymentStatus:"captured",
    customer:{name:customer.name.trim(),phone:customer.phone,address:customer.address.trim(),
      city:customer.city.trim(),state:customer.state.trim(),postOffice:customer.postOffice.trim(),pincode:customer.pincode},
    diagnosticStage:String(body.diagnosticStage||"client_verification").slice(0,80),
    diagnosticDetail:String(body.diagnosticDetail||"Payment verification did not complete on the customer side.").replace(/[\r\n]+/g," ").slice(0,500),
    reportedAt:existing?.fields.reportedAt||now,lastReportedAt:now,
    issueStatus:existing?.fields.issueStatus||"open",
    storeOrderId:paymentRecord.fields.storeOrderId||""
  };
  const resourceBase=firebase.base.replace("https://firestore.googleapis.com/v1/","");
  const writes=[existing?{
    update:{name:existing.name,fields:firestoreFields(fields)},
    updateMask:{fieldPaths:Object.keys(fields)},currentDocument:{updateTime:existing.updateTime}
  }:{
    update:{name:resourceBase+"/"+path,fields:firestoreFields(fields)},
    currentDocument:{exists:false}
  }];
  await firestoreCommit(firebase,undefined,writes);
  return jsonResponse({ok:true,saved:true,paymentStatus:"captured"});
 }catch(error){
  console.error("Pending payment report failed:",String(error?.message||error));
  return jsonResponse({ok:false,error:"Could not save the pending payment report yet."},500);
 }
}
export async function onRequestGet(){return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);}
