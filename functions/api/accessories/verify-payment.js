import {getFirebaseContext,firestoreGet,firestoreBegin,firestoreBatchGet,firestoreCommit,firestoreFields,firestoreListCollection,jsonResponse} from "../../_lib/firebase-rest.js";

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
function dispatchThursday() {
 const ist=new Date(Date.now()+19800000);
 const days=(4-ist.getUTCDay()+7)%7||7;
 ist.setUTCDate(ist.getUTCDate()+days);
 return ist.toISOString().slice(0,10);
}
function displayDate(iso) {
 const p=iso.split("-");
 return p[2]+"/"+p[1]+"/"+p[0];
}
export async function onRequestPost({request,env}) {
 let stage="request_parse";
 try {
  const body=await request.json();
  stage="input_validation";
  const orderId=String(body.razorpay_order_id||""), paymentId=String(body.razorpay_payment_id||""),
   signature=String(body.razorpay_signature||""), recordId=String(body.paymentRecordId||"");
  if(!/^order_[A-Za-z0-9]+$/.test(orderId)||!/^pay_[A-Za-z0-9]+$/.test(paymentId)||
     !/^DSA[A-F0-9]{24}$/.test(recordId)||!/^[a-f0-9]{64}$/i.test(signature))
   return jsonResponse({error:"Payment verification details are invalid."},400);
  stage="signature_verification";
  const expected=await hmacHex(env.RAZORPAY_KEY_SECRET,orderId+"|"+paymentId);
  if(!equal(expected,signature.toLowerCase())) return jsonResponse({error:"Payment signature verification failed."},400);
  stage="razorpay_payment_lookup";
  const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
  const pr=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{headers:{authorization:auth}});
  const payment=await pr.json();
  if(!pr.ok||payment.order_id!==orderId||payment.status!=="captured")
   return jsonResponse({error:"Razorpay has not confirmed a captured payment yet."},409);
  stage="firebase_authentication";
  const firebase=await getFirebaseContext(env), recordPath="onlinePaymentOrders/"+recordId;
  stage="payment_record_read";
  const current=await firestoreGet(firebase,recordPath);
  if(!current||current.fields.razorpayOrderId!==orderId) return jsonResponse({error:"Payment order could not be found."},404);
  if(Number(payment.amount)!==Number(current.fields.amountPaise)) return jsonResponse({error:"Captured amount does not match the order total."},409);
  if(current.fields.paymentStatus==="paid") return jsonResponse({ok:true,status:"paid",orderId:current.fields.storeOrderId,message:"Payment already verified."});
  if(current.fields.paymentStatus==="paid_stock_issue") return jsonResponse({ok:false,status:"paid_stock_issue",message:"Payment received, but stock needs manual review. Please contact us."},409);

  stage="order_counter_check";
  const counterPath="bookedOrderCounters/accessoryOrderIdSequence";
  const counterPrecheck=await firestoreGet(firebase,counterPath);
  let highestExisting=1000;
  if(!counterPrecheck) {
   const existingOrders=await firestoreListCollection(firebase,"bookedOrders");
   for(const order of existingOrders) {
    const match=String(order.fields.orderId||"").match(/^DS-A(\d+)$/i);
    if(match) highestExisting=Math.max(highestExisting,Number(match[1])||1000);
   }
  }
  stage="firestore_transaction_begin";
  const transaction=await firestoreBegin(firebase);
  const items=current.fields.items||[];
  const productPaths=items.map(item=>"accessoriesProducts/"+encodeURIComponent(item.productId));
  const paths=[recordPath,counterPath,...productPaths];
  stage="firestore_transaction_read";
  const docs=await firestoreBatchGet(firebase,paths,transaction);
  const record=docs.get(firebase.base+"/"+recordPath);
  if(!record) throw new Error("Payment order disappeared during verification.");
  if(record.fields.paymentStatus==="paid") {
   await firestoreCommit(firebase,transaction,[]);
   return jsonResponse({ok:true,status:"paid",orderId:record.fields.storeOrderId,message:"Payment already verified."});
  }
  stage="stock_validation";
  let stockIssue=false;
  const stockPlan=[];
  for(const item of items) {
   const path="accessoriesProducts/"+encodeURIComponent(item.productId);
   const doc=docs.get(firebase.base+"/"+path);
   const stock=Number(doc&&doc.fields.stock), units=Number(item.qty)*Number(item.packSize);
   if(!doc||doc.fields.active!==true||!Number.isInteger(stock)||!Number.isInteger(units)||units<1||stock<units) {
    stockIssue=true; break;
   }
   stockPlan.push({doc,stockBefore:stock,units,stockAfter:stock-units,item});
  }
  const counter=docs.get(firebase.base+"/"+counterPath);
  const previous=counter?Math.max(1000,Number(counter.fields.lastNumber)||1000):highestExisting;
  const next=previous+1;
  const storeOrderId="DS-A"+next;
  const now=new Date(), istNow=new Date(Date.now()+19800000), dispatchISO=dispatchThursday(), bookedDate=displayDate(istNow.toISOString().slice(0,10));
  const customer=record.fields.customer||{};
  const customerDetails=[
   "Name: "+String(customer.name||"Not provided"),
   "Address: "+String(customer.address||"Not provided"),
   "Post Office Name: "+String(customer.postOffice||"Not provided"),
   "Pincode: "+String(customer.pincode||"Not provided"),
   "Phone: "+String(customer.phone||"Not provided")
  ].join("\n");
  const savedProducts=items.map(item=>({
   name:item.name,quantity:item.qty,productCode:item.productCode,
   checkoutCode:item.productCode+String(item.qty).padStart(2,"0"),
   isCombo:false,piecesPerSet:item.packSize,piecesDeducted:item.qty*item.packSize,
   unitPrice:item.unitPrice,lineTotal:item.subtotal
  }));
  const publicProducts=savedProducts.map(item=>({name:item.name,quantity:item.quantity}));
  const deductions=stockPlan.map(x=>({
   productId:x.item.productId,productCode:x.item.productCode,productName:x.item.name,
   stockBefore:x.stockBefore,piecesDeducted:x.units,stockAfter:x.stockAfter
  }));
  const totalPieces=deductions.reduce((sum,x)=>sum+x.piecesDeducted,0);
  const writes=[];
  if(!stockIssue) for(const x of stockPlan) {
   writes.push({update:{name:x.doc.name,fields:firestoreFields({stock:x.stockAfter,stockUpdatedAt:{__timestamp:now.toISOString()}})},updateMask:{fieldPaths:["stock","stockUpdatedAt"]},currentDocument:{updateTime:x.doc.updateTime}});
  }
  const resourceBase=firebase.base.replace("https://firestore.googleapis.com/v1/","");
  const counterName=resourceBase+"/"+counterPath;
  writes.push({
   update:{name:counterName,fields:firestoreFields({lastNumber:next,updatedAt:{__timestamp:now.toISOString()}})},
   updateMask:{fieldPaths:["lastNumber","updatedAt"]},
   currentDocument:counter?{updateTime:counter.updateTime}:{exists:false}
  });
  const publicName=resourceBase+"/bookedOrders/"+storeOrderId;
  const privateName=resourceBase+"/orderCustomers/"+storeOrderId;
  writes.push({update:{name:publicName,fields:firestoreFields({
   orderId:storeOrderId,bookedDate,confirmedAt:{__timestamp:now.toISOString()},
   design:"Accessories Order",products:publicProducts,shippingDate:displayDate(dispatchISO),
   estimatedDispatchDate:dispatchISO,status:stockIssue?"Pending":"Ready to Pack",dispatchedDate:"",hidden:false
  })},currentDocument:{exists:false}});
  writes.push({update:{name:privateName,fields:firestoreFields({
   orderId:storeOrderId,orderType:"Accessories",bookedDate,confirmedAt:{__timestamp:now.toISOString()},
   estimatedDispatchDate:dispatchISO,products:savedProducts,
   productTotal:record.fields.productTotal,shipping:record.fields.shipping,orderTotal:record.fields.total,
   totalPiecesDeducted:stockIssue?0:totalPieces,stockDeductions:stockIssue?[]:deductions,comboStockUpdates:[],
   stockReviewRequired:stockIssue,
   name:String(customer.name||""),address:String(customer.address||""),
   postOffice:String(customer.postOffice||""),postOfficeName:String(customer.postOffice||""),
   pincode:String(customer.pincode||""),phone:String(customer.phone||""),
   customerDetails,deliveryDetails:{
    name:String(customer.name||""),address:String(customer.address||""),
    postOffice:String(customer.postOffice||""),postOfficeName:String(customer.postOffice||""),
    pincode:String(customer.pincode||""),phone:String(customer.phone||"")
   },
   paymentMethod:"Razorpay",paymentStatus:stockIssue?"paid_stock_issue":"paid",razorpayPaymentId:paymentId,
   createdAt:{__timestamp:now.toISOString()},updatedAt:{__timestamp:now.toISOString()},
   customer:record.fields.customer
  })},currentDocument:{exists:false}});
  writes.push({update:{name:record.name,fields:firestoreFields({
   status:stockIssue?"paid_stock_issue":"paid",paymentStatus:stockIssue?"paid_stock_issue":"paid",razorpayPaymentId:paymentId,
   paymentVerifiedAt:{__timestamp:now.toISOString()},storeOrderId
  })},updateMask:{fieldPaths:["status","paymentStatus","razorpayPaymentId","paymentVerifiedAt","storeOrderId"]},currentDocument:{updateTime:record.updateTime}});
  stage="firestore_transaction_commit";
  await firestoreCommit(firebase,transaction,writes);
  stage="completed";
  if(stockIssue) return jsonResponse({ok:false,status:"paid_stock_issue",orderId:storeOrderId,message:"Payment received. Your order has been recorded, but stock needs manual review. We will contact you shortly."},409);
  return jsonResponse({ok:true,status:"paid",orderId:storeOrderId,message:"Payment verified. Your order is confirmed."});
 } catch(error) {
  console.error("Accessories verify-payment error:",{stage,message:String(error&&error.message||error)});
  const rawMessage=String(error&&error.message||"");
  const safeDetail=stage==="firestore_transaction_commit" && rawMessage.startsWith("Firestore commit failed:") ? rawMessage.replace(/[\r\n]+/g," ").slice(0,500) : "";
  return jsonResponse({error:"Unable to verify payment right now. Please do not pay again; contact us if money was deducted.",diagnosticStage:stage,diagnosticDetail:safeDetail||undefined},500);
 }
}
