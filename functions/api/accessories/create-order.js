import {getFirebaseContext,firestoreGet,firestoreCreate,jsonResponse} from "../../_lib/firebase-rest.js";

function packSize(code) {
 const m=String(code||"").trim().toUpperCase().match(/(\d{2})$/);
 const n=m?Number(m[1]):1;
 return Number.isInteger(n)&&n>0?n:1;
}
function validCustomer(c) {
 return c && typeof c.name==="string" && c.name.trim().length>=2 &&
 typeof c.address==="string" && c.address.trim().length>=5 &&
 typeof c.pincode==="string" && /^\d{6}$/.test(c.pincode) &&
 typeof c.phone==="string" && /^\d{10}$/.test(c.phone);
}
export async function onRequestPost({request,env}) {
 try {
  if(!env.RAZORPAY_KEY_ID||!env.RAZORPAY_KEY_SECRET) return jsonResponse({error:"Online payment is not configured."},503);
  const body=await request.json(), items=body&&body.items, customer=body&&body.customer;
  if(!Array.isArray(items)||items.length<1||items.length>30) return jsonResponse({error:"Your cart is empty or invalid."},400);
  if(!validCustomer(customer)) return jsonResponse({error:"Please enter valid delivery details."},400);
  const seen=new Set(), normalized=[];
  for(const item of items) {
   const id=String(item&&item.id||""), qty=Number(item&&item.qty);
   if(!/^[A-Za-z0-9_-]{1,150}$/.test(id)||!Number.isInteger(qty)||qty<1||qty>99||seen.has(id)) return jsonResponse({error:"One or more cart items are invalid."},400);
   seen.add(id); normalized.push({id,qty});
  }
  const firebase=await getFirebaseContext(env), verified=[]; let productTotal=0;
  for(const item of normalized) {
   const doc=await firestoreGet(firebase,"accessoriesProducts/"+encodeURIComponent(item.id));
   if(!doc||doc.fields.active!==true) return jsonResponse({error:"A product in your cart is no longer available. Refresh and try again."},409);
   const price=Number(doc.fields.price), stock=Number(doc.fields.stock), code=String(doc.fields.productCode||"").trim().toUpperCase(), pack=packSize(code);
   if(code==="#CL00") return jsonResponse({error:"This combo product is currently available through WhatsApp checkout only. Please choose WhatsApp to place this order."},409);
   if(!Number.isFinite(price)||price<=0||!Number.isInteger(stock)||stock<0||!/^#[A-Z0-9]{4}$/.test(code)) return jsonResponse({error:"A product has incomplete pricing or stock information. Please contact us."},409);
   const available=Math.floor(stock/pack);
   if(item.qty>available) return jsonResponse({error:String(doc.fields.name||"A product")+" has only "+available+" set(s) available."},409);
   const subtotal=Math.round(price*item.qty*100)/100; productTotal+=subtotal;
   verified.push({productId:item.id,name:String(doc.fields.name||"Accessory"),quantityText:String(doc.fields.quantity||""),productCode:code,qty:item.qty,packSize:pack,unitPrice:price,subtotal});
  }
  productTotal=Math.round(productTotal*100)/100;
  if(productTotal<199) return jsonResponse({error:"Minimum order value is ₹199."},400);
  const shipping=productTotal>=799?0:55, total=Math.round((productTotal+shipping)*100)/100, amountPaise=Math.round(total*100);
  const recordId="DSA"+crypto.randomUUID().replace(/-/g,"").slice(0,24).toUpperCase();
  const auth="Basic "+btoa(env.RAZORPAY_KEY_ID+":"+env.RAZORPAY_KEY_SECRET);
  const rr=await fetch("https://api.razorpay.com/v1/orders",{method:"POST",headers:{authorization:auth,"content-type":"application/json"},body:JSON.stringify({amount:amountPaise,currency:"INR",receipt:recordId.slice(0,40),notes:{paymentRecordId:recordId,store:"diecast.scape",category:"accessories"}})});
  const ro=await rr.json();
  if(!rr.ok||!ro.id) return jsonResponse({error:"Unable to start payment right now. Please try again."},502);
  await firestoreCreate(firebase,"onlinePaymentOrders",recordId,{
   category:"accessories",status:"created",paymentStatus:"pending",paymentRecordId:recordId,razorpayOrderId:ro.id,
   amountPaise,currency:"INR",productTotal,shipping,total,items:verified,
   customer:{name:customer.name.trim(),address:customer.address.trim(),postOffice:String(customer.postOffice||"").trim(),pincode:customer.pincode,phone:customer.phone},
   createdAt:{__timestamp:new Date().toISOString()}
  });
  return jsonResponse({keyId:env.RAZORPAY_KEY_ID,orderId:ro.id,amount:amountPaise,currency:"INR",paymentRecordId:recordId,summary:{productTotal,shipping,total}});
 } catch(error) {
  console.error("Accessories create-order error:",error);
  return jsonResponse({error:"Unable to create your payment order. Please try again."},500);
 }
}
