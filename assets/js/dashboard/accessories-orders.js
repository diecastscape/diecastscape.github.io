import {auth} from "../firebase-init.js";

const root=document.getElementById("accessoriesOrdersAdminList");
const refresh=document.getElementById("accessoriesOrdersRefresh");
const stages=["Order Confirmed","In Packing","Ready to Dispatch","Dispatched"];
const money=value=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(value)||0);
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function date(value){if(!value)return "—";const d=new Date(value);return Number.isNaN(d.getTime())?esc(value):d.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});}
async function request(body){
 const user=auth.currentUser;if(!user)throw new Error("Admin session expired. Please log in again.");
 const token=await user.getIdToken();
 const response=await fetch("/api/admin/accessories-orders",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"Request failed.");return data;
}
function renderCard(order){
 const dispatched=order.progressStage===4;
 const stockReview=order.progressStage===0;
 const customer=order.customer||{};
 const products=order.items.map(item=>{
  const pieces=item.packQuantity===null?"Combo set":(item.packLabel||((Number(item.packQuantity)||0)+" pieces/set"));
  const totalPieces=item.packQuantity===null?"—":Number(item.packQuantity||0)*Number(item.selectedQuantity||0);
  return '<div class="ao-item"><div><strong>'+esc(item.productName)+'</strong>'+(item.subtitle?'<small>'+esc(item.subtitle)+'</small>':"")+
   '<small>'+esc(pieces)+' × '+esc(item.selectedQuantity)+' sets · '+esc(totalPieces)+' pcs to pack</small></div><div class="ao-item-price">'+money(item.lineTotal)+'</div></div>';
 }).join("");
 const address=[customer.address,customer.city,customer.state,customer.postOffice,customer.pincode].filter(Boolean).join(", ");
 return '<article class="ao-card '+(dispatched?"ao-dispatched":"")+'"><div class="ao-head"><div><small>ACCESSORIES ORDER</small><h4>'+esc(order.orderId)+'</h4></div><span class="ao-stage">'+esc(order.progress)+'</span></div>'+
 '<div class="ao-summary"><span>'+esc(customer.name||"Customer details not available")+'</span><strong>'+money(order.grandTotal)+'</strong></div>'+
 '<div class="ao-facts"><span>Booked: '+date(order.bookedAt)+'</span><span>Expected dispatch: '+date(order.expectedDispatchDate)+'</span><span>Payment: '+esc(order.paymentStatus||"—")+'</span></div>'+
  (stockReview?'<div class="ao-review">Payment captured — stock review required. Review available stock before moving this order into production.</div>':"")+'<div class="ao-items">'+products+'</div>'+
 '<div class="ao-totals"><span>Subtotal '+money(order.subtotal)+'</span><span>Shipping '+(order.shipping===0?"FREE":money(order.shipping))+'</span></div>'+
 '<details class="ao-private"><summary>See Full Details</summary><div><b>Name:</b> '+esc(customer.name||"—")+'<br><b>Phone:</b> '+esc(customer.phoneNumber||"—")+'<br><b>Address:</b> '+esc(address||"—")+'</div></details>'+
 (dispatched?'<div class="ao-tracking">Tracking ID: <strong>'+esc(order.trackingId||"—")+'</strong></div>':
 stockReview?'<div class="ao-review-action"><p>Review the required pieces and available stock before accepting. This action deducts stock and cannot be undone.</p><button type="button" onclick="acceptAccessoriesStockReview(\''+esc(order.orderId)+'\')">Accept Order &amp; Deduct Stock</button></div>':
 '<div class="ao-controls"><label>Order progress<select id="ao-stage-'+esc(order.orderId)+'">'+stages.map((stage,i)=>'<option value="'+(i+1)+'" '+(order.progressStage===i+1?"selected":"")+'>'+stage+'</option>').join("")+'</select></label><label>India Post tracking ID<input id="ao-track-'+esc(order.orderId)+'" value="'+esc(order.trackingId||"")+'" placeholder="Required before dispatch"></label><button type="button" onclick="saveAccessoriesAdminOrder(\''+esc(order.orderId)+'\')">Save Progress</button></div>')+
 '</article>';
}
window.loadAccessoriesAdminOrders=async function(){
 if(!root)return;root.innerHTML='<div class="product-list-loading">Loading Accessories Orders…</div>';
 if(refresh)refresh.disabled=true;
 try{
  const data=await request({action:"list"}),active=data.orders.filter(o=>o.progressStage!==4),dispatched=data.orders.filter(o=>o.progressStage===4);
  root.innerHTML='<h4 class="booked-form-heading">Active Orders ('+active.length+')</h4>'+
   (active.length?active.map(renderCard).join(""):'<div class="booked-empty-state">No active Accessories orders.</div>')+
   '<h4 class="booked-form-heading ao-dispatched-heading">Dispatched Orders ('+dispatched.length+')</h4>'+
   (dispatched.length?dispatched.map(renderCard).join(""):'<div class="booked-empty-state">No dispatched Accessories orders yet.</div>');
 }catch(error){console.error(error);root.innerHTML='<div class="booked-error-state">'+esc(error.message)+'</div>';}
 finally{if(refresh)refresh.disabled=false;}
};
window.saveAccessoriesAdminOrder=async function(orderId){
 const stage=Number(document.getElementById("ao-stage-"+orderId)?.value);
 const trackingId=document.getElementById("ao-track-"+orderId)?.value.trim()||"";
 if(stage===4&&!trackingId){alert("Enter the India Post tracking ID before marking this order Dispatched.");return;}
 const button=document.querySelector('[onclick="saveAccessoriesAdminOrder(\''+CSS.escape(orderId)+'\')"]');
 if(button){button.disabled=true;button.textContent="Saving…";}
 try{await request({action:"update",orderId,progressStage:stage,trackingId});alert("Order progress updated.");await window.loadAccessoriesAdminOrders();}
 catch(error){alert(error.message);if(button){button.disabled=false;button.textContent="Save Progress";}}
};
refresh?.addEventListener("click",()=>window.loadAccessoriesAdminOrders());
window.addEventListener("DOMContentLoaded",()=>{
 if(window.location.hash==="#accessoriesOrders")window.loadAccessoriesAdminOrders();
});

window.acceptAccessoriesStockReview=async function(orderId){
 if(!/^DS-A\\d{4,}$/.test(orderId))return;
 if(!confirm("Accept this paid order and deduct the required pieces from current stock? This action cannot be undone."))return;
 const button=[...document.querySelectorAll("button")].find(node=>node.textContent.includes("Accept Order")&&node.getAttribute("onclick")?.includes(orderId));
 if(button){button.disabled=true;button.textContent="Accepting…";}
 try{await request({action:"acceptStockReview",orderId});alert("Order accepted and stock deductions recorded.");await window.loadAccessoriesAdminOrders();}
 catch(error){alert(error.message||"Could not accept this order.");if(button){button.disabled=false;button.textContent="Accept Order & Deduct Stock";}}
};
