import {getFirebaseContext,firestoreListCollection,firestoreGet,firestoreBatchGet,firestoreCommit,firestoreFields,jsonResponse} from "../../_lib/firebase-rest.js";

const ADMIN_UID="urSr9gyhwBMKBSmxKC5LRRnKW1P2";
const FIREBASE_API_KEY="AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs";
const STAGES=["Order Confirmed","In Packing","Ready to Dispatch","Dispatched"];

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
  trackingId:String(f.trackingId||""),dispatchedAt:f.dispatchedAt||null,stockReviewRequired:f.stockReviewRequired===true
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
  if(action==="acceptStockReview"){
   const orderId=String(body.orderId||"").trim();
   if(!/^DS-A\\d{4,}$/.test(orderId))return jsonResponse({ok:false,error:"Invalid Accessories order ID."},400);
   for(let attempt=1;attempt<=4;attempt++){
    const order=await firestoreGet(firebase,"Orders/"+orderId);
    if(!order)return jsonResponse({ok:false,error:"Order not found."},404);
    if(order.fields.stockReviewRequired!==true){
     if(order.fields.stockReviewAcceptedAt)return jsonResponse({ok:true,alreadyAccepted:true});
     return jsonResponse({ok:false,error:"This order does not require stock review."},409);
    }
    if(order.fields.paymentStatus!=="paid_stock_issue")return jsonResponse({ok:false,error:"Only a captured payment awaiting stock review can be accepted."},409);
    const paymentRecordId=String(order.fields.paymentRecordId||"");
    const paymentRecord=paymentRecordId?await firestoreGet(firebase,"onlinePaymentOrders/"+paymentRecordId):null;
    if(!paymentRecord)return jsonResponse({ok:false,error:"Original payment stock record missing. No stock was changed."},409);
    const reservations=Array.isArray(paymentRecord.fields.stockReservations)?paymentRecord.fields.stockReservations:[];
    if(!reservations.length)return jsonResponse({ok:false,error:"Saved stock requirements are missing. No stock was changed."},409);
    const grouped=new Map();
    for(const row of reservations){
     const id=String(row.productId||""),pieces=Number(row.pieces);
     if(!/^[A-Za-z0-9_-]{1,150}$/.test(id)||!Number.isInteger(pieces)||pieces<1)return jsonResponse({ok:false,error:"Saved stock requirements are invalid. No stock was changed."},409);
     const old=grouped.get(id)||{productId:id,productCode:String(row.productCode||""),productName:String(row.productName||""),pieces:0};old.pieces+=pieces;grouped.set(id,old);
    }
    const rows=[...grouped.values()],recordId=paymentRecord.name.split("/").pop();
    const docs=await firestoreBatchGet(firebase,["Orders/"+orderId,"onlinePaymentOrders/"+recordId,...rows.map(row=>"accessoriesProducts/"+encodeURIComponent(row.productId))]);
    const freshOrder=docs.get(firebase.base+"/Orders/"+orderId),freshPayment=docs.get(firebase.base+"/onlinePaymentOrders/"+recordId);
    if(!freshOrder||!freshPayment)return jsonResponse({ok:false,error:"Order or payment record changed. Refresh and try again."},409);
    if(freshOrder.fields.stockReviewRequired!==true){
     if(freshOrder.fields.stockReviewAcceptedAt)return jsonResponse({ok:true,alreadyAccepted:true});
     return jsonResponse({ok:false,error:"Order status changed. Refresh before continuing."},409);
    }
    const now=new Date().toISOString(),writes=[],deductions=[];
    for(const row of rows){
     const product=docs.get(firebase.base+"/accessoriesProducts/"+encodeURIComponent(row.productId)),stock=Number(product?.fields.stock);
     if(!product||!Number.isInteger(stock))return jsonResponse({ok:false,error:"Stock record missing or invalid for "+(row.productName||row.productCode)+". No stock was changed."},409);
     deductions.push({...row,stockBefore:stock,piecesDeducted:row.pieces,stockAfter:stock-row.pieces});
     writes.push({update:{name:product.name,fields:firestoreFields({stock:stock-row.pieces,stockUpdatedAt:{__timestamp:now}})},updateMask:{fieldPaths:["stock","stockUpdatedAt"]},currentDocument:{updateTime:product.updateTime}});
    }
    const history=Array.isArray(freshOrder.fields.progressHistory)?freshOrder.fields.progressHistory:[];
    writes.push({update:{name:freshOrder.name,fields:firestoreFields({stockReviewRequired:false,stockReviewAcceptedAt:{__timestamp:now},progress:"Order Confirmed",progressStage:1,progressHistory:[...history,{stage:"Order Confirmed",at:{__timestamp:now},note:"Stock review accepted by admin"}],stockDeductions:deductions,updatedAt:{__timestamp:now}})},updateMask:{fieldPaths:["stockReviewRequired","stockReviewAcceptedAt","progress","progressStage","progressHistory","stockDeductions","updatedAt"]},currentDocument:{updateTime:freshOrder.updateTime}});
    writes.push({update:{name:freshPayment.name,fields:firestoreFields({stockReviewAccepted:true,stockReviewAcceptedAt:{__timestamp:now}})},updateMask:{fieldPaths:["stockReviewAccepted","stockReviewAcceptedAt"]},currentDocument:{updateTime:freshPayment.updateTime}});
    try{await firestoreCommit(firebase,undefined,writes);return jsonResponse({ok:true,orderId,stockDeductions:deductions});}
    catch(error){if(!/ABORTED|FAILED_PRECONDITION|ALREADY_EXISTS|409/i.test(String(error?.message||error))||attempt===4)throw error;}
   }
   return jsonResponse({ok:false,error:"Could not safely accept the order. Refresh and try again."},409);
  }
  if(action==="update"){
   const orderId=String(body.orderId||"").trim(),stage=Number(body.progressStage),trackingId=String(body.trackingId||"").trim();
   if(!/^DS-A\d{4,}$/.test(orderId)||!Number.isInteger(stage)||stage<1||stage>4)return jsonResponse({ok:false,error:"Invalid order or progress stage."},400);
   if(stage===4&&!trackingId)return jsonResponse({ok:false,error:"Enter the India Post tracking ID before marking this order Dispatched."},400);
   const order=await firestoreGet(firebase,"Orders/"+orderId);
   if(!order)return jsonResponse({ok:false,error:"Order not found."},404);
   if(order.fields.stockReviewRequired===true)return jsonResponse({ok:false,error:"Accept the stock review before changing order progress."},409);
   const progress=STAGES[stage-1],now=new Date().toISOString();
   const base=firebase.base.replace("https://firestore.googleapis.com/v1/","");
   const orderFields={progress,progressStage:stage,updatedAt:{__timestamp:now}};
   if(stage===4){orderFields.trackingId=trackingId;orderFields.dispatchedAt={__timestamp:now};}
   const writes=[
    {update:{name:base+"/Orders/"+orderId,fields:firestoreFields(orderFields)},updateMask:{fieldPaths:Object.keys(orderFields)},currentDocument:{updateTime:order.updateTime}}
   ];
   await firestoreCommit(firebase,undefined,writes);
   return jsonResponse({ok:true,progress,progressStage:stage});
  }
  return jsonResponse({ok:false,error:"Unsupported action."},400);
 }catch(error){console.error("Admin Accessories Orders API:",String(error?.message||error));return jsonResponse({ok:false,error:"Could not process the Accessories order request."},500);}
}
export async function onRequestGet(){return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);}
