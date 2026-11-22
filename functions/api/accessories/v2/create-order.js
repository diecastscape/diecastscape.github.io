import {getFirebaseContext,firestoreGet,firestoreCreate,jsonResponse} from "../../../_lib/firebase-rest.js";

function packSize(code) {
  const match=String(code||"").trim().toUpperCase().match(/(\d{2})$/);
  const size=match?Number(match[1]):1;
  return Number.isInteger(size)&&size>0?size:1;
}
function validCustomer(customer) {
  return customer&&typeof customer.name==="string"&&customer.name.trim().length>=2&&
    typeof customer.address==="string"&&customer.address.trim().length>=5&&
    typeof customer.pincode==="string"&&/^\d{6}$/.test(customer.pincode)&&
    typeof customer.phone==="string"&&/^\d{10}$/.test(customer.phone);
}
export async function onRequestPost({request,env}) {
  try {
    if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET)
      return jsonResponse({error:"Online payment is temporarily unavailable."},503);
    const body=await request.json(),items=body?.items,customer=body?.customer;
    if(!Array.isArray(items)||items.length<1||items.length>30)
      return jsonResponse({error:"Your cart is empty or invalid."},400);
    if(!validCustomer(customer))
      return jsonResponse({error:"Please enter valid delivery details."},400);

    const normalized=[],seen=new Set();
    for(const row of items) {
      const id=String(row?.id||""),qty=Number(row?.qty);
      if(!/^[A-Za-z0-9_-]{1,150}$/.test(id)||!Number.isInteger(qty)||qty<1||qty>99||seen.has(id))
        return jsonResponse({error:"One or more cart items are invalid. Refresh your cart."},400);
      seen.add(id);normalized.push({id,qty});
    }

    const firebase=await getFirebaseContext(env),verified=[];
    let productTotal=0;
    for(const row of normalized) {
      const product=await firestoreGet(firebase,"accessoriesProducts/"+encodeURIComponent(row.id));
      if(!product||product.fields.active!==true)
        return jsonResponse({error:"A product in your cart is no longer available. Refresh and try again."},409);
      const price=Number(product.fields.price),stock=Number(product.fields.stock);
      const code=String(product.fields.productCode||"").trim().toUpperCase(),pack=packSize(code);
      if(code==="#CL00")
        return jsonResponse({error:"Combo products are currently available through WhatsApp checkout only."},409);
      if(!Number.isFinite(price)||price<=0||!Number.isInteger(stock)||stock<0||!/^#[A-Z0-9]{4}$/.test(code))
        return jsonResponse({error:"A product has incomplete pricing or stock information. Please contact us."},409);
      const available=Math.floor(stock/pack);
      if(row.qty>available)
        return jsonResponse({error:String(product.fields.name||"A product")+" has only "+available+" set(s) available."},409);
      const subtotal=Math.round(price*row.qty*100)/100;
      productTotal+=subtotal;
      verified.push({
        productId:row.id,name:String(product.fields.name||"Accessory"),
        quantityText:String(product.fields.quantity||""),productCode:code,
        qty:row.qty,packSize:pack,unitPrice:price,subtotal
      });
    }
    productTotal=Math.round(productTotal*100)/100;
    if(productTotal<199)return jsonResponse({error:"Minimum order value is ₹199."},400);
    const shipping=productTotal>=799?0:55;
    const total=Math.round((productTotal+shipping)*100)/100;
    const amountPaise=Math.round(total*100);
    const recordId="DSA"+crypto.randomUUID().replace(/-/g,"").slice(0,24).toUpperCase();

    const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
    const gatewayResponse=await fetch("https://api.razorpay.com/v1/orders",{
      method:"POST",headers:{authorization:auth,"content-type":"application/json"},
      body:JSON.stringify({
        amount:amountPaise,currency:"INR",receipt:recordId,
        notes:{paymentRecordId:recordId,store:"diecast.scape",category:"accessories",paymentVersion:"2"}
      })
    });
    const gatewayOrder=await gatewayResponse.json();
    if(!gatewayResponse.ok||!gatewayOrder.id) {
      console.error("Accessories payment v2 order creation failed:",gatewayResponse.status);
      return jsonResponse({error:"Unable to start payment right now. Please try again."},502);
    }

    await firestoreCreate(firebase,"onlinePaymentOrders",recordId,{
      schemaVersion:2,category:"accessories",status:"created",paymentStatus:"pending",
      paymentRecordId:recordId,razorpayOrderId:gatewayOrder.id,amountPaise,
      currency:"INR",productTotal,shipping,total,items:verified,
      customer:{
        name:customer.name.trim(),address:customer.address.trim(),
        postOffice:String(customer.postOffice||"").trim(),
        pincode:customer.pincode,phone:customer.phone
      },
      createdAt:{__timestamp:new Date().toISOString()}
    });
    return jsonResponse({
      keyId:env.RAZORPAY_KEY_ID,orderId:gatewayOrder.id,
      amount:amountPaise,currency:"INR",paymentRecordId:recordId,
      summary:{productTotal,shipping,total},paymentVersion:2
    });
  } catch(error) {
    console.error("Accessories payment v2 create-order failed:",String(error?.message||error));
    return jsonResponse({error:"Unable to prepare payment. Please try again or contact us."},500);
  }
}
export async function onRequestGet() {
  return jsonResponse({ok:false,error:"Method Not Allowed",allowedMethod:"POST"},405);
}
