const form=document.getElementById("bookedOrderSearchForm");
const orderInput=document.getElementById("bookedOrderSearch");
const phoneInput=document.getElementById("bookedOrderPhone");
const searchBtn=document.getElementById("bookedSearchBtn");
const loading=document.getElementById("bookedOrdersLoading");
const resultBox=document.getElementById("bookedOrdersList");
const emptyBox=document.getElementById("bookedOrdersEmpty");
const errorBox=document.getElementById("bookedOrdersError");
const deviceNote=document.getElementById("yourOrdersDeviceNote");
let busy=false;
function escapeHTML(value){return String(value??"").replace(/[&<>"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[char]));}
function money(value){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value)||0);}
function dateText(value){if(!value)return "—";const date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(date);}
function hideStates(){loading.style.display="none";resultBox.style.display="none";resultBox.innerHTML="";emptyBox.style.display="none";errorBox.style.display="none";}
function showEmpty(message){hideStates();emptyBox.querySelector(".booked-empty-title").textContent="Order Not Found";emptyBox.querySelector(".booked-empty-text").textContent=message;emptyBox.style.display="block";}
function progressMarkup(order){
 const stages=["Order Confirmed","In Packing","Ready to Dispatch","Dispatched"];
 if(order.progress==="Stock Review Required")return '<div class="your-orders-review"><strong>Payment received — your order is not cancelled.</strong><span>We are checking availability for one or more items. We will update this page and contact you as soon as the review is complete. Please do not place the order again.</span></div>';
 const active=Math.max(1,Math.min(4,Number(order.progressStage)||stages.indexOf(order.progress)+1));
 return '<div class="your-orders-progress">'+stages.map((stage,index)=>'<div class="your-orders-step '+(index+1<=active?"is-done":"")+'"><span class="your-orders-step-dot">'+(index+1<=active?"✓":String(index+1))+'</span><span class="your-orders-step-label">'+stage+'</span></div>').join("")+'</div>';
}
function renderOrder(order){
 const dispatched=order.progress==="Dispatched";
 const items=Array.isArray(order.items)?order.items:[];
 const itemHTML=items.map(item=>{
  const pack=item.packQuantity===null?"Combo set":(item.packLabel||((Number(item.packQuantity)||0)+" pieces/set"));
  return '<div class="your-orders-item"><div class="your-orders-item-top"><strong>'+escapeHTML(item.productName)+'</strong><span>× '+escapeHTML(item.selectedQuantity)+'</span></div>'+
   (item.subtitle?'<div class="your-orders-item-sub">'+escapeHTML(item.subtitle)+'</div>':"")+
   '<div class="your-orders-item-meta">'+escapeHTML(pack)+' · '+money(item.unitPrice)+' each</div><div class="your-orders-item-total">'+money(item.lineTotal)+'</div></div>';
 }).join("");
 const tracking=dispatched&&order.trackingId?'<div class="your-orders-tracking"><span>India Post tracking ID</span><strong>'+escapeHTML(order.trackingId)+'</strong><a href="https://www.indiapost.gov.in/" target="_blank" rel="noopener noreferrer">Visit India Post website</a></div>':"";
 resultBox.innerHTML='<article class="your-orders-card"><div class="your-orders-card-head"><div><div class="your-orders-kicker">ACCESSORIES ORDER</div><h2>#'+escapeHTML(order.orderId)+'</h2></div><span class="your-orders-paid">'+(order.paymentStatus==="paid"||order.paymentStatus==="paid_stock_issue"?"Payment completed":"Order recorded")+'</span></div>'+
 '<div class="your-orders-meta"><div><small>Booked</small><strong>'+dateText(order.bookedAt)+'</strong></div><div><small>Expected dispatch</small><strong>'+dateText(order.expectedDispatchDate)+'</strong></div></div>'+
 progressMarkup(order)+'<div class="your-orders-items"><h3>Order items</h3>'+itemHTML+'</div>'+
 '<div class="your-orders-totals"><div><span>Product subtotal</span><strong>'+money(order.subtotal)+'</strong></div><div><span>Shipping</span><strong>'+(Number(order.shipping)===0?"FREE":money(order.shipping))+'</strong></div>'+
 (order.paymentMode==="COD"?'<div><span>COD charge</span><strong>'+money(order.codCharge)+'</strong></div>':"")+
 '<div class="your-orders-grand"><span>'+(order.paymentMode==="COD"?"Total order value":"Grand total")+'</span><strong>'+money(order.grandTotal)+'</strong></div>'+
 (order.paymentMode==="COD"?'<div><span>Advance paid</span><strong>'+money(order.advancePaid)+'</strong></div><div class="your-orders-grand"><span>Remaining payable at delivery</span><strong>'+money(order.remainingAmount)+'</strong></div>':"")+
 '</div>'+
 tracking+'<div class="your-orders-footer">Delivery details are kept private. For help with this order, contact Diecast.scape through WhatsApp.</div></article>';
 loading.style.display="none";resultBox.style.display="block";emptyBox.style.display="none";errorBox.style.display="none";
}
form?.addEventListener("submit",async event=>{
 event.preventDefault();if(busy)return;
 const orderId=orderInput.value.trim().toUpperCase(),phone=normalizePhone(phoneInput.value);
 phoneInput.value=phone;
 if(!/^DS-A\d{4,}$/.test(orderId)){showEmpty("Enter a valid Accessories Order ID, for example DS-A1001.");return;}
 if(!/^\d{10}$/.test(phone)){showEmpty("Enter the same 10-digit phone number used at checkout.");return;}
 busy=true;hideStates();loading.style.display="block";searchBtn.disabled=true;searchBtn.textContent="SEARCHING";
 try{
  const response=await fetch("/api/accessories/lookup-order",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({orderId,phone})});
  const data=await response.json();
  if(response.status===429){const wait=Math.max(1,Number(data.retryAfter)||60);const mins=Math.ceil(wait/60);showEmpty((data.error||"Too many attempts.")+" Please try again in "+(mins>1?mins+" minutes":wait+" seconds")+".");}
  else if(!response.ok||!data.ok||!data.order)showEmpty(data.error||"We couldn't find an order matching those details. Check your Order ID and phone number.");
  else renderOrder(data.order);
 }catch(error){console.error("Your Orders lookup:",error);hideStates();errorBox.style.display="block";}
 finally{busy=false;searchBtn.disabled=false;searchBtn.textContent="SEARCH";}
});
function normalizePhone(value){
 let digits=String(value??"")
  .replace(/[٠-٩]/g,ch=>String(ch.charCodeAt(0)-0x0660))
  .replace(/[۰-۹]/g,ch=>String(ch.charCodeAt(0)-0x06F0))
  .replace(/[०-९]/g,ch=>String(ch.charCodeAt(0)-0x0966))
  .replace(/[０-９]/g,ch=>String(ch.charCodeAt(0)-0xFF10))
  .replace(/\D/g,"");
 if(digits.length===12&&digits.startsWith("91"))digits=digits.slice(2);
 if(digits.length===11&&digits.startsWith("0"))digits=digits.slice(1);
 return digits;
}
phoneInput?.addEventListener("change",()=>{phoneInput.value=normalizePhone(phoneInput.value);});
orderInput?.addEventListener("input",()=>{orderInput.value=orderInput.value.toUpperCase().replace(/\s/g,"");});
function renderSavedOrderIds() {
 const savedBox=document.getElementById("yourOrdersSavedList");
 if(!savedBox)return;
 let saved=[];
 try{
  const parsed=JSON.parse(localStorage.getItem("diecastscape_completed_orders")||"[]");
  const candidates=Array.isArray(parsed)?parsed:[parsed];
  saved=[...new Set(candidates.map(id=>String(id||"").trim().toUpperCase()).filter(id=>/^DS-A\d{4,}$/.test(id)))].slice(-50).reverse();
  if(saved.length)localStorage.setItem("diecastscape_completed_orders",JSON.stringify(saved.slice().reverse()));
 }catch{}
 if(!saved.length){savedBox.hidden=true;return;}
 deviceNote.style.display="none";
 savedBox.hidden=false;
 savedBox.innerHTML='<div class="your-orders-saved-title">Orders saved on this device</div>'+saved.map(id=>'<div class="your-orders-saved-row"><strong>'+escapeHTML(id)+'</strong><button type="button" data-order-id="'+escapeHTML(id)+'">View</button></div>').join("");
}
document.getElementById("yourOrdersSavedList")?.addEventListener("click",event=>{
 const button=event.target.closest("button[data-order-id]");
 if(!button)return;
 orderInput.value=button.dataset.orderId||"";
 orderInput.focus();
 document.getElementById("bookedOrderPhone")?.focus();
});
renderSavedOrderIds();
hideStates();
