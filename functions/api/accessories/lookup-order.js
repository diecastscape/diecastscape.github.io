import {getFirebaseContext,firestoreGet,firestoreCommit,firestoreFields,jsonResponse} from "../../../_lib/firebase-rest.js";
async function sha256(value){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");}
function safeItem(item){return {productName:String(item.productName||item.name||"Accessory"),subtitle:String(item.subtitle||""),selectedQuantity:Number(item.selectedQuantity??item.quantity)||0,packQuantity:item.packQuantity===null?null:Number(item.packQuantity)||0,packLabel:String(item.packLabel||""),unitPrice:Number(item.unitPrice)||0,lineTotal:Number(item.lineTotal)||0};}
async function rateLimit(firebase,orderId,ip){
 const now=Date.now(),keys=[{id:await sha256("order:"+orderId),limit:5,window:900000},{id:await sha256("ip:"+ip),limit:10,window:3600000}];
 for(let retry=0;retry<3;retry++){
  const docs=await Promise.all(keys.map(k=>firestoreGet(firebase,"orderLookupLimits/"+k.id)));
  const updates=keys.map((key,i)=>{const doc=docs[i],start=Number(doc?.fields.windowStart||0),active=Number.isFinite(start)&&now-start<key.window&&now>=start,count=active?Number(doc.fields.count||0):0;return {key,doc,count};});
  if(updates.some(x=>x.count>=x.key.limit))return {allowed:false,retryAfter:Math.max(1,Math.ceil(Math.max(...updates.map(x=>x.count<x.key.limit?0:(Number(x.doc.fields.windowStart)||now)+x.key.window-now))/1000))};
  const base=firebase.base.replace("https://firestore.googleapis.com/v1/","");
  const writes=updates.map(({key,doc,count})=>({update:{name:base+"/orderLookupLimits/"+key.id,fields:firestoreFields({count:count+1,windowStart:doc&&count?Number(doc.fields.windowStart):now,updatedAt:{__timestamp:new Date(now).toISOString()}})},updateMask:{fieldPaths:["count","windowStart","updatedAt"]},currentDocument:doc?{updateTime:doc.updateTime}:{exists:false}}));
  try{await firestoreCommit(firebase,undefined,writes);return {allowed:true};}catch(error){if(!/ABORTED|FAILED_PRECONDITION|ALREADY_EXISTS|409/i.test(String(error?.message||error))||retry===2)throw error;}
 }
 return {allowed:false,retryAfter:60};
}
export async function onRequestPost({request,env}){
 try{
  const body=await request.json(),orderId=String(body?.orderId||"").trim().toUpperCase(),phone=String(body?.phone||"").replace(/\D/g,"");
  if(!/^DS-A\d{4,}$/.test(orderId)||!/^\d{10}$/.test(phone))return jsonResponse({ok:false,error:"Enter a valid Accessories order ID and 10-digit phone number."},400);
  const ip=String(request.headers.get("CF-Connecting-IP")||"unknown").slice(0,80),firebase=await getFirebaseContext(env);
  const limit=await rateLimit(firebase,orderId,ip);
  if(!limit.allowed)return jsonResponse({ok:false,error:"Too many attempts. Please try again later.",retryAfter:limit.retryAfter},429);
  const order=await firestoreGet(firebase,"Orders/"+orderId),customer=order?.fields.customer||{};
  if(!order||String(customer.phoneNumber||"")!==phone)return jsonResponse({ok:false,error:"We couldn't find an order matching those details. Check your Order ID and phone number."},404);
  const fields=order.fields,legacy=await firestoreGet(firebase,"bookedOrders/"+orderId),legacyStatus=String(legacy?.fields.status||"");
  const stages={"Pending":1,"Next in Work":1,"In Progress":2,"Ready to Pack":2,"Packing":2,"Ready to Dispatch":3,"Dispatched":4};
  const progressStage=stages[legacyStatus]||Number(fields.progressStage)||1;
  const progress=progressStage===4?"Dispatched":progressStage===3?"Ready to Dispatch":progressStage===2?"In Packing":String(fields.progress||"Order Confirmed");
  const trackingId=legacy?.fields.trackingId||fields.trackingId||"",dispatched=progressStage===4;
  return jsonResponse({ok:true,order:{orderId:String(fields.orderId||orderId),orderType:String(fields.orderType||"Accessories"),bookedAt:fields.bookedAt||null,expectedDispatchDate:String(fields.expectedDispatchDate||""),progress,progressStage,progressHistory:Array.isArray(fields.progressHistory)?fields.progressHistory.slice(-4):[],customer:{name:String(customer.name||"")},items:Array.isArray(fields.items)?fields.items.map(safeItem):[],paymentStatus:String(fields.paymentStatus||""),subtotal:Number(fields.subtotal)||0,shipping:Number(fields.shipping)||0,grandTotal:Number(fields.grandTotal)||0,trackingId:dispatched?String(trackingId):"",dispatchedAt:dispatched?(legacy?.fields.dispatchedDate||fields.dispatchedAt||null):null}});
 }catch(error){console.error("Your Orders lookup failed:",String(error?.message||error));return jsonResponse({ok:false,error:"Unable to look up your order right now. Please try again later."},500);}
}
export async function onRequestGet(){return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);}
