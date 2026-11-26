import {
  getFirebaseContext,firestoreGet,firestoreBatchGet,firestoreCommit,
  firestoreFields,firestoreListCollection,jsonResponse
} from "../../../_lib/firebase-rest.js";
import {releaseExpiredAccessoryReservations,ACCESSORY_COMBO_RECIPES} from "../../../_lib/accessory-reservations.js";
import {sendAdminPushNotification} from "../../../_lib/admin-push.js";

async function hmacHex(secret,message) {
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature),byte=>byte.toString(16).padStart(2,"0")).join("");
}
function constantTimeEqual(a,b) {
  if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;
  let difference=0;
  for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
function dateIST() {
  return new Date(Date.now()+19800000).toISOString().slice(0,10);
}
function displayDate(iso) {
  const [year,month,day]=iso.split("-");
  return day+"/"+month+"/"+year;
}
function nextDispatchDateIST(nowMs=Date.now()) {
  const offset=19800000;
  const istNow=new Date(nowMs+offset);
  for(let add=1;add<=7;add++) {
    const candidate=new Date(istNow);
    candidate.setUTCDate(candidate.getUTCDate()+add);
    const day=candidate.getUTCDay();
    if(day!==3&&day!==6)continue;
    const cutoff=new Date(Date.UTC(
      candidate.getUTCFullYear(),candidate.getUTCMonth(),
      candidate.getUTCDate()-1,12,0,0
    ));
    if(istNow<=cutoff)
      return candidate.toISOString().slice(0,10);
  }
  throw new Error("DISPATCH_DATE_CALCULATION_FAILED");
}
async function highestOrderNumber(firebase) {
  const orders=await firestoreListCollection(firebase,"Orders");
  let highest=1000;
  for(const order of orders) {
    const match=String(order.fields.orderId||"").match(/^DS-A(\d+)$/i);
    if(match)highest=Math.max(highest,Number(match[1])||1000);
  }
  return highest;
}
function validCustomer(customer) {
  return customer&&typeof customer.name==="string"&&customer.name.trim().length>=2&&
    typeof customer.address==="string"&&customer.address.trim().length>=5&&
    typeof customer.city==="string"&&customer.city.trim().length>=2&&
    typeof customer.state==="string"&&customer.state.trim().length>=2&&
    typeof customer.postOffice==="string"&&customer.postOffice.trim().length>=2&&
    typeof customer.pincode==="string"&&/^\d{6}$/.test(customer.pincode)&&
    typeof customer.phone==="string"&&/^\d{10}$/.test(customer.phone);
}
async function createPaidOrder(firebase,recordPath,paymentId,customer) {
  // Optimistic concurrency: all reads happen outside a transaction. The single
  // Firestore commit is atomic and each changed document has an update-time
  // or exists:false precondition. A conflict causes a fresh read and retry.
  for(let attempt=1;attempt<=4;attempt++) {
    const record=await firestoreGet(firebase,recordPath);
    if(!record)throw new Error("PAYMENT_RECORD_NOT_FOUND");
    if(record.fields.paymentStatus==="paid"||record.fields.paymentStatus==="paid_stock_issue") {
      if(String(record.fields.razorpayPaymentId||"")!==paymentId)
        throw new Error("PAYMENT_ALREADY_PROCESSED_WITH_DIFFERENT_PAYMENT");
      return {status:record.fields.paymentStatus,orderId:record.fields.storeOrderId||"",created:false,total:Number(record.fields.total)||0};
    }
    if(record.fields.paymentStatus!=="pending"&&record.fields.paymentStatus!=="created")
      throw new Error("PAYMENT_RECORD_NOT_PAYABLE");

    const counterPath="orderCounters/accessories";
    const legacyCounterPath="bookedOrderCounters/accessoryOrderIdSequence";
    const counter=await firestoreGet(firebase,counterPath);
    const legacyCounter=await firestoreGet(firebase,legacyCounterPath);
    const highest=counter||legacyCounter?1000:await highestOrderNumber(firebase);
    const items=Array.isArray(record.fields.items)?record.fields.items:[];
    if(!items.length)throw new Error("PAYMENT_ITEMS_MISSING");
    const sessionPath="paymentSessions/"+encodeURIComponent(recordPath.split("/").pop());
    const reservationRows=Array.isArray(record.fields.stockReservations)?record.fields.stockReservations:[];
    const reservedCodes=new Set(reservationRows.map(row=>String(row.productCode||"").toUpperCase()));
    const affectedComboCodes=Object.entries(ACCESSORY_COMBO_RECIPES).filter(([,recipe])=>recipe.some(component=>reservedCodes.has(component.productCode))).map(([comboCode])=>comboCode);
    const listedProducts=await firestoreListCollection(firebase,"accessoriesProducts");
    const comboDocsByCode=new Map(),componentDocsByCode=new Map();
    for(const product of listedProducts) {
      const code=String(product.fields.productCode||"").toUpperCase();
      if(affectedComboCodes.includes(code)) {
        const matches=comboDocsByCode.get(code)||[];matches.push(product);comboDocsByCode.set(code,matches);
      }
      if(affectedComboCodes.some(comboCode=>ACCESSORY_COMBO_RECIPES[comboCode].some(component=>component.productCode===code))) {
        const matches=componentDocsByCode.get(code)||[];matches.push(product);componentDocsByCode.set(code,matches);
      }
    }
    for(const code of affectedComboCodes)if((comboDocsByCode.get(code)||[]).length!==1)throw new Error("COMBO_PRODUCT_MISSING_OR_DUPLICATED:"+code);
    for(const comboCode of affectedComboCodes)for(const component of ACCESSORY_COMBO_RECIPES[comboCode]) {
      if((componentDocsByCode.get(component.productCode)||[]).length!==1)
        throw new Error("COMBO_COMPONENT_MISSING_OR_DUPLICATED:"+component.productCode);
    }
    const productPaths=reservationRows.map(row=>"accessoriesProducts/"+encodeURIComponent(row.productId));
    const comboPaths=affectedComboCodes.map(code=>"accessoriesProducts/"+encodeURIComponent(comboDocsByCode.get(code)[0].name.split("/").pop()));
    const componentPaths=[...new Set(affectedComboCodes.flatMap(comboCode=>ACCESSORY_COMBO_RECIPES[comboCode].map(component=>{
      const product=componentDocsByCode.get(component.productCode)[0];
      return "accessoriesProducts/"+encodeURIComponent(product.name.split("/").pop());
    })))];
    const paths=[recordPath,sessionPath,counterPath,legacyCounterPath,...productPaths,...comboPaths,...componentPaths];
    const docs=await firestoreBatchGet(firebase,paths);
    const freshRecord=docs.get(firebase.base+"/"+recordPath);
    if(!freshRecord)throw new Error("PAYMENT_RECORD_NOT_FOUND");
    if(freshRecord.fields.paymentStatus==="paid"||freshRecord.fields.paymentStatus==="paid_stock_issue") {
      if(String(freshRecord.fields.razorpayPaymentId||"")!==paymentId)
        throw new Error("PAYMENT_ALREADY_PROCESSED_WITH_DIFFERENT_PAYMENT");
      return {status:freshRecord.fields.paymentStatus,orderId:freshRecord.fields.storeOrderId||"",created:false,total:Number(freshRecord.fields.total)||0};
    }
    if(freshRecord.fields.paymentStatus!=="pending"&&freshRecord.fields.paymentStatus!=="created")
      throw new Error("PAYMENT_RECORD_NOT_PAYABLE");

    const freshSession=docs.get(firebase.base+"/"+sessionPath);
    const freshCounter=docs.get(firebase.base+"/"+counterPath);
    const freshLegacyCounter=docs.get(firebase.base+"/"+legacyCounterPath);
    const previous=Math.max(
      1000,
      Number(freshCounter?.fields.lastNumber)||1000,
      Number(freshLegacyCounter?.fields.lastNumber)||1000,
      highest
    );
    const next=previous+1,orderId="DS-A"+next;
    let stockIssue=false;
    const expiry=Date.parse(freshSession?.fields.expiresAt||"");
    const reservationValid=Boolean(
      freshSession&&freshSession.fields.status==="reserved"&&
      Number.isFinite(expiry)&&expiry>Date.now()&&
      reservationRows.length>0
    );
    const stockPlan=[];
    if(!reservationValid)stockIssue=true;
    if(reservationValid) {
      for(const reservation of reservationRows) {
        const path="accessoriesProducts/"+encodeURIComponent(reservation.productId);
        const product=docs.get(firebase.base+"/"+path);
        const stock=Number(product?.fields.stock);
        const reserved=Number(product?.fields.reservedStock||0);
        const units=Number(reservation.pieces);
        if(!product||product.fields.active!==true||!Number.isInteger(stock)||
           !Number.isInteger(reserved)||reserved<units||reserved>stock||!Number.isInteger(units)||
           units<1||stock<units) {
          stockIssue=true;
          break;
        }
        stockPlan.push({product,reservation,stock,reserved,units});
      }
    }

    const comboStockUpdates=[];
    if(!stockIssue&&stockPlan.length===reservationRows.length) {
      const deductionsByCode=new Map(),releasedByCode=new Map();
      for(const row of stockPlan) {
        const code=String(row.reservation.productCode||"").toUpperCase();
        deductionsByCode.set(code,(deductionsByCode.get(code)||0)+row.units);
        releasedByCode.set(code,(releasedByCode.get(code)||0)+row.units);
      }
      for(const comboCode of affectedComboCodes) {
        let availableAfter=Infinity;
        for(const component of ACCESSORY_COMBO_RECIPES[comboCode]) {
          const listedComponent=componentDocsByCode.get(component.productCode)[0];
          const componentPath="accessoriesProducts/"+encodeURIComponent(listedComponent.name.split("/").pop());
          const product=docs.get(firebase.base+"/"+componentPath);
          const stock=Number(product?.fields.stock),reserved=Number(product?.fields.reservedStock||0);
          const deducted=deductionsByCode.get(component.productCode)||0,released=releasedByCode.get(component.productCode)||0;
          if(!product||!Number.isInteger(stock)||stock<deducted||!Number.isInteger(reserved)||reserved<released)throw new Error("COMBO_STOCK_INVALID:"+component.productCode);
          availableAfter=Math.min(availableAfter,Math.floor(Math.max(0,(stock-deducted)-(reserved-released))/component.pieces));
        }
        if(!Number.isInteger(availableAfter))throw new Error("COMBO_AVAILABILITY_INVALID:"+comboCode);
        const comboDoc=docs.get(firebase.base+"/accessoriesProducts/"+encodeURIComponent(comboDocsByCode.get(comboCode)[0].name.split("/").pop()));
        comboStockUpdates.push({product:comboDoc,productCode:comboCode,stockAfter:availableAfter});
      }
    }
    const now=new Date().toISOString(),bookedDate=displayDate(dateIST());
    const dispatchISO=nextDispatchDateIST();
    const savedProducts=items.map(item=>({
      productId:item.productId,productName:item.name,name:item.name,
      subtitle:item.quantityText||"",selectedQuantity:item.qty,quantity:item.qty,
      packQuantity:item.isCombo?null:item.packSize,
      packLabel:item.isCombo?"Combo set":String(item.packSize)+" pieces/set",
      productCode:item.productCode,
      checkoutCode:item.productCode+String(item.qty).padStart(2,"0"),
      isCombo:Boolean(item.isCombo),piecesPerSet:item.packSize,
      piecesDeducted:item.isCombo?0:item.qty*item.packSize,
      unitPrice:item.unitPrice,lineTotal:item.subtotal
    }));
    const deductions=stockPlan.map(({product,reservation,stock,units})=>({
      productId:reservation.productId,productCode:reservation.productCode,
      productName:reservation.productName,stockBefore:stock,piecesDeducted:units,stockAfter:stock-units
    }));
    const writes=[];
    if(!stockIssue) {
      for(const row of stockPlan) {
        writes.push({
          update:{name:row.product.name,fields:firestoreFields({
            stock:row.stock-row.units,
            reservedStock:Math.max(0,row.reserved-row.units),
            stockUpdatedAt:{__timestamp:now},reservationUpdatedAt:{__timestamp:now}
          })},
          updateMask:{fieldPaths:["stock","reservedStock","stockUpdatedAt","reservationUpdatedAt"]},
          currentDocument:{updateTime:row.product.updateTime}
        });
      }
    } else if(freshSession?.fields.status==="reserved") {
      // Payment was captured but the reservation cannot be fulfilled.
      // Release the temporary holds without deducting physical stock.
      for(const reservation of reservationRows) {
        const path="accessoriesProducts/"+encodeURIComponent(reservation.productId);
        const product=docs.get(firebase.base+"/"+path);
        const reserved=Number(product?.fields.reservedStock||0);
        const units=Number(reservation.pieces);
        if(!product||!Number.isInteger(reserved)||reserved<0||!Number.isInteger(units)||units<1)continue;
        writes.push({
          update:{name:product.name,fields:firestoreFields({
            reservedStock:Math.max(0,reserved-units),
            reservationUpdatedAt:{__timestamp:now}
          })},
          updateMask:{fieldPaths:["reservedStock","reservationUpdatedAt"]},
          currentDocument:{updateTime:product.updateTime}
        });
      }
    }
    if(!stockIssue)for(const combo of comboStockUpdates)writes.push({
      update:{name:combo.product.name,fields:firestoreFields({stock:combo.stockAfter,stockUpdatedAt:{__timestamp:now}})},
      updateMask:{fieldPaths:["stock","stockUpdatedAt"]},currentDocument:{updateTime:combo.product.updateTime}
    });
    const resourceBase=firebase.base.replace("https://firestore.googleapis.com/v1/","");
    writes.push({
      update:{name:resourceBase+"/"+counterPath,fields:firestoreFields({
        lastNumber:next,updatedAt:{__timestamp:now}
      })},
      updateMask:{fieldPaths:["lastNumber","updatedAt"]},
      currentDocument:freshCounter?{updateTime:freshCounter.updateTime}:{exists:false}
    });
    // Keep the legacy counter in sync while old admin/order tools still use it.
    writes.push({
      update:{name:resourceBase+"/"+legacyCounterPath,fields:firestoreFields({
        lastNumber:next,updatedAt:{__timestamp:now}
      })},
      updateMask:{fieldPaths:["lastNumber","updatedAt"]},
      currentDocument:freshLegacyCounter?{updateTime:freshLegacyCounter.updateTime}:{exists:false}
    });
    writes.push({
      update:{name:resourceBase+"/Orders/"+orderId,fields:firestoreFields({
        orderId,paymentRecordId:recordPath.split("/").pop(),orderType:"Accessories",category:"accessories",
        bookedAt:{__timestamp:now},bookedDate,
        expectedDispatchDate:dispatchISO,
        progress:stockIssue?"Stock Review Required":"Order Confirmed",
        progressStage:stockIssue?0:1,
        progressHistory:[{stage:stockIssue?"Stock Review Required":"Order Confirmed",at:{__timestamp:now}}],
        customer:{
          name:String(customer.name||""),address:String(customer.address||""),
          city:String(customer.city||""),state:String(customer.state||""),
          postOffice:String(customer.postOffice||""),pincode:String(customer.pincode||""),
          phoneNumber:String(customer.phone||"")
        },
        items:savedProducts,
        paymentStatus:stockIssue?"paid_stock_issue":"paid",
        paymentMethod:"Razorpay",razorpayOrderId:String(freshRecord.fields.razorpayOrderId||""),
        razorpayPaymentId:paymentId,
        subtotal:Number(freshRecord.fields.productTotal||0),
        shipping:Number(freshRecord.fields.shipping||0),
        grandTotal:Number(freshRecord.fields.total||0),
        stockReviewRequired:stockIssue,
        trackingId:"",dispatchedAt:null,
        stockDeductions:stockIssue?[]:deductions,
        comboStockUpdates:stockIssue?[]:comboStockUpdates.map(row=>({productCode:row.productCode,stockAfter:row.stockAfter})),
        createdAt:{__timestamp:now},updatedAt:{__timestamp:now}
      })},
      currentDocument:{exists:false}
    });
    if(freshSession) {
      writes.push({
        update:{name:freshSession.name,fields:firestoreFields({
          status:stockIssue?"paid_stock_issue":"paid",
          paymentId,completedAt:{__timestamp:now}
        })},
        updateMask:{fieldPaths:["status","paymentId","completedAt"]},
        currentDocument:{updateTime:freshSession.updateTime}
      });
    }
    writes.push({
      update:{name:freshRecord.name,fields:firestoreFields({
        status:stockIssue?"paid_stock_issue":"paid",
        paymentStatus:stockIssue?"paid_stock_issue":"paid",
        razorpayPaymentId:paymentId,paymentVerifiedAt:{__timestamp:now},storeOrderId:orderId
      })},
      updateMask:{fieldPaths:["status","paymentStatus","razorpayPaymentId","paymentVerifiedAt","storeOrderId"]},
      currentDocument:{updateTime:freshRecord.updateTime}
    });

    try {
      // No transaction token: one atomic commit with explicit document preconditions.
      await firestoreCommit(firebase,undefined,writes);
      return {status:stockIssue?"paid_stock_issue":"paid",orderId,created:true,total:Number(freshRecord.fields.total)||0};
    } catch(error) {
      const message=String(error?.message||error);
      const retryable=/\b(ABORTED|FAILED_PRECONDITION|ALREADY_EXISTS|409)\b/i.test(message);
      if(!retryable||attempt===4)throw error;
    }
  }
  throw new Error("ORDER_COMMIT_RETRIES_EXHAUSTED");
}
export async function onRequestPost({request,env}) {
  let stage="request";
  try {
    if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET)
      return jsonResponse({ok:false,error:"Payment verification is temporarily unavailable."},503);
    const body=await request.json();
    const orderId=String(body?.razorpay_order_id||"");
    const paymentId=String(body?.razorpay_payment_id||"");
    const signature=String(body?.razorpay_signature||"");
    const recordId=String(body?.paymentRecordId||"");
    const customer=body?.customer;
    if(!/^order_[A-Za-z0-9]+$/.test(orderId)||!/^pay_[A-Za-z0-9]+$/.test(paymentId)||
       !/^DSA[A-F0-9]{24}$/.test(recordId)||!/^[a-f0-9]{64}$/i.test(signature))
      return jsonResponse({ok:false,error:"Payment verification details are invalid."},400);
    if(!validCustomer(customer))
      return jsonResponse({ok:false,error:"Please re-enter valid delivery details to complete your paid order."},400);

    stage="signature";
    const expected=await hmacHex(env.RAZORPAY_KEY_SECRET,orderId+"|"+paymentId);
    if(!constantTimeEqual(expected,signature.toLowerCase()))
      return jsonResponse({ok:false,error:"Payment signature verification failed."},400);

    stage="gateway";
    const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
    const gatewayResponse=await fetch("https://api.razorpay.com/v1/payments/"+encodeURIComponent(paymentId),{
      headers:{authorization:auth}
    });
    const payment=await gatewayResponse.json();
    if(!gatewayResponse.ok||payment.order_id!==orderId||payment.status!=="captured")
      return jsonResponse({ok:false,error:"Razorpay has not confirmed this captured payment."},409);

    stage="firebase";
    const firebase=await getFirebaseContext(env);
    const recordPath="onlinePaymentOrders/"+recordId;
    const record=await firestoreGet(firebase,recordPath);
    if(!record||record.fields.razorpayOrderId!==orderId)
      return jsonResponse({ok:false,error:"The payment order could not be matched."},404);
    if(Number(payment.amount)!==Number(record.fields.amountPaise))
      return jsonResponse({ok:false,error:"The captured amount does not match the order total."},409);
    if(payment.currency!=="INR"||record.fields.category!=="accessories")
      return jsonResponse({ok:false,error:"This payment is not an Accessories INR order."},409);

    stage="order_commit";
    await releaseExpiredAccessoryReservations(firebase);
    const result=await createPaidOrder(firebase,recordPath,paymentId,customer);
    if(result.created) {
      try {
        await sendAdminPushNotification(env,{orderId:result.orderId,amount:result.total});
      } catch(pushError) {
        console.error("Admin push notification failed:",String(pushError?.message||pushError));
      }
    }
    if(result.status==="paid_stock_issue")
      return jsonResponse({
        ok:true,status:"paid_stock_issue",orderId:result.orderId,
        message:"Payment received. Your order is recorded and requires a stock review. We will contact you."
      });
    return jsonResponse({
      ok:true,status:"paid",orderId:result.orderId,
      message:"Payment verified. Your Accessories order is confirmed."
    });
  } catch(error) {
    const detail=String(error?.message||error).replace(/[\r\n]+/g," ").slice(0,350);
    console.error("Accessories payment v2 verification failed:",{stage,detail});
    return jsonResponse({
      ok:false,status:"verification_pending",
      error:"We received your verification request but could not finish recording the order. Please do not pay again.",
      diagnosticStage:stage,diagnosticDetail:detail
    },500);
  }
}
export async function onRequestGet() {
  return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);
}
