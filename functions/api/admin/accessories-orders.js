import {getFirebaseContext,firestoreListCollection,firestoreGet,firestoreCommit,firestoreFields,jsonResponse} from "../../_lib/firebase-rest.js";

const ADMIN_UID="urSr9gyhwBMKBSmxKC5LRRnKW1P2";
const FIREBASE_API_KEY="AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs";
const STAGES=["Order Confirmed","In Packing","Ready to Dispatch","Dispatched"];
const LEGACY_STATUS=["Pending","In Progress","Ready to Dispatch","Dispatched"];

async function verifyAdmin(request){
 const header=request.headers.get("Authorization")||"";
 const token=header.startsWith("Bearer ")?header.slice(7):"";
 if(!token)return false;
 const response=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+FIREBASE_API_KEY,{
  method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})
 });
 if(!response.ok)return false;
 const data=await response.json();
 return data.users?.some(user=>user.localId===ADMIN_UID)===true;
}
function safeOrder(doc){
 const f=doc.fields||{},customer=f.customer||{};
 return {
  docId:doc.name.split("/").pop(),orderId:String(f.orderId||""),
  orderType:String(f.orderType||"Accessories"),bookedAt:f.bookedAt||null,
  expectedDispatchDate:String(f.expectedDispatchDate||""),
  progress:String(f.progress||"Order Confirmed"),
  progressStage:f.progressStage===0?0:(Number(f.progressStage)||1),
  customer:{name:String(customer.name||""),address:String(customer.address||""),city:String(customer.city||""),state:String(customer.state||""),postOffice:String(customer.postOffice||""),pincode:String(customer.pincode||""),phoneNumber:String(customer.phoneNumber||"")},
  items:Array.isArray(f.items)?f.items.map(item=>({
   productName:String(item.productName||"Accessory"),subtitle:String(item.subtitle||""),
   selectedQuantity:Number(item.selectedQuantity)||0,
   packQuantity:item.packQuantity===null?null:Number(item.packQuantity)||0,
   packLabel:String(item.packLabel||""),
   unitPrice:Number(item.unitPrice)||0,lineTotal:Number(item.lineTotal)||0
  })):[],
  subtotal:Number(f.subtotal)||0,shipping:Number(f.shipping)||0,grandTotal:Number(f.grandTotal)||0,
  paymentStatus:String(f.paymentStatus||""),razorpayPaymentId:String(f.razorpayPaymentId||""),
  trackingId:String(f.trackingId||""),dispatchedAt:f.dispatchedAt||null
 };
}
export async function onRequestPost({request,env}){
 try{
  if(!await verifyAdmin(request))return jsonResponse({ok:false,error:"Admin authorization required."},401);
  const body=await request.json(),action=String(body.action||"list"),firebase=await getFirebaseContext(env);
  if(action==="list"){
   const docs=await firestoreListCollection(firebase,"Orders");
   const orders=docs.filter(doc=>String(doc.fields?.orderType||"").toLowerCase()==="accessories"||String(doc.fields?.orderId||"").startsWith("DS-A")).map(safeOrder);
   orders.sort((a,b)=>String(b.bookedAt||"").localeCompare(String(a.bookedAt||"")));
   return jsonResponse({ok:true,orders});
  }
  if(action==="update"){
   const orderId=String(body.orderId||"").trim(),stage=Number(body.progressStage),trackingId=String(body.trackingId||"").trim();
   if(!/^DS-A\d{4,}$/.test(orderId)||!Number.isInteger(stage)||stage<1||stage>4)return jsonResponse({ok:false,error:"Invalid order or progress stage."},400);
   if(stage===4&&!trackingId)return jsonResponse({ok:false,error:"Enter the India Post tracking ID before marking this order Dispatched."},400);
   const order=await firestoreGet(firebase,"Orders/"+orderId);
   if(!order)return jsonResponse({ok:false,error:"Order not found."},404);
   const progress=STAGES[stage-1],now=new Date().toISOString();
   const base=firebase.base.replace("https://firestore.googleapis.com/v1/","");
   const orderFields={progress,progressStage:stage,updatedAt:{__timestamp:now}};
   if(stage===4){orderFields.trackingId=trackingId;orderFields.dispatchedAt={__timestamp:now};}
   const legacyFields={status:LEGACY_STATUS[stage-1]};
   if(stage===4){legacyFields.trackingId=trackingId;legacyFields.dispatchedDate=new Date().toLocaleDateString("en-GB",{timeZone:"Asia/Kolkata"});}
   const writes=[
    {update:{name:base+"/Orders/"+orderId,fields:firestoreFields(orderFields)},updateMask:{fieldPaths:Object.keys(orderFields)},currentDocument:{updateTime:order.updateTime}},
    {update:{name:base+"/bookedOrders/"+orderId,fields:firestoreFields(legacyFields)},updateMask:{fieldPaths:Object.keys(legacyFields)}}
   ];
   await firestoreCommit(firebase,undefined,writes);
   return jsonResponse({ok:true,progress,progressStage:stage});
  }
  return jsonResponse({ok:false,error:"Unsupported action."},400);
 }catch(error){console.error("Admin Accessories Orders API:",String(error?.message||error));return jsonResponse({ok:false,error:"Could not process the Accessories order request."},500);}
}
export async function onRequestGet(){return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);}
