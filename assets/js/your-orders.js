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
 if(order.progress==="Stock Review Required")return '<div class="your-orders-review">Payment received · Your order needs a stock review. We will contact you.</div>';
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
 const tracking=dispatched&&order.trackingId?'<div class="your-orders-tracking"><span>India Post tracking ID</span><strong>'+escapeHTML(order.trackingId)+'</strong></div>':"";
 resultBox.innerHTML='<article class="your-orders-card"><div class="your-orders-card-head"><div><div class="your-orders-kicker">ACCESSORIES ORDER</div><h2>#'+escapeHTML(order.orderId)+'</h2></div><span class="your-orders-paid">'+(order.paymentStatus==="paid"||order.paymentStatus==="paid_stock_issue"?"Payment completed":"Order recorded")+'</span></div>'+
 '<div class="your-orders-meta"><div><small>Booked</small><strong>'+dateText(order.bookedAt)+'</strong></div><div><small>Expected dispatch</small><strong>'+dateText(order.expectedDispatchDate)+'</strong></div></div>'+
 progressMarkup(order)+'<div class="your-orders-items"><h3>Order items</h3>'+itemHTML+'</div>'+
 '<div class="your-orders-totals"><div><span>Subtotal</span><strong>'+money(order.subtotal)+'</strong></div><div><span>Shipping</span><strong>'+(Number(order.shipping)===0?"FREE":money(order.shipping))+'</strong></div><div class="your-orders-grand"><span>Grand total</span><strong>'+money(order.grandTotal)+'</strong></div></div>'+
 tracking+'<div class="your-orders-footer">Delivery details are kept private. For help with this order, contact Diecast.scape through WhatsApp.</div></article>';
 resultBox.style.display="block";emptyBox.style.display="none";errorBox.style.display="none";
}
form?.addEventListener("submit",async event=>{
 event.preventDefault();if(busy)return;
 const orderId=orderInput.value.trim().toUpperCase(),phone=phoneInput.value.replace(/\D/g,"");
 if(!/^DS-A\d{4,}$/.test(orderId)){showEmpty("Enter a valid Accessories Order ID, for example DS-A1001.");return;}
 if(!/^\d{10}$/.test(phone)){showEmpty("Enter the same 10-digit phone number used at checkout.");return;}
 busy=true;hideStates();loading.style.display="block";searchBtn.disabled=true;searchBtn.textContent="SEARCHING";
 try{
  const response=await fetch("/api/accessories/lookup-order",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({orderId,phone})});
  const data=await response.json();
  if(response.status===429)showEmpty(data.error||"Too many attempts. Please try again later.");
  else if(!response.ok||!data.ok||!data.order)showEmpty(data.error||"We couldn't find an order matching those details. Check your Order ID and phone number.");
  else renderOrder(data.order);
 }catch(error){console.error("Your Orders lookup:",error);hideStates();errorBox.style.display="block";}
 finally{busy=false;searchBtn.disabled=false;searchBtn.textContent="SEARCH";}
});
phoneInput?.addEventListener("input",()=>{phoneInput.value=phoneInput.value.replace(/\D/g,"").slice(0,10);});
orderInput?.addEventListener("input",()=>{orderInput.value=orderInput.value.toUpperCase().replace(/\s/g,"");});
try{const saved=JSON.parse(localStorage.getItem("diecastscape_completed_orders")||"[]");if(Array.isArray(saved)&&saved.length)deviceNote.style.display="none";}catch{}
hideStates();
