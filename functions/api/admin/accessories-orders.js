import {getFirebaseContext,firestoreListCollection,firestoreGet,firestoreBatchGet,firestoreCommit,firestoreFields,jsonResponse} from "../../_lib/firebase-rest.js";
import {ACCESSORY_COMBO_RECIPES} from "../../_lib/accessory-reservations.js";

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

const COMBO_RECIPES=Object.fromEntries(
 Object.entries(ACCESSORY_COMBO_RECIPES).map(([code,recipe])=>[
  code,recipe.map(row=>[row.productCode,row.pieces])
 ])
);
const money2=n=>Math.round(Number(n)*100);
async function sha256(value){
 const bytes=new TextEncoder().encode(value);
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function validCustomer(c){
 return typeof c?.name==="string"&&c.name.trim().length>=2&&
  typeof c.phoneNumber==="string"&&/^\d{10}$/.test(c.phoneNumber.replace(/\D/g,""))&&
  typeof c.address==="string"&&c.address.trim().length>=5&&
  typeof c.city==="string"&&c.city.trim().length>=2&&
  typeof c.state==="string"&&c.state.trim().length>=2&&
  typeof c.postOffice==="string"&&c.postOffice.trim().length>=2&&
  typeof c.pincode==="string"&&/^\d{6}$/.test(c.pincode.trim());
}
async function createManualOrder(firebase,body){
 const rawText=String(body.rawText||"").trim(),customer=body.customer||{},dispatch=String(body.expectedDispatchDate||"");
 if(!rawText||rawText.length>20000)return {status:400,error:"Paste a valid WhatsApp order message."};
 if(!validCustomer(customer))return {status:400,error:"Complete all delivery details. Enter a valid 10-digit phone number and 6-digit pincode."};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(dispatch))return {status:400,error:"Select a valid estimated dispatch date."};
 const normalized=rawText.replace(/\s+/g," ").trim(),fingerprint=await sha256(normalized);
 const markerPath="manualOrderDedupes/"+fingerprint;
 const items=Array.isArray(body.items)?body.items:[];
 if(!items.length||items.length>40)return {status:400,error:"Order items are missing or invalid."};
 const subtotal=Number(body.subtotal),shipping=Number(body.shipping),grandTotal=Number(body.grandTotal);
 if(![subtotal,shipping,grandTotal].every(n=>Number.isFinite(n)&&n>=0)||money2(subtotal+shipping)!==money2(grandTotal)||subtotal<199||shipping!==(subtotal>=799?0:55))return {status:400,error:"Order totals or Accessories shipping are invalid."};
 const target=new Date(dispatch+"T00:00:00Z");
 if(!Number.isFinite(target.getTime())||target.toISOString().slice(0,10)!==dispatch||![3,6].includes(target.getUTCDay()))return {status:400,error:"Accessories dispatch must be Wednesday or Saturday."};
 const istNow=new Date(Date.now()+19800000),today=istNow.toISOString().slice(0,10);
 const cutoff=Date.UTC(target.getUTCFullYear(),target.getUTCMonth(),target.getUTCDate()-1,12)-19800000;
 if(dispatch<today||Date.now()>cutoff)return {status:400,error:"That dispatch date has passed its booking cutoff. Select the next available Wednesday or Saturday."};
 const grouped=new Map(),itemRows=[];
 let calculated=0;
 for(const item of items){
  const code=String(item.productCode||"").toUpperCase(),qty=Number(item.quantity),setSize=Number(item.piecesPerSet),unitPrice=Number(item.unitPrice),lineTotal=Number(item.lineTotal),isCombo=Boolean(COMBO_RECIPES[code]);
  if(!/^#[A-Z]{2}\d{2}$/.test(code)||!Number.isInteger(qty)||qty<1||qty>999||!Number.isFinite(unitPrice)||unitPrice<0||money2(unitPrice*qty)!==money2(lineTotal))return {status:400,error:"An order item has invalid quantity or price."};
  if(isCombo?setSize!==0:(!Number.isInteger(setSize)||setSize<1||setSize>99))return {status:400,error:"An order item has an invalid pack size."};
  if(isCombo){
   for(const [component,pieces] of COMBO_RECIPES[code])grouped.set(component,(grouped.get(component)||0)+pieces*qty);
  }else grouped.set(code,(grouped.get(code)||0)+setSize*qty);
  calculated+=lineTotal;
  itemRows.push({code,qty,setSize,unitPrice,lineTotal,isCombo,name:String(item.name||"").slice(0,160),checkoutCode:String(item.fullCode||"").toUpperCase()});
 }
 if(money2(calculated)!==money2(subtotal))return {status:400,error:"Product total does not match the item lines."};
 const rawCodes=[...rawText.matchAll(/#([A-Z]{2})(\d{2})(\d{2})\b/gi)];
 const rawPrices=[...rawText.matchAll(/₹\s*([\d,]+(?:\.\d{1,2})?)\s*[×x]\s*(\d+)\s*=\s*₹?\s*([\d,]+(?:\.\d{1,2})?)/gi)];
 if(rawCodes.length!==itemRows.length||rawPrices.length!==itemRows.length)return {status:400,error:"The pasted WhatsApp message does not match the parsed order lines."};
 for(let i=0;i<itemRows.length;i++){
  const item=itemRows[i],code=rawCodes[i],price=rawPrices[i];
  const rawCode="#"+code[1].toUpperCase()+code[2]+code[3];
  if(rawCode!==item.checkoutCode||Number(code[2])!==item.setSize||Number(code[3])!==item.qty||
    money2(Number(price[1].replace(/,/g,"")))!==money2(item.unitPrice)||
    Number(price[2])!==item.qty||money2(Number(price[3].replace(/,/g,"")))!==money2(item.lineTotal))
   return {status:400,error:"The parsed order lines do not match the WhatsApp message. Check the order again."};
 }
 const amountFor=label=>{const match=rawText.match(new RegExp(label+"\\s*:\\s*₹?\\s*([\\d,]+(?:\\.\\d{1,2})?)","i"));return match?Number(match[1].replace(/,/g,"")):NaN;};
 if(money2(amountFor("Product Total"))!==money2(subtotal)||money2(amountFor("Shipping"))!==money2(shipping)||money2(amountFor("Order Total"))!==money2(grandTotal))
  return {status:400,error:"The WhatsApp order totals do not match the parsed order."};

 const productDocs=await firestoreListCollection(firebase,"accessoriesProducts");
 const byCode=new Map();
 for(const doc of productDocs){
  const code=String(doc.fields.productCode||"").toUpperCase();
  if(code)byCode.set(code,(byCode.get(code)||[]).concat(doc));
 }
 const affectedComboCodes=Object.entries(COMBO_RECIPES)
  .filter(([,recipe])=>recipe.some(([component])=>grouped.has(component)))
  .map(([comboCode])=>comboCode);
 const codes=new Set([...grouped.keys(),...itemRows.map(x=>x.code),...affectedComboCodes]);
 for(const code of codes)if((byCode.get(code)||[]).length!==1)return {status:409,error:"Product code "+code+" is missing or duplicated. No changes were made."};
 const usedDocs=[...codes].map(code=>byCode.get(code)[0]);
 const counterPath="orderCounters/accessories",legacyCounterPath="bookedOrderCounters/accessoryOrderIdSequence";
 for(let attempt=1;attempt<=4;attempt++){
  const counter=await firestoreGet(firebase,counterPath),legacy=await firestoreGet(firebase,legacyCounterPath);
  const highestDocs=await firestoreListCollection(firebase,"Orders");
  let highest=1000;
  for(const d of highestDocs){const m=String(d.fields.orderId||"").match(/^DS-A(\d+)$/);if(m)highest=Math.max(highest,Number(m[1])||1000);}
  const docs=await firestoreBatchGet(firebase,[markerPath,counterPath,legacyCounterPath,...usedDocs.map(d=>"accessoriesProducts/"+encodeURIComponent(d.name.split("/").pop()))]);
  if(docs.has(firebase.base+"/"+markerPath)){
   const previous=docs.get(firebase.base+"/"+markerPath)?.fields.orderId||"already processed";
   return {status:409,error:"This exact WhatsApp order was already processed as "+previous+"."};
  }
  const freshProducts=new Map();
  for(const code of codes){
   const id=byCode.get(code)[0].name.split("/").pop();
   const fresh=docs.get(firebase.base+"/accessoriesProducts/"+encodeURIComponent(id));
   const orderedCombo=itemRows.some(item=>item.code===code);
   const mustBeActive=!affectedComboCodes.includes(code)||orderedCombo;
   if(!fresh||String(fresh.fields.productCode||"").toUpperCase()!==code||(mustBeActive&&fresh.fields.active!==true))return {status:409,error:"Product "+code+" changed or is inactive. Refresh stock and try again."};
   freshProducts.set(code,fresh);
  }
  const deductions=[];
  for(const [code,pieces] of grouped){
   const p=freshProducts.get(code),stock=Number(p.fields.stock),reserved=Number(p.fields.reservedStock||0);
   if(!Number.isInteger(stock)||stock<0||!Number.isInteger(reserved)||reserved<0||stock-reserved<pieces)return {status:409,error:"Insufficient or invalid stock for "+code+". No changes were made."};
   deductions.push({code,doc:p,pieces,stock,after:stock-pieces});
  }
  const comboUpdates=[];
  for(const [comboCode,recipe] of Object.entries(COMBO_RECIPES)){
   const requested=itemRows.filter(x=>x.code===comboCode).reduce((s,x)=>s+x.qty,0);
   if(!affectedComboCodes.includes(comboCode)&&!requested)continue;
   let before=Infinity,after=Infinity;
   for(const [code,pieces] of recipe){
    const p=freshProducts.get(code),stock=Number(p.fields.stock),reserved=Number(p.fields.reservedStock||0),deduct=grouped.get(code)||0;
    before=Math.min(before,Math.floor((stock-reserved)/pieces));
    after=Math.min(after,Math.floor((stock-reserved-deduct)/pieces));
   }
   if(before<requested)return {status:409,error:"Insufficient combo stock for "+comboCode+"."};
   comboUpdates.push({productCode:comboCode,stockBefore:before,stockAfter:after});
  }
  for(const item of itemRows){const product=freshProducts.get(item.code),livePrice=Number(product?.fields.price);if(!Number.isFinite(livePrice)||money2(livePrice)!==money2(item.unitPrice))return {status:409,error:"Price changed for "+item.code+". Recheck the WhatsApp order before confirming."};}
  const previous=Math.max(1000,Number(docs.get(firebase.base+"/"+counterPath)?.fields.lastNumber)||1000,Number(docs.get(firebase.base+"/"+legacyCounterPath)?.fields.lastNumber)||1000,highest);
  const next=previous+1,orderId="DS-A"+next,now=new Date().toISOString();
  const savedItems=itemRows.map(item=>{
   const product=freshProducts.get(item.code),isCombo=item.isCombo;
   return {productId:product.name.split("/").pop(),productName:String(product.fields.name||item.name||item.code),name:String(product.fields.name||item.name||item.code),subtitle:String(product.fields.quantity||""),selectedQuantity:item.qty,quantity:item.qty,packQuantity:isCombo?null:item.setSize,packLabel:isCombo?"Combo set":String(item.setSize)+" pieces/set",productCode:item.code,checkoutCode:item.checkoutCode,isCombo,piecesPerSet:item.setSize,piecesDeducted:isCombo?0:item.setSize*item.qty,unitPrice:item.unitPrice,lineTotal:item.lineTotal,...(isCombo?{comboRecipe:COMBO_RECIPES[item.code].map(([productCode,pieces])=>({productCode,piecesPerSet:pieces,totalPieces:pieces*item.qty}))}:{})};
  });
  const progressHistory=[{stage:"Order Confirmed",at:{__timestamp:now},note:"Manual Accessories order created by admin"}];
  const orderFields={orderId,orderType:"Accessories",category:"accessories",orderSource:"admin_manual",bookedAt:{__timestamp:now},bookedDate:(()=>{const d=new Date(Date.now()+19800000).toISOString().slice(0,10).split("-");return d[2]+"/"+d[1]+"/"+d[0];})(),expectedDispatchDate:dispatch,progress:"Order Confirmed",progressStage:1,progressHistory,customer:{name:String(customer.name).trim(),address:String(customer.address).trim(),city:String(customer.city).trim(),state:String(customer.state).trim(),postOffice:String(customer.postOffice).trim(),pincode:String(customer.pincode).trim(),phoneNumber:String(customer.phoneNumber).replace(/\D/g,"")},items:savedItems,subtotal,shipping,grandTotal,paymentMethod:"manual",paymentStatus:"manual",stockReviewRequired:false,trackingId:"",dispatchedAt:null,stockDeductions:deductions.map(d=>({productId:d.doc.name.split("/").pop(),productCode:d.code,productName:String(d.doc.fields.name||d.code),stockBefore:d.stock,piecesDeducted:d.pieces,stockAfter:d.after})),comboStockUpdates:comboUpdates,createdAt:{__timestamp:now},updatedAt:{__timestamp:now}};
  const base=firebase.base.replace("https://firestore.googleapis.com/v1/","");
  const writes=[];
  for(const d of deductions)writes.push({update:{name:d.doc.name,fields:firestoreFields({stock:d.after,stockUpdatedAt:{__timestamp:now}})},updateMask:{fieldPaths:["stock","stockUpdatedAt"]},currentDocument:{updateTime:d.doc.updateTime}});
  for(const combo of comboUpdates){
   const p=freshProducts.get(combo.productCode);
   writes.push({update:{name:p.name,fields:firestoreFields({stock:combo.stockAfter,stockUpdatedAt:{__timestamp:now}})},updateMask:{fieldPaths:["stock","stockUpdatedAt"]},currentDocument:{updateTime:p.updateTime}});
  }
  const counterFields={lastNumber:next,updatedAt:{__timestamp:now}};
  for(const [path,existing] of [[counterPath,docs.get(firebase.base+"/"+counterPath)],[legacyCounterPath,docs.get(firebase.base+"/"+legacyCounterPath)]]){
   writes.push(existing?{update:{name:existing.name,fields:firestoreFields(counterFields)},updateMask:{fieldPaths:["lastNumber","updatedAt"]},currentDocument:{updateTime:existing.updateTime}}:{update:{name:base+"/"+path,fields:firestoreFields(counterFields)},currentDocument:{exists:false}});
  }
  writes.push({update:{name:base+"/Orders/"+orderId,fields:firestoreFields(orderFields)},currentDocument:{exists:false}});
  writes.push({update:{name:base+"/"+markerPath,fields:firestoreFields({orderId,createdAt:{__timestamp:now}})},currentDocument:{exists:false}});
  try{await firestoreCommit(firebase,undefined,writes);return {status:200,orderId,stockDeductions:orderFields.stockDeductions,comboStockUpdates:comboUpdates,expectedDispatchDate:dispatch};}
  catch(error){if(!/ABORTED|FAILED_PRECONDITION|ALREADY_EXISTS|409/i.test(String(error?.message||error))||attempt===4)throw error;}
 }
 return {status:409,error:"Could not safely confirm the order. Refresh stock and try again."};
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
  if(action==="createManual"){
   const result=await createManualOrder(firebase,body);
   if(result.status!==200)return jsonResponse({ok:false,error:result.error},result.status);
   return jsonResponse({ok:true,...result});
  }
  if(action==="list"){
   const docs=await firestoreListCollection(firebase,"Orders");
   const orders=docs.filter(doc=>String(doc.fields?.orderType||"").toLowerCase()==="accessories"||String(doc.fields?.orderId||"").startsWith("DS-A")).map(safeOrder);
   orders.sort((a,b)=>String(b.bookedAt||"").localeCompare(String(a.bookedAt||"")));
   return jsonResponse({ok:true,orders});
  }
  if(action==="acceptStockReview"){
   const orderId=String(body.orderId||"").trim();
   if(!/^DS-A\d{4,}$/.test(orderId))return jsonResponse({ok:false,error:"Invalid Accessories order ID."},400);
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
