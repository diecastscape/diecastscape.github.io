import {
  getFirebaseContext,firestoreGet,firestoreBatchGet,firestoreCommit,
  firestoreFields,firestoreListCollection,jsonResponse
} from "../../../_lib/firebase-rest.js";

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
function nextThursday() {
  const date=new Date(Date.now()+19800000);
  const days=(4-date.getUTCDay()+7)%7||7;
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
async function highestOrderNumber(firebase) {
  const orders=await firestoreListCollection(firebase,"bookedOrders");
  let highest=1000;
  for(const order of orders) {
    const match=String(order.fields.orderId||"").match(/^DS-A(\d+)$/i);
    if(match)highest=Math.max(highest,Number(match[1])||1000);
  }
  return highest;
}
async function createPaidOrder(firebase,recordPath,paymentId) {
  // Optimistic concurrency: all reads happen outside a transaction. The single
  // Firestore commit is atomic and each changed document has an update-time
  // or exists:false precondition. A conflict causes a fresh read and retry.
  for(let attempt=1;attempt<=4;attempt++) {
    const record=await firestoreGet(firebase,recordPath);
    if(!record)throw new Error("PAYMENT_RECORD_NOT_FOUND");
    if(record.fields.paymentStatus==="paid"||record.fields.paymentStatus==="paid_stock_issue")
      return {status:record.fields.paymentStatus,orderId:record.fields.storeOrderId||""};
    if(record.fields.paymentStatus!=="pending"&&record.fields.paymentStatus!=="created")
      throw new Error("PAYMENT_RECORD_NOT_PAYABLE");

    const counterPath="bookedOrderCounters/accessoryOrderIdSequence";
    const counter=await firestoreGet(firebase,counterPath);
    const highest=counter?1000:await highestOrderNumber(firebase);
    const items=Array.isArray(record.fields.items)?record.fields.items:[];
    if(!items.length)throw new Error("PAYMENT_ITEMS_MISSING");
    const productPaths=items.map(item=>"accessoriesProducts/"+encodeURIComponent(item.productId));
    const paths=[recordPath,counterPath,...productPaths];
    const docs=await firestoreBatchGet(firebase,paths);
    const freshRecord=docs.get(firebase.base+"/"+recordPath);
    if(!freshRecord)throw new Error("PAYMENT_RECORD_NOT_FOUND");
    if(freshRecord.fields.paymentStatus==="paid"||freshRecord.fields.paymentStatus==="paid_stock_issue")
      return {status:freshRecord.fields.paymentStatus,orderId:freshRecord.fields.storeOrderId||""};
    if(freshRecord.fields.paymentStatus!=="pending"&&freshRecord.fields.paymentStatus!=="created")
      throw new Error("PAYMENT_RECORD_NOT_PAYABLE");

    const freshCounter=docs.get(firebase.base+"/"+counterPath);
    const previous=freshCounter?Math.max(1000,Number(freshCounter.fields.lastNumber)||1000):highest;
    const next=previous+1,orderId="DS-A"+next;
    let stockIssue=false;
    const stockPlan=[];
    for(const item of items) {
      const path="accessoriesProducts/"+encodeURIComponent(item.productId);
      const product=docs.get(firebase.base+"/"+path);
      const stock=Number(product?.fields.stock),units=Number(item.qty)*Number(item.packSize);
      if(!product||product.fields.active!==true||!Number.isInteger(stock)||
         !Number.isInteger(units)||units<1||stock<units) {
        stockIssue=true;
        break;
      }
      stockPlan.push({product,item,stock,units});
    }

    const now=new Date().toISOString(),bookedDate=displayDate(dateIST());
    const dispatchISO=nextThursday(),customer=freshRecord.fields.customer||{};
    const savedProducts=items.map(item=>({
      name:item.name,quantity:item.qty,productCode:item.productCode,
      checkoutCode:item.productCode+String(item.qty).padStart(2,"0"),
      isCombo:false,piecesPerSet:item.packSize,
      piecesDeducted:item.qty*item.packSize,unitPrice:item.unitPrice,lineTotal:item.subtotal
    }));
    const publicProducts=savedProducts.map(item=>({name:item.name,quantity:item.quantity}));
    const deductions=stockPlan.map(({product,item,stock,units})=>({
      productId:item.productId,productCode:item.productCode,
      productName:item.name,stockBefore:stock,piecesDeducted:units,stockAfter:stock-units
    }));
    const writes=[];
    if(!stockIssue) {
      for(const row of stockPlan) {
        writes.push({
          update:{name:row.product.name,fields:firestoreFields({
            stock:row.stock-row.units,stockUpdatedAt:{__timestamp:now}
          })},
          updateMask:{fieldPaths:["stock","stockUpdatedAt"]},
          currentDocument:{updateTime:row.product.updateTime}
        });
      }
    }
    const resourceBase=firebase.base.replace("https://firestore.googleapis.com/v1/","");
    writes.push({
      update:{name:resourceBase+"/"+counterPath,fields:firestoreFields({
        lastNumber:next,updatedAt:{__timestamp:now}
      })},
      updateMask:{fieldPaths:["lastNumber","updatedAt"]},
      currentDocument:freshCounter?{updateTime:freshCounter.updateTime}:{exists:false}
    });
    writes.push({
      update:{name:resourceBase+"/bookedOrders/"+orderId,fields:firestoreFields({
        orderId,bookedDate,confirmedAt:{__timestamp:now},
        design:"Accessories Order",products:publicProducts,
        shippingDate:displayDate(dispatchISO),estimatedDispatchDate:dispatchISO,
        status:stockIssue?"Pending":"Ready to Pack",dispatchedDate:"",hidden:false
      })},
      currentDocument:{exists:false}
    });
    const totalPieces=deductions.reduce((sum,row)=>sum+row.piecesDeducted,0);
    writes.push({
      update:{name:resourceBase+"/orderCustomers/"+orderId,fields:firestoreFields({
        orderId,orderType:"Accessories",bookedDate,confirmedAt:{__timestamp:now},
        estimatedDispatchDate:dispatchISO,products:savedProducts,
        productTotal:freshRecord.fields.productTotal,shipping:freshRecord.fields.shipping,
        orderTotal:freshRecord.fields.total,totalPiecesDeducted:stockIssue?0:totalPieces,
        stockDeductions:stockIssue?[]:deductions,comboStockUpdates:[],
        stockReviewRequired:stockIssue,
        name:String(customer.name||""),address:String(customer.address||""),
        postOffice:String(customer.postOffice||""),postOfficeName:String(customer.postOffice||""),
        pincode:String(customer.pincode||""),phone:String(customer.phone||""),
        customerDetails:[
          "Name: "+String(customer.name||"Not provided"),
          "Address: "+String(customer.address||"Not provided"),
          "Post Office Name: "+String(customer.postOffice||"Not provided"),
          "Pincode: "+String(customer.pincode||"Not provided"),
          "Phone: "+String(customer.phone||"Not provided")
        ].join("\n"),
        deliveryDetails:{
          name:String(customer.name||""),address:String(customer.address||""),
          postOffice:String(customer.postOffice||""),postOfficeName:String(customer.postOffice||""),
          pincode:String(customer.pincode||""),phone:String(customer.phone||"")
        },
        paymentMethod:"Razorpay",paymentStatus:stockIssue?"paid_stock_issue":"paid",
        razorpayPaymentId:paymentId,createdAt:{__timestamp:now},updatedAt:{__timestamp:now},
        customer
      })},
      currentDocument:{exists:false}
    });
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
      return {status:stockIssue?"paid_stock_issue":"paid",orderId};
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
    if(!/^order_[A-Za-z0-9]+$/.test(orderId)||!/^pay_[A-Za-z0-9]+$/.test(paymentId)||
       !/^DSA[A-F0-9]{24}$/.test(recordId)||!/^[a-f0-9]{64}$/i.test(signature))
      return jsonResponse({ok:false,error:"Payment verification details are invalid."},400);

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
    const result=await createPaidOrder(firebase,recordPath,paymentId);
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
