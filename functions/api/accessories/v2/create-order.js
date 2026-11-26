import {
  getFirebaseContext,firestoreCreate,jsonResponse
} from "../../../_lib/firebase-rest.js";
import {
  reserveAccessoryStock,releaseAccessoryReservation,releaseExpiredAccessoryReservations
} from "../../../_lib/accessory-reservations.js";

export async function onRequestPost({request,env}) {
  let firebase=null,recordId="";
  try {
    if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET)
      return jsonResponse({error:"Online payment is temporarily unavailable."},503);
    const body=await request.json(),items=body?.items;
    const paymentMode=String(body?.paymentMode||"PREPAID").toUpperCase();
    const customer=body?.customer;
    if(!["PREPAID","COD"].includes(paymentMode))
      return jsonResponse({error:"Invalid payment option."},400);
    if(body?.policiesAccepted!==true)
      return jsonResponse({error:"Please accept the Terms of Service, Shipping Policy, and Privacy Policy."},400);
    const validCustomer=customer&&typeof customer.name==="string"&&customer.name.trim().length>=2&&
      typeof customer.address==="string"&&customer.address.trim().length>=5&&
      typeof customer.city==="string"&&customer.city.trim().length>=2&&
      typeof customer.state==="string"&&customer.state.trim().length>=2&&
      typeof customer.postOffice==="string"&&customer.postOffice.trim().length>=2&&
      typeof customer.pincode==="string"&&/^\\d{6}$/.test(customer.pincode)&&
      typeof customer.phone==="string"&&/^\\d{10}$/.test(customer.phone);
    if(!validCustomer)
      return jsonResponse({error:"Please enter all required delivery details."},400);
    if(!Array.isArray(items)||items.length<1||items.length>30)
      return jsonResponse({error:"Your cart is empty or invalid."},400);

    const normalized=[],seen=new Set();
    for(const row of items) {
      const id=String(row?.id||""),qty=Number(row?.qty);
      if(!/^[A-Za-z0-9_-]{1,150}$/.test(id)||!Number.isInteger(qty)||qty<1||qty>99||seen.has(id))
        return jsonResponse({error:"One or more cart items are invalid. Refresh your cart."},400);
      seen.add(id);normalized.push({id,qty});
    }

    firebase=await getFirebaseContext(env);
    await releaseExpiredAccessoryReservations(firebase);
    recordId="DSA"+crypto.randomUUID().replace(/-/g,"").slice(0,24).toUpperCase();
    const reservation=await reserveAccessoryStock(firebase,recordId,normalized,{
      schemaVersion:2,category:"accessories",paymentStatus:"pending",
      paymentMode,customer,policiesAccepted:true
    });
    const productTotal=reservation.productTotal;
    if(paymentMode==="COD"&&productTotal<399) {
      await releaseAccessoryReservation(firebase,recordId,"cancelled");
      recordId="";
      return jsonResponse({error:"Cash on Delivery is available on product totals of ₹399 or more."},400);
    }
    if(productTotal<199) {
      await releaseAccessoryReservation(firebase,recordId,"cancelled");
      recordId="";
      return jsonResponse({error:"Minimum order value is ₹199."},400);
    }
    const shipping=productTotal>=799?0:55;
    const codCharge=paymentMode==="COD"?20:0;
    const total=Math.round((productTotal+shipping+codCharge)*100)/100;
    const advancePaid=paymentMode==="COD"?99:total;
    const remainingAmount=paymentMode==="COD"?Math.max(0,total-advancePaid):0;
    const amountPaise=Math.round(advancePaid*100);

    const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
    const gatewayResponse=await fetch("https://api.razorpay.com/v1/orders",{
      method:"POST",headers:{authorization:auth,"content-type":"application/json"},
      body:JSON.stringify({
        amount:amountPaise,currency:"INR",receipt:recordId,
        notes:{paymentRecordId:recordId,store:"diecast.scape",category:"accessories",paymentMode,paymentVersion:"2"}
      })
    });
    const gatewayOrder=await gatewayResponse.json();
    if(!gatewayResponse.ok||!gatewayOrder.id) {
      await releaseAccessoryReservation(firebase,recordId,"gateway_failed");
      recordId="";
      console.error("Accessories payment v2 order creation failed:",gatewayResponse.status);
      return jsonResponse({error:"Unable to start payment right now. Please try again."},502);
    }

    await firestoreCreate(firebase,"onlinePaymentOrders",recordId,{
      schemaVersion:2,category:"accessories",status:"created",paymentStatus:"pending",
      paymentRecordId:recordId,razorpayOrderId:gatewayOrder.id,amountPaise,
      currency:"INR",paymentMode,customer,policiesAccepted:true,
      productTotal,shipping,codCharge,total,advancePaid,remainingAmount,
      paymentAmount:advancePaid,items:reservation.items,
      stockReservations:reservation.stockReservations,
      reservationExpiresAt:reservation.expiresAt,
      createdAt:{__timestamp:new Date().toISOString()}
    });
    return jsonResponse({
      keyId:env.RAZORPAY_KEY_ID,orderId:gatewayOrder.id,
      amount:amountPaise,currency:"INR",paymentRecordId:recordId,
      summary:{productTotal,shipping,codCharge,total,advancePaid,remainingAmount,paymentMode},
      reservationExpiresAt:reservation.expiresAt,paymentVersion:2
    });
  } catch(error) {
    if(firebase&&recordId) {
      try { await releaseAccessoryReservation(firebase,recordId,"checkout_failed"); }
      catch(releaseError) { console.error("Accessories reservation release failed:",String(releaseError?.message||releaseError)); }
    }
    const message=String(error?.message||error);
    console.error("Accessories payment v2 create-order failed:",message);
    if(message.startsWith("INSUFFICIENT_STOCK:"))
      return jsonResponse({error:message.slice("INSUFFICIENT_STOCK:".length)+" does not have enough stock for this cart. Please update your cart."},409);
    if(message.startsWith("PRODUCT_UNAVAILABLE:")||message.startsWith("COMBO_COMPONENT_UNAVAILABLE:"))
      return jsonResponse({error:"A product in your cart is unavailable. Please refresh your cart."},409);
    if(message.startsWith("DUPLICATE_PRODUCT_CODE:")||message.startsWith("COMBO_RECIPE_INVALID:")||message.startsWith("PRODUCT_DATA_INVALID:"))
      return jsonResponse({error:"An accessory stock setup needs correction. Please contact Diecast.scape before retrying."},409);
    return jsonResponse({error:"Unable to prepare payment. Please try again or contact us."},500);
  }
}
export async function onRequestGet() {
  return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);
}
