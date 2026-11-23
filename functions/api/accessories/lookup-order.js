import {getFirebaseContext,firestoreGet,firestoreCommit,firestoreFields,jsonResponse} from "../../../_lib/firebase-rest.js";
async function sha256(value){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");}
function safeItem(item){
 const isCombo=Boolean(item.isCombo);
 const pack=item.packQuantity??item.piecesPerSet??null;
 return {
  productName:String(item.productName||item.name||"Accessory"),
  subtitle:String(item.subtitle||""),
  selectedQuantity:Number(item.selectedQuantity??item.quantity)||0,
  packQuantity:isCombo||pack===null?null:Number(pack)||0,
  packLabel:String(item.packLabel||(isCombo?"Combo set":pack?String(pack)+" pieces/set":"")),
  unitPrice:Number(item.unitPrice)||0,
  lineTotal:Number(item.lineTotal??item.subtotal)||0
 };
}
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
  let order=await firestoreGet(firebase,"Orders/"+orderId);
  let fields=order?.fields||null;
  let customer=fields?.customer||{};
  let legacy=null;

  // Preserve tracking access for historical Accessories orders stored in the
  // original private orderCustomers + public bookedOrders collections.
  if(!order) {
    const [oldCustomer,oldPublic]=await Promise.all([
      firestoreGet(firebase,"orderCustomers/"+orderId),
      firestoreGet(firebase,"bookedOrders/"+orderId)
    ]);
    const oldFields=oldCustomer?.fields||{};
    const oldPhone=String(oldFields.phone||oldFields.deliveryDetails?.phone||oldFields.customer?.phone||"");
    if(!oldCustomer||oldPhone!==phone)
      return jsonResponse({ok:false,error:"We couldn't find an order matching those details. Check your Order ID and phone number."},404);
    legacy=oldPublic;
    const oldStatus=String(oldPublic?.fields.status||"Pending");
    const oldStages={"Pending":1,"Next in Work":1,"In Progress":2,"Ready to Pack":2,"Packing":2,"Ready to Dispatch":3,"Dispatched":4};
    const oldStage=oldStages[oldStatus]||1;
    const oldProducts=Array.isArray(oldFields.products)?oldFields.products:
      Array.isArray(oldPublic?.fields.products)?oldPublic.fields.products:[];
    const oldSubtotal=Number(oldFields.productTotal)||0;
    const oldShipping=Number(oldFields.shipping)||0;
    fields={
      orderId,orderType:"Accessories",bookedAt:oldFields.confirmedAt||oldFields.createdAt||oldPublic?.fields.bookedDate||null,
      expectedDispatchDate:String(oldFields.estimatedDispatchDate||oldPublic?.fields.estimatedDispatchDate||oldPublic?.fields.shippingDate||""),
      progress:oldStage===4?"Dispatched":oldStage===3?"Ready to Dispatch":oldStage===2?"In Packing":"Order Confirmed",
      progressStage:oldStage,progressHistory:[],
      customer:{name:String(oldFields.name||oldFields.deliveryDetails?.name||"")},
      items:oldProducts.map(item=>({
        ...item,productName:item.productName||item.name,
        selectedQuantity:item.selectedQuantity??item.quantity,
        packQuantity:item.isCombo?null:(item.packQuantity??item.piecesPerSet??null),
        lineTotal:item.lineTotal??item.subtotal
      })),
      paymentStatus:String(oldFields.paymentStatus||"recorded"),
      subtotal:oldSubtotal,shipping:oldShipping,
      grandTotal:Number(oldFields.orderTotal)||oldSubtotal+oldShipping,
      trackingId:String(oldPublic?.fields.trackingId||oldFields.trackingId||""),
      dispatchedAt:oldPublic?.fields.dispatchedDate||oldFields.dispatchedAt||null
    };
    customer=fields.customer;
  } else if(String(customer.phoneNumber||"")!==phone) {
    return jsonResponse({ok:false,error:"We couldn't find an order matching those details. Check your Order ID and phone number."},404);
  }

  legacy=legacy||await firestoreGet(firebase,"bookedOrders/"+orderId);
  const legacyStatus=String(legacy?.fields.status||"");
  const stages={"Pending":1,"Next in Work":1,"In Progress":2,"Ready to Pack":2,"Packing":2,"Ready to Dispatch":3,"Dispatched":4};
  const progressStage=stages[legacyStatus]||Number(fields.progressStage)||1;
  const progress=progressStage===4?"Dispatched":progressStage===3?"Ready to Dispatch":progressStage===2?"In Packing":String(fields.progress||"Order Confirmed");
  const trackingId=legacy?.fields.trackingId||fields.trackingId||"",dispatched=progressStage===4;
  return jsonResponse({ok:true,order:{orderId:String(fields.orderId||orderId),orderType:String(fields.orderType||"Accessories"),bookedAt:fields.bookedAt||null,expectedDispatchDate:String(fields.expectedDispatchDate||""),progress,progressStage,progressHistory:Array.isArray(fields.progressHistory)?fields.progressHistory.slice(-4):[],customer:{name:String(customer.name||"")},items:Array.isArray(fields.items)?fields.items.map(safeItem):[],paymentStatus:String(fields.paymentStatus||""),subtotal:Number(fields.subtotal)||0,shipping:Number(fields.shipping)||0,grandTotal:Number(fields.grandTotal)||0,trackingId:dispatched?String(trackingId):"",dispatchedAt:dispatched?(legacy?.fields.dispatchedDate||fields.dispatchedAt||null):null}});
 }catch(error){console.error("Your Orders lookup failed:",String(error?.message||error));return jsonResponse({ok:false,error:"Unable to look up your order right now. Please try again later."},500);}
}
export async function onRequestGet(){return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);}
